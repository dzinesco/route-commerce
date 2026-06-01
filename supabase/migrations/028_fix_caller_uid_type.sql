-- Migration 028: Fix dev-user UUID mismatch and clean up RPC signatures
--
-- Root cause: p_caller_uid was defined as UUID, but the dev session
-- (getAdminUser) returns user_id = 'dev-user-00000000-...' which is not
-- a valid UUID. PostgreSQL rejects it with "invalid input syntax for type uuid".
--
-- Fix: change p_caller_uid to TEXT — comparison with admin_users.user_id
-- (UUID column) works fine since PostgreSQL casts TEXT to UUID implicitly.
--
-- Also cleans up: drops stale 2-param overloads so PostgREST has no ambiguity.

-- ═══════════════════════════════════════════════════════════════════════════
-- Drop stale 2-param overloads from migrations 024/025
-- ═══════════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS public.assign_product_to_stop(UUID, UUID);
DROP FUNCTION IF EXISTS public.unassign_product_from_stop(UUID, UUID);

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. assign_product_to_stop (p_caller_uid is TEXT to accept dev-user format)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.assign_product_to_stop(
  p_stop_id     UUID,
  p_product_id  UUID,
  p_caller_uid  TEXT    -- TEXT to accept both UUIDs and "dev-user-..." strings
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_stop_brand_id    UUID;
  v_product_brand_id UUID;
  v_existing          UUID;
  v_admin_role       TEXT;
  v_admin_brand_id    UUID;
  v_result            JSONB;
BEGIN
  -- Verify stop exists
  SELECT brand_id INTO v_stop_brand_id
  FROM stops
  WHERE id = p_stop_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Stop not found');
  END IF;

  -- Verify product exists
  SELECT brand_id INTO v_product_brand_id
  FROM products
  WHERE id = p_product_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Product not found');
  END IF;

  -- Cross-brand guard
  IF v_stop_brand_id != v_product_brand_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Product brand does not match stop brand — cross-brand assignment not allowed'
    );
  END IF;

  -- Look up admin by user_id (admin_users.user_id is UUID; TEXT cast works)
  SELECT role, brand_id INTO v_admin_role, v_admin_brand_id
  FROM admin_users
  WHERE user_id = p_caller_uid::UUID
  LIMIT 1;

  IF NOT FOUND OR v_admin_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not recognized as admin');
  END IF;

  -- Authorization: platform_admin OR brand_admin for this brand
  IF v_admin_role = 'platform_admin' THEN
    -- allowed
  ELSIF v_admin_role = 'brand_admin' AND v_admin_brand_id = v_stop_brand_id THEN
    -- allowed
  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Not authorized — requires platform_admin or brand_admin for this brand'
    );
  END IF;

  -- Idempotent insert
  SELECT id INTO v_existing
  FROM product_stops
  WHERE stop_id = p_stop_id AND product_id = p_product_id;

  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'id', v_existing, 'already_exists', true);
  END IF;

  INSERT INTO product_stops (stop_id, product_id)
  VALUES (p_stop_id, p_product_id)
  RETURNING jsonb_build_object('id', id, 'stop_id', stop_id, 'product_id', product_id)
  INTO v_result;

  RETURN jsonb_build_object('success', true, 'id', v_result->>'id', 'already_exists', false);
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. unassign_product_from_stop (p_caller_uid is TEXT)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.unassign_product_from_stop(
  p_stop_id    UUID,
  p_product_id UUID,
  p_caller_uid TEXT
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_stop_brand_id UUID;
  v_admin_role     TEXT;
  v_admin_brand_id UUID;
BEGIN
  -- Verify stop
  SELECT brand_id INTO v_stop_brand_id
  FROM stops
  WHERE id = p_stop_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Stop not found');
  END IF;

  -- Look up admin
  SELECT role, brand_id INTO v_admin_role, v_admin_brand_id
  FROM admin_users
  WHERE user_id = p_caller_uid::UUID
  LIMIT 1;

  IF NOT FOUND OR v_admin_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not recognized as admin');
  END IF;

  -- Authorization
  IF v_admin_role = 'platform_admin' THEN
    -- allowed
  ELSIF v_admin_role = 'brand_admin' AND v_admin_brand_id = v_stop_brand_id THEN
    -- allowed
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  DELETE FROM product_stops
  WHERE stop_id = p_stop_id AND product_id = p_product_id;

  RETURN jsonb_build_object('success', true, 'deleted', true);
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. debug_stop_product_assignment (p_caller_uid is TEXT)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.debug_stop_product_assignment(
  p_stop_id    UUID,
  p_product_id UUID,
  p_caller_uid TEXT
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_stop_brand_id     UUID;
  v_product_brand_id  UUID;
  v_admin_role        TEXT;
  v_admin_brand_id    UUID;
  v_admin_found       BOOLEAN := false;
  v_stop_found        BOOLEAN := false;
  v_product_found     BOOLEAN := false;
  v_brand_match       BOOLEAN;
  v_authorized        BOOLEAN := false;
  v_reason            TEXT := 'not checked';
BEGIN
  -- Check stop
  SELECT brand_id INTO v_stop_brand_id FROM stops WHERE id = p_stop_id;
  IF FOUND THEN v_stop_found := true; END IF;

  -- Check product
  SELECT brand_id INTO v_product_brand_id FROM products WHERE id = p_product_id;
  IF FOUND THEN v_product_found := true; END IF;

  -- Check admin_users
  BEGIN
    SELECT role, brand_id INTO v_admin_role, v_admin_brand_id
    FROM admin_users
    WHERE user_id = p_caller_uid::UUID;
    IF FOUND THEN v_admin_found := true; END IF;
  EXCEPTION WHEN OTHERS THEN
    v_reason := 'admin lookup failed: ' || SQLERRM;
  END;

  -- Brand match
  IF v_stop_found AND v_product_found THEN
    v_brand_match := (v_stop_brand_id = v_product_brand_id);
  END IF;

  -- Authorization decision
  IF v_admin_found AND v_stop_found AND v_product_found THEN
    IF v_brand_match THEN
      IF v_admin_role = 'platform_admin' THEN
        v_authorized := true; v_reason := 'authorized as platform_admin';
      ELSIF v_admin_role = 'brand_admin' AND v_admin_brand_id = v_stop_brand_id THEN
        v_authorized := true; v_reason := 'authorized as brand_admin for this brand';
      ELSE
        v_authorized := false;
        v_reason := 'role "' || v_admin_role || '" with brand_id "' ||
                     COALESCE(v_admin_brand_id::TEXT, 'NULL') ||
                     '" does not match stop brand "' || COALESCE(v_stop_brand_id::TEXT, 'NULL') || '"';
      END IF;
    ELSE
      v_reason := 'brand mismatch: stop=' || COALESCE(v_stop_brand_id::TEXT, 'NULL') ||
                  ', product=' || COALESCE(v_product_brand_id::TEXT, 'NULL');
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'caller_uid',       p_caller_uid,
    'admin_found',      v_admin_found,
    'admin_role',       v_admin_role,
    'admin_brand_id',   v_admin_brand_id,
    'stop_found',        v_stop_found,
    'stop_brand_id',     v_stop_brand_id,
    'product_found',     v_product_found,
    'product_brand_id',  v_product_brand_id,
    'brand_match',       v_brand_match,
    'authorized',        v_authorized,
    'reason',           v_reason
  );
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. Refresh PostgREST schema cache
-- ═══════════════════════════════════════════════════════════════════════════

NOTIFY pgrst, 'reload schema';