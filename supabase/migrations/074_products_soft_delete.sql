-- Migration 074: Products Soft Delete
-- Adds deleted_at column, delete_product RPC with order_items guard.
-- Mirrors wholesale_products pattern (migration 061).

-- Step 1: Add deleted_at column
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Step 2: Create delete_product RPC
CREATE OR REPLACE FUNCTION public.delete_product(p_product_id UUID, p_brand_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product RECORD;
  v_usage_count INT;
  v_brand_id UUID;
BEGIN
  -- Fetch product and lock it
  SELECT id, brand_id INTO v_product
  FROM products
  WHERE id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Product not found');
  END IF;

  v_brand_id := v_product.brand_id;

  -- Brand scoping: if p_brand_id provided, enforce it
  IF p_brand_id IS NOT NULL AND v_brand_id != p_brand_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Product not found');
  END IF;

  -- Check for usage in order_items
  SELECT COUNT(*) INTO v_usage_count
  FROM order_items
  WHERE product_id = p_product_id;

  IF v_usage_count > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Cannot delete — product is attached to ' || v_usage_count || ' order(s). Set availability to inactive instead.'
    );
  END IF;

  -- Soft delete
  UPDATE products SET deleted_at = now() WHERE id = p_product_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Step 3: Add RLS policy for deleted_at filtering on SELECT
-- The existing SELECT policies in 070 will now also need deleted_at filtering
-- for brand_admin and store_employee. We add a new policy that enforces deleted_at IS NULL.

-- First drop the existing brand-scoped SELECT policies (they don't filter deleted_at yet)
DROP POLICY IF EXISTS "brand_admin_read_products" ON public.products;
DROP POLICY IF EXISTS "store_employee_read_products" ON public.products;

-- Brand admin: own brand + not deleted
CREATE POLICY "brand_admin_read_products" ON public.products
  FOR SELECT USING (
    brand_id = (SELECT brand_id FROM admin_users WHERE user_id = auth.uid() AND role = 'brand_admin' LIMIT 1)
    AND deleted_at IS NULL
  );

-- Store employee: own brand + not deleted
CREATE POLICY "store_employee_read_products" ON public.products
  FOR SELECT USING (
    brand_id = (SELECT brand_id FROM admin_users WHERE user_id = auth.uid() AND role = 'store_employee' LIMIT 1)
    AND deleted_at IS NULL
  );