-- Migration 073: Add order_items to get_admin_orders for driver pickup filtering
-- Adds fulfillment-aware order_items to the orders list RPC so the pickup
-- portal can filter to pickup-only items and detect mixed-fulfillment orders.

-- Step 1: Drop and recreate get_admin_orders with order_items subquery
DROP FUNCTION IF EXISTS public.get_admin_orders(UUID);

CREATE OR REPLACE FUNCTION public.get_admin_orders(p_brand_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_orders JSONB;
  v_stops JSONB;
BEGIN
  IF p_brand_id IS NULL THEN
    -- platform_admin: return all orders with order_items
    SELECT COALESCE(jsonb_agg(t ORDER BY t.created_at DESC), '[]'::JSONB)
    INTO v_orders
    FROM (
      SELECT o.id, o.customer_name, o.customer_email, o.customer_phone,
             o.stop_id, o.status, o.subtotal, o.pickup_complete,
             o.pickup_completed_at, o.pickup_completed_by, o.created_at,
             o.brand_id,
             CASE WHEN o.stop_id IS NOT NULL THEN jsonb_build_object(
               'id', s.id, 'city', s.city, 'state', s.state,
               'date', s.date, 'time', s.time, 'location', s.location, 'brand_id', s.brand_id
             ) END as stops,
             COALESCE((
               SELECT jsonb_agg(jsonb_build_object(
                 'id', oi.id,
                 'product_id', oi.product_id,
                 'product_name', p.name,
                 'quantity', oi.quantity,
                 'price', oi.price,
                 'fulfillment', oi.fulfillment,
                 'products', jsonb_build_object('name', p.name)
               ) ORDER BY p.name)
               FROM order_items oi
               JOIN products p ON oi.product_id = p.id
               WHERE oi.order_id = o.id
             ), '[]'::JSONB) AS order_items
      FROM orders o LEFT JOIN stops s ON o.stop_id = s.id
      WHERE o.stop_id IS NOT NULL
      LIMIT 500
    ) t;

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', id, 'city', city, 'state', state,
      'date', date, 'time', time, 'location', location, 'brand_id', brand_id
    ) ORDER BY date), '[]'::JSONB)
    INTO v_stops FROM stops WHERE active = true;
  ELSE
    -- brand-scoped: restrict to brand via stops join, include order_items
    SELECT COALESCE(jsonb_agg(t ORDER BY t.created_at DESC), '[]'::JSONB)
    INTO v_orders
    FROM (
      SELECT o.id, o.customer_name, o.customer_email, o.customer_phone,
             o.stop_id, o.status, o.subtotal, o.pickup_complete,
             o.pickup_completed_at, o.pickup_completed_by, o.created_at,
             o.brand_id,
             jsonb_build_object(
               'id', s.id, 'city', s.city, 'state', s.state,
               'date', s.date, 'time', s.time, 'location', s.location, 'brand_id', s.brand_id
             ) as stops,
             COALESCE((
               SELECT jsonb_agg(jsonb_build_object(
                 'id', oi.id,
                 'product_id', oi.product_id,
                 'product_name', p.name,
                 'quantity', oi.quantity,
                 'price', oi.price,
                 'fulfillment', oi.fulfillment,
                 'products', jsonb_build_object('name', p.name)
               ) ORDER BY p.name)
               FROM order_items oi
               JOIN products p ON oi.product_id = p.id
               WHERE oi.order_id = o.id
             ), '[]'::JSONB) AS order_items
      FROM orders o JOIN stops s ON o.stop_id = s.id
      WHERE s.brand_id = p_brand_id
      LIMIT 500
    ) t;

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', id, 'city', city, 'state', state,
      'date', date, 'time', time, 'location', location, 'brand_id', brand_id
    ) ORDER BY date), '[]'::JSONB)
    INTO v_stops FROM stops WHERE active = true AND brand_id = p_brand_id;
  END IF;

  RETURN jsonb_build_object('orders', v_orders, 'stops', v_stops);
END;
$$;

-- Step 2: Also update get_admin_order_detail to use consistent order_items shape
-- (it already has fulfillment, but ensure the shape matches what DriverPickupPanel expects)
DROP FUNCTION IF EXISTS public.get_admin_order_detail(UUID, UUID);

CREATE OR REPLACE FUNCTION public.get_admin_order_detail(p_order_id UUID, p_brand_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order JSONB;
  v_order_brand_id UUID;
  v_stop_brand_id UUID;
BEGIN
  SELECT COALESCE(o.brand_id, s.brand_id), s.brand_id
  INTO v_order_brand_id, v_stop_brand_id
  FROM orders o LEFT JOIN stops s ON o.stop_id = s.id
  WHERE o.id = p_order_id;

  IF p_brand_id IS NOT NULL AND v_order_brand_id IS NOT NULL AND v_order_brand_id != p_brand_id THEN
    RETURN jsonb_build_object('error', 'Order not found or access denied');
  END IF;

  IF v_order_brand_id IS NULL AND p_brand_id IS NOT NULL THEN
    RETURN jsonb_build_object('error', 'Order not found or access denied');
  END IF;

  SELECT jsonb_build_object(
    'id', o.id,
    'customer_name', o.customer_name,
    'customer_email', o.customer_email,
    'customer_phone', o.customer_phone,
    'stop_id', o.stop_id,
    'status', o.status,
    'subtotal', o.subtotal,
    'pickup_complete', o.pickup_complete,
    'pickup_completed_at', o.pickup_completed_at,
    'pickup_completed_by', o.pickup_completed_by,
    'created_at', o.created_at,
    'discount_amount', o.discount_amount,
    'tax_amount', o.tax_amount,
    'tax_rate', o.tax_rate,
    'tax_location', o.tax_location,
    'discount_reason', o.discount_reason,
    'internal_notes', o.internal_notes,
    'payment_processor', o.payment_processor,
    'payment_status', o.payment_status,
    'payment_transaction_id', o.payment_transaction_id,
    'refunded_amount', o.refunded_amount,
    'refund_reason', o.refund_reason,
    'stops', CASE WHEN o.stop_id IS NOT NULL THEN jsonb_build_object(
      'id', s.id, 'city', s.city, 'state', s.state,
      'date', s.date, 'time', s.time, 'location', s.location, 'brand_id', s.brand_id
    ) END,
    'order_items', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', oi.id,
        'product_id', oi.product_id,
        'product_name', p.name,
        'quantity', oi.quantity,
        'price', oi.price,
        'fulfillment', oi.fulfillment,
        'products', jsonb_build_object('name', p.name)
      ) ORDER BY p.name)
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = o.id
    ), '[]'::JSONB),
    'refunds', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', r.id, 'order_id', r.order_id, 'amount', r.amount,
        'reason', r.reason, 'processor', r.processor,
        'processor_refund_id', r.processor_refund_id,
        'status', r.status, 'created_at', r.created_at
      ))
      FROM refunds r
      WHERE r.order_id = o.id
    ), '[]'::JSONB)
  )
  INTO v_order
  FROM orders o
  LEFT JOIN stops s ON o.stop_id = s.id
  WHERE o.id = p_order_id;

  RETURN v_order;
END;
$$;