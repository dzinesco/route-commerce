-- Migration 027: Fix assignment RPC signature conflict
--
-- Root cause: Migration 024 created assign_product_to_stop(p_stop_id, p_product_id)
-- with 2 params. Migration 025 tried to CREATE OR REPLACE it with 3 params,
-- but CREATE OR REPLACE cannot change parameter count — the replacement failed
-- and the stale 2-param version remains in the schema.
--
-- Frontend calls with 3 params (p_caller_uid), but PostgreSQL matches the
-- 2-param overload and returns "function does not exist" (400) because the
-- 3-param call has no match.
--
-- Fix:
-- 1. DROP the old 2-param overloads explicitly
-- 2. CREATE the 3-param versions cleanly
-- 3. Notify PostgREST schema cache to reload
-- ═══════════════════════════════════════════════════════════════════════════

-- Drop stale 2-param versions (migrations 024)
DROP FUNCTION IF EXISTS public.assign_product_to_stop(UUID, UUID);
DROP FUNCTION IF EXISTS public.unassign_product_from_stop(UUID, UUID);

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. assign_product_to_stop (3-param, SECURITY DEFINER)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.assign_product_to_stop(
  p_stop_id     UUID,
  p_product_id  UUID,
  p_caller_uid  UUID
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
  -- Verify stop
  SELECT brand_id INTO v_stop_brand_id
  FROM stops
  WHERE id = p_stop_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Stop not found');
  END IF;

  -- Verify product
  SELECT brand_id INTO v_product_brand_id
  FROM products
  WHERE id = p_product_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Product not found');
  END IF;

  -- Cross-brand check
  IF v_stop_brand_id != v_product_brand_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Product brand does not match stop brand'
    );
  END IF;

  -- Look up caller in admin_users
  SELECT role, brand_id INTO v_admin_role, v_admin_brand_id
  FROM admin_users
  WHERE user_id = p_caller_uid
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
-- 2. unassign_product_from_stop (3-param, SECURITY DEFINER)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.unassign_product_from_stop(
  p_stop_id    UUID,
  p_product_id UUID,
  p_caller_uid UUID
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

  -- Look up caller
  SELECT role, brand_id INTO v_admin_role, v_admin_brand_id
  FROM admin_users
  WHERE user_id = p_caller_uid
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
-- 3. get_stop_products (no auth, product list)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_stop_products(p_stop_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN jsonb_build_object('products', (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object('id', ps.id, 'product_id', ps.product_id,
                          'name', p.name, 'type', p.type, 'price', p.price)
    ), '[]'::JSONB)
    FROM product_stops ps
    JOIN products p ON p.id = ps.product_id
    WHERE ps.stop_id = p_stop_id
  ));
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. Refresh PostgREST schema cache so it picks up the new signatures
-- ═══════════════════════════════════════════════════════════════════════════

NOTIFY pgrst, 'reload schema';