-- Migration 025: Fix admin assignment RPC authorization
--
-- Problem: auth.uid() is NULL when RPC is called via REST (anon key).
-- SECURITY DEFINER runs as postgres, but auth.uid() reflects the session user.
-- A direct REST call has no authenticated session → auth.uid() = NULL.
--
-- Fix: accept p_caller_uid as an explicit parameter from the admin UI.
-- The UI already knows the current user from getAdminUser().
-- The RPC validates authorization by looking up admin_users with p_caller_uid.

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. assign_product_to_stop (corrected auth)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.assign_product_to_stop(
  p_stop_id     UUID,
  p_product_id  UUID,
  p_caller_uid  UUID    -- explicitly passed by the admin UI
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
  -- Verify stop exists and get its brand
  SELECT brand_id INTO v_stop_brand_id
  FROM stops
  WHERE id = p_stop_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Stop not found');
  END IF;

  -- Verify product exists and get its brand
  SELECT brand_id INTO v_product_brand_id
  FROM products
  WHERE id = p_product_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Product not found');
  END IF;

  -- Brand alignment check
  IF v_stop_brand_id != v_product_brand_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Product brand does not match stop brand — cross-brand assignment not allowed'
    );
  END IF;

  -- Look up the admin user with the explicitly-passed caller UID
  SELECT role, brand_id INTO v_admin_role, v_admin_brand_id
  FROM admin_users
  WHERE user_id = p_caller_uid
  LIMIT 1;

  IF NOT FOUND OR v_admin_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not recognized as an admin user');
  END IF;

  -- Authorization: platform_admin can manage any stop; brand_admin only their brand
  IF v_admin_role = 'platform_admin' THEN
    -- platform_admin: allowed
  ELSIF v_admin_role = 'brand_admin' AND v_admin_brand_id = v_stop_brand_id THEN
    -- brand_admin for this brand: allowed
  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Not authorized to assign products to this stop — requires platform_admin or brand_admin for this brand'
    );
  END IF;

  -- Idempotent: if already assigned, return existing row
  SELECT id INTO v_existing
  FROM product_stops
  WHERE stop_id = p_stop_id AND product_id = p_product_id;

  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'id', v_existing, 'already_exists', true);
  END IF;

  -- Insert new row
  INSERT INTO product_stops (stop_id, product_id)
  VALUES (p_stop_id, p_product_id)
  RETURNING jsonb_build_object('id', id, 'stop_id', stop_id, 'product_id', product_id)
  INTO v_result;

  RETURN jsonb_build_object('success', true, 'id', v_result->>'id', 'already_exists', false);
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. unassign_product_from_stop (corrected auth)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.unassign_product_from_stop(
  p_stop_id     UUID,
  p_product_id  UUID,
  p_caller_uid  UUID
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_stop_brand_id UUID;
  v_admin_role    TEXT;
  v_admin_brand_id UUID;
BEGIN
  -- Verify stop exists and get its brand
  SELECT brand_id INTO v_stop_brand_id
  FROM stops
  WHERE id = p_stop_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Stop not found');
  END IF;

  -- Look up admin user
  SELECT role, brand_id INTO v_admin_role, v_admin_brand_id
  FROM admin_users
  WHERE user_id = p_caller_uid
  LIMIT 1;

  IF NOT FOUND OR v_admin_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not recognized as an admin user');
  END IF;

  -- Authorization
  IF v_admin_role = 'platform_admin' THEN
    -- allowed
  ELSIF v_admin_role = 'brand_admin' AND v_admin_brand_id = v_stop_brand_id THEN
    -- allowed
  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Not authorized to unassign products from this stop'
    );
  END IF;

  DELETE FROM product_stops
  WHERE stop_id = p_stop_id AND product_id = p_product_id;

  RETURN jsonb_build_object('success', true, 'deleted', true);
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. get_stop_products — no auth needed for product list (reads data only)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_stop_products(p_stop_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN jsonb_build_object('products', (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', ps.id,
        'product_id', ps.product_id,
        'name', p.name,
        'type', p.type,
        'price', p.price
      )
    ), '[]'::JSONB)
    FROM product_stops ps
    JOIN products p ON p.id = ps.product_id
    WHERE ps.stop_id = p_stop_id
  ));
END;
$$;