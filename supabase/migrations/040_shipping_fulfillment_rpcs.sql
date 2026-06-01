-- Migration 040: Shipping Fulfillment RPCs
-- Idempotent: CREATE OR REPLACE FUNCTION

-- ── 1. update_shipping_order ──────────────────────────────────────────────────
-- Updates shipping_status and tracking_number for an order.
-- Requires can_manage_orders permission (checked in server action via getAdminUser).

CREATE OR REPLACE FUNCTION public.update_shipping_order(
  p_order_id         UUID,
  p_shipping_status  TEXT,
  p_tracking_number TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE orders SET
    shipping_status  = p_shipping_status,
    tracking_number  = p_tracking_number,
    updated_at       = now()
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ── 2. get_shipping_orders ───────────────────────────────────────────────────
-- Returns orders that contain at least one shipping-line item.
-- Filtered by brand_id when p_brand_id is provided.

CREATE OR REPLACE FUNCTION public.get_shipping_orders(p_brand_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', o.id,
      'customer_name', o.customer_name,
      'customer_email', o.customer_email,
      'customer_phone', o.customer_phone,
      'status', o.status,
      'subtotal', o.subtotal,
      'shipping_status', o.shipping_status,
      'tracking_number', o.tracking_number,
      'created_at', o.created_at,
      'brand_id', o.brand_id,
      'order_items', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id', oi.id,
          'product_id', oi.product_id,
          'quantity', oi.quantity,
          'price', oi.price,
          'fulfillment', oi.fulfillment,
          'products', jsonb_build_object('name', p.name)
        ))
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = o.id AND oi.fulfillment = 'shipping'
      ), '[]'::JSONB)
    )
  )
  INTO v_result
  FROM orders o
  WHERE o.id IN (
    SELECT DISTINCT oi.order_id
    FROM order_items oi
    WHERE oi.fulfillment = 'shipping'
  )
  AND (
    p_brand_id IS NULL
    OR o.brand_id = p_brand_id
  )
  ORDER BY o.created_at DESC;

  RETURN COALESCE(v_result, '[]'::JSONB);
END;
$$;

NOTIFY pgrst, 'reload schema';
