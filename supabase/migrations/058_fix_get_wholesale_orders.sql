-- Migration 058: Fix get_wholesale_orders and get_wholesale_customer_orders
-- Fixes: jsonb_build_object cannot be used inside jsonb_agg with FILTER.
-- Replaced with correlated subquery approach that is valid in Supabase Postgres.

BEGIN;

-- ── 1. get_wholesale_orders ────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.get_wholesale_orders(UUID);
CREATE OR REPLACE FUNCTION public.get_wholesale_orders(p_brand_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_agg(t ORDER BY t.created_at DESC) INTO v_result
  FROM (
    SELECT
      wo.id,
      wo.status,
      wo.fulfillment_status,
      wo.payment_status,
      wo.anticipated_pickup_date,
      wo.subtotal,
      wo.deposit_required,
      wo.deposit_paid,
      wo.balance_due,
      wo.invoice_number,
      wo.assigned_employee_id,
      wo.created_at,
      wo.updated_at,
      wo.fulfilled_at,
      wc.company_name,
      wc.contact_name,
      wc.email AS customer_email,
      COALESCE(
        (
          SELECT jsonb_agg(
            CASE WHEN woi.id IS NOT NULL THEN
              jsonb_build_object(
                'id', woi.id,
                'product_name', wp.name,
                'quantity', woi.quantity,
                'unit_price', woi.unit_price,
                'line_total', woi.line_total
              )
            END
          )
          FROM wholesale_order_items woi
          LEFT JOIN wholesale_products wp ON woi.product_id = wp.id
          WHERE woi.wholesale_order_id = wo.id
        ),
        '[]'::JSONB
      ) AS items
    FROM wholesale_orders wo
    JOIN wholesale_customers wc ON wo.customer_id = wc.id
    WHERE wo.brand_id = p_brand_id
    ORDER BY wo.created_at DESC
    LIMIT 500
  ) t;
  RETURN COALESCE(v_result, '[]'::JSONB);
END;
$$;

-- ── 2. get_wholesale_customer_orders ─────────────────────────────────────────
DROP FUNCTION IF EXISTS public.get_wholesale_customer_orders(UUID);
CREATE OR REPLACE FUNCTION public.get_wholesale_customer_orders(p_customer_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_agg(t ORDER BY t.created_at DESC) INTO v_result
  FROM (
    SELECT
      wo.id,
      wo.status,
      wo.fulfillment_status,
      wo.payment_status,
      wo.anticipated_pickup_date,
      wo.subtotal,
      wo.deposit_required,
      wo.deposit_paid,
      wo.balance_due,
      wo.invoice_number,
      wo.invoice_token,
      wo.created_at,
      wo.updated_at,
      COALESCE(
        (
          SELECT jsonb_agg(
            CASE WHEN woi.id IS NOT NULL THEN
              jsonb_build_object(
                'id', woi.id,
                'product_name', wp.name,
                'quantity', woi.quantity,
                'unit_price', woi.unit_price,
                'line_total', woi.line_total
              )
            END
          )
          FROM wholesale_order_items woi
          LEFT JOIN wholesale_products wp ON woi.product_id = wp.id
          WHERE woi.wholesale_order_id = wo.id
        ),
        '[]'::JSONB
      ) AS items
    FROM wholesale_orders wo
    WHERE wo.customer_id = p_customer_id
    ORDER BY wo.created_at DESC
    LIMIT 100
  ) t;
  RETURN COALESCE(v_result, '[]'::JSONB);
END;
$$;

-- ── 3. get_wholesale_products — simplified (no aggregate, no join issue) ───────
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
      wp.id,
      wp.name,
      wp.description,
      wp.unit_type,
      wp.unit_type_custom,
      wp.availability,
      wp.qty_available,
      wp.season_start,
      wp.season_end,
      wp.price_tiers,
      wp.hp_sku,
      wp.hp_item_id,
      wp.handling_instructions,
      wp.storage_warning,
      wp.loading_notes,
      wp.product_label,
      wp.pack_style,
      wp.container_type,
      wp.container_size_code,
      wp.units_per_container,
      wp.default_pickup_location,
      wp.created_at
    FROM wholesale_products wp
    WHERE wp.brand_id = p_brand_id
    ORDER BY wp.name
  ) t;
  RETURN COALESCE(v_result, '[]'::JSONB);
END;
$$;

COMMIT;

NOTIFY pgrst, 'reload schema';
