-- Migration 060: Wholesale Pickup Orders RPC for Employee Portal
-- Returns unfulfilled wholesale orders partitioned by pickup date queue:
--   past_due:  anticipated_pickup_date < today
--   today:     anticipated_pickup_date = today
--   upcoming:  anticipated_pickup_date > today
-- Uses correlated subquery pattern (same fix as migration 058).

BEGIN;

DROP FUNCTION IF EXISTS public.get_wholesale_pickup_orders(UUID);
CREATE OR REPLACE FUNCTION public.get_wholesale_pickup_orders(p_brand_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_agg(t ORDER BY t.anticipated_pickup_date ASC) INTO v_result
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
      wo.created_at,
      wo.updated_at,
      wo.fulfilled_at,
      wc.company_name,
      wc.contact_name,
      wc.email AS customer_email,
      wc.phone AS customer_phone,
      COALESCE(
        (SELECT jsonb_agg(
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
        WHERE woi.wholesale_order_id = wo.id),
        '[]'::JSONB
      ) AS items
    FROM wholesale_orders wo
    JOIN wholesale_customers wc ON wo.customer_id = wc.id
    WHERE wo.brand_id = p_brand_id
      AND wo.fulfillment_status != 'fulfilled'
    ORDER BY wo.anticipated_pickup_date ASC
    LIMIT 500
  ) t;
  RETURN COALESCE(v_result, '[]'::JSONB);
END;
$$;

COMMIT;

NOTIFY pgrst, 'reload schema';
