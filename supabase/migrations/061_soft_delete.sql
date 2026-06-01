-- Migration 061: Soft-delete for customers and products, order delete guard
-- Soft delete via deleted_at TIMESTAMPTZ (never hard-deleted to preserve FK integrity)
-- Updated get_wholesale_* to filter deleted_at IS NULL
-- Updated delete_wholesale_order to block paid orders

BEGIN;

-- ── 1. Add deleted_at columns ─────────────────────────────────────────────────
ALTER TABLE public.wholesale_customers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.wholesale_products ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- ── 2. Update get_wholesale_customers to filter soft-deleted ────────────────
DROP FUNCTION IF EXISTS public.get_wholesale_customers(UUID);
CREATE OR REPLACE FUNCTION public.get_wholesale_customers(p_brand_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_agg(t ORDER BY t.created_at DESC) INTO v_result
  FROM (
    SELECT
      id, user_id, company_name, contact_name, email, phone,
      billing_address, shipping_address, account_status,
      credit_limit, deposits_enabled, deposit_threshold, deposit_percentage,
      order_email, invoice_email, admin_notes, role, created_at, updated_at,
      deleted_at
    FROM wholesale_customers
    WHERE brand_id = p_brand_id
      AND deleted_at IS NULL          -- ← exclude soft-deleted
    ORDER BY created_at DESC
    LIMIT 500
  ) t;
  RETURN COALESCE(v_result, '[]'::JSONB);
END;
$$;

-- ── 3. Update get_wholesale_products to filter soft-deleted ─────────────────
DROP FUNCTION IF EXISTS public.get_wholesale_products(UUID);
CREATE OR REPLACE FUNCTION public.get_wholesale_products(p_brand_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_agg(t ORDER BY t.name) INTO v_result
  FROM (
    SELECT
      id, brand_id, rc_product_id, name, description,
      unit_type, unit_type_custom, availability, qty_available,
      season_start, season_end, price_tiers, hp_sku, hp_item_id,
      handling_instructions, storage_warning, loading_notes,
      product_label, pack_style, container_type, container_size_code,
      units_per_container, default_pickup_location, created_at, updated_at,
      deleted_at
    FROM wholesale_products
    WHERE brand_id = p_brand_id
      AND deleted_at IS NULL          -- ← exclude soft-deleted
    ORDER BY name
    LIMIT 500
  ) t;
  RETURN COALESCE(v_result, '[]'::JSONB);
END;
$$;

-- ── 4. delete_wholesale_customer (soft) ─────────────────────────────────────
DROP FUNCTION IF EXISTS public.delete_wholesale_customer(UUID);
CREATE OR REPLACE FUNCTION public.delete_wholesale_customer(p_customer_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_customer RECORD;
  v_order_count BIGINT;
BEGIN
  -- Check customer exists
  SELECT id, company_name INTO v_customer
  FROM wholesale_customers WHERE id = p_customer_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Customer not found');
  END IF;

  -- Block if any orders exist (active or historical)
  SELECT COUNT(*) INTO v_order_count
  FROM wholesale_orders WHERE customer_id = p_customer_id;
  IF v_order_count > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Cannot delete customer with existing orders. Disable the account instead.'
    );
  END IF;

  -- Soft delete
  UPDATE wholesale_customers SET deleted_at = now() WHERE id = p_customer_id;
  RETURN jsonb_build_object('success', true);
END;
$$;

-- ── 5. delete_wholesale_product (soft) ─────────────────────────────────────
DROP FUNCTION IF EXISTS public.delete_wholesale_product(UUID);
CREATE OR REPLACE FUNCTION public.delete_wholesale_product(p_product_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_product RECORD;
  v_usage_count BIGINT;
BEGIN
  -- Check product exists
  SELECT id, name INTO v_product
  FROM wholesale_products WHERE id = p_product_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Product not found');
  END IF;

  -- Block if referenced in any order items
  SELECT COUNT(*) INTO v_usage_count
  FROM wholesale_order_items WHERE product_id = p_product_id;
  IF v_usage_count > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Cannot delete product that is attached to orders. Set availability to unavailable instead.'
    );
  END IF;

  -- Soft delete
  UPDATE wholesale_products SET deleted_at = now() WHERE id = p_product_id;
  RETURN jsonb_build_object('success', true);
END;
$$;

-- ── 6. Strengthen delete_wholesale_order guard ──────────────────────────────
DROP FUNCTION IF EXISTS public.delete_wholesale_order(UUID);
CREATE OR REPLACE FUNCTION public.delete_wholesale_order(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_order RECORD;
BEGIN
  SELECT id, status, fulfillment_status, payment_status INTO v_order
  FROM wholesale_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;

  IF v_order.fulfillment_status = 'fulfilled' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot delete a fulfilled order.');
  END IF;

  IF v_order.payment_status = 'paid' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot delete a paid order.');
  END IF;

  DELETE FROM wholesale_order_items WHERE wholesale_order_id = p_order_id;
  DELETE FROM wholesale_notifications WHERE order_id = p_order_id;
  DELETE FROM wholesale_orders WHERE id = p_order_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

COMMIT;

NOTIFY pgrst, 'reload schema';
