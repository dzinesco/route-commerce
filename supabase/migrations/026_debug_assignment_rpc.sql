-- Migration 026: Debug stop-product assignment
-- Temporary diagnostic RPC to reveal exactly why assignment authorization fails.
-- Remove this after the bug is fixed.

-- ═══════════════════════════════════════════════════════════════════════════
-- debug_stop_product_assignment
-- Returns a detailed diagnostics object so we can see which check failed.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.debug_stop_product_assignment(
  p_stop_id    UUID,
  p_product_id UUID,
  p_caller_uid UUID
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_stop_brand_id     UUID;
  v_product_brand_id  UUID;
  v_admin_role        TEXT;
  v_admin_brand_id     UUID;
  v_admin_found       BOOLEAN := false;
  v_stop_found        BOOLEAN := false;
  v_product_found     BOOLEAN := false;
  v_brand_match       BOOLEAN;
  v_authorized        BOOLEAN := false;
  v_reason            TEXT := 'not checked';
BEGIN
  -- Check stop
  SELECT brand_id INTO v_stop_brand_id
  FROM stops
  WHERE id = p_stop_id;

  IF FOUND THEN
    v_stop_found := true;
  ELSE
    v_reason := 'stop not found';
  END IF;

  -- Check product
  SELECT brand_id INTO v_product_brand_id
  FROM products
  WHERE id = p_product_id;

  IF FOUND THEN
    v_product_found := true;
  ELSE
    v_reason := 'product not found';
  END IF;

  -- Check admin_users
  SELECT role, brand_id INTO v_admin_role, v_admin_brand_id
  FROM admin_users
  WHERE user_id = p_caller_uid;

  IF FOUND THEN
    v_admin_found := true;
  ELSE
    v_reason := 'admin user not found in admin_users table';
  END IF;

  -- Brand match
  IF v_stop_found AND v_product_found THEN
    v_brand_match := (v_stop_brand_id = v_product_brand_id);
    IF NOT v_brand_match THEN
      v_reason := 'brand mismatch between stop and product';
    END IF;
  END IF;

  -- Authorization decision
  IF v_admin_found AND v_stop_found AND v_product_found AND v_brand_match THEN
    IF v_admin_role = 'platform_admin' THEN
      v_authorized := true;
      v_reason := 'authorized as platform_admin';
    ELSIF v_admin_role = 'brand_admin' AND v_admin_brand_id = v_stop_brand_id THEN
      v_authorized := true;
      v_reason := 'authorized as brand_admin for this brand';
    ELSE
      v_authorized := false;
      v_reason := 'admin role "' || v_admin_role || '" with brand_id "' ||
                  COALESCE(v_admin_brand_id::TEXT, 'NULL') ||
                  '" does not match stop brand "' || COALESCE(v_stop_brand_id::TEXT, 'NULL') || '"';
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'caller_uid',       p_caller_uid,
    'admin_found',     v_admin_found,
    'admin_role',       v_admin_role,
    'admin_brand_id',   v_admin_brand_id,
    'stop_found',       v_stop_found,
    'stop_brand_id',    v_stop_brand_id,
    'product_found',    v_product_found,
    'product_brand_id', v_product_brand_id,
    'brand_match',     v_brand_match,
    'authorized',      v_authorized,
    'reason',          v_reason
  );
END;
$$;