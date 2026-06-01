-- Migration 024: Stop-product assignment via SECURITY DEFINER RPCs
-- Replaces direct INSERT/DELETE on product_stops (blocked by RLS)
-- with admin-authorized RPCs that validate brand alignment.

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. assign_product_to_stop
-- Idempotent: if row already exists, returns the existing row.
-- Validates: stop exists, product exists, brands match.
-- Authorizes: platform_admin (all brands) or brand_admin (own brand only).
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.assign_product_to_stop(
  p_stop_id    UUID,
  p_product_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_stop_brand_id   UUID;
  v_product_brand_id UUID;
  v_existing        UUID;
  v_result          JSONB;
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

  -- Authorization: must be platform_admin or brand_admin for this brand
  IF NOT EXISTS (
    SELECT 1 FROM admin_users
    WHERE user_id = auth.uid()
    AND (role = 'platform_admin' OR (role = 'brand_admin' AND brand_id = v_stop_brand_id))
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized to assign products to this stop');
  END IF;

  -- Idempotent insert: check if row already exists
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
-- 2. unassign_product_from_stop
-- Deletes the product_stop row. Safe — no side effects if row doesn't exist.
-- Authorizes: platform_admin (all brands) or brand_admin (own brand only).
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.unassign_product_from_stop(
  p_stop_id    UUID,
  p_product_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_stop_brand_id UUID;
BEGIN
  -- Verify stop exists and get its brand
  SELECT brand_id INTO v_stop_brand_id
  FROM stops
  WHERE id = p_stop_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Stop not found');
  END IF;

  -- Authorization: must be platform_admin or brand_admin for this brand
  IF NOT EXISTS (
    SELECT 1 FROM admin_users
    WHERE user_id = auth.uid()
    AND (role = 'platform_admin' OR (role = 'brand_admin' AND brand_id = v_stop_brand_id))
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized to unassign products from this stop');
  END IF;

  DELETE FROM product_stops
  WHERE stop_id = p_stop_id AND product_id = p_product_id;

  RETURN jsonb_build_object('success', true, 'deleted', true);
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. get_stop_products
-- Returns all products assigned to a stop, with product details.
-- Used by admin UI to refresh the list after assign/unassign.
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