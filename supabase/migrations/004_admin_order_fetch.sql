-- ============================================================
-- Admin Read Policies for Orders
-- ============================================================
-- The checkout hardening removed broad anon SELECT policies.
-- Admin pages need to read orders with the anon key (server-side via getAdminUser).
-- We use SECURITY DEFINER functions that bypass RLS so admin pages
-- can still fetch orders for their brand scope without auth.uid().

-- No direct public SELECT (already enforced by removal of anon policies)

-- Policy: platform_admin can SELECT all orders
CREATE POLICY "Platform admin can read orders"
  ON orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.role = 'platform_admin'
    )
  );

-- Policy: brand_admin can read orders for their brand
CREATE POLICY "Brand admin can read their brand orders"
  ON orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.role = 'brand_admin'
      AND admin_users.brand_id = (
        SELECT brand_id FROM stops WHERE stops.id = orders.stop_id
      )
    )
  );

-- Policy: stops readable by admin users
CREATE POLICY "Admins can read stops"
  ON stops FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

-- ============================================================
-- Admin Orders Fetch RPC
-- ============================================================
-- SECURITY DEFINER runs as postgres — bypasses RLS on orders/stops.

CREATE OR REPLACE FUNCTION get_admin_orders(p_brand_id UUID)
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
    SELECT COALESCE(jsonb_agg(t ORDER BY t.created_at DESC), '[]'::JSONB)
    INTO v_orders
    FROM (
      SELECT o.id, o.customer_name, o.customer_email, o.customer_phone,
             o.stop_id, o.status, o.subtotal, o.pickup_complete,
             o.pickup_completed_at, o.pickup_completed_by, o.created_at,
             CASE WHEN o.stop_id IS NOT NULL THEN jsonb_build_object(
               'id', s.id, 'city', s.city, 'state', s.state,
               'date', s.date, 'time', s.time, 'location', s.location, 'brand_id', s.brand_id
             ) END as stops
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
    SELECT COALESCE(jsonb_agg(t ORDER BY t.created_at DESC), '[]'::JSONB)
    INTO v_orders
    FROM (
      SELECT o.id, o.customer_name, o.customer_email, o.customer_phone,
             o.stop_id, o.status, o.subtotal, o.pickup_complete,
             o.pickup_completed_at, o.pickup_completed_by, o.created_at,
             jsonb_build_object(
               'id', s.id, 'city', s.city, 'state', s.state,
               'date', s.date, 'time', s.time, 'location', s.location, 'brand_id', s.brand_id
             ) as stops
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

-- ============================================================
-- Admin Order Detail RPC
-- ============================================================

CREATE OR REPLACE FUNCTION get_admin_order_detail(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order JSONB;
BEGIN
  SELECT jsonb_build_object(
    'id', o.id,
    'customer_name', o.customer_name,
    'customer_email', o.customer_email,
    'customer_phone', o.customer_phone,
    'stop_id', o.stop_id,
    'status', o.status,
    'subtotal', o.subtotal,
    'discount_amount', o.discount_amount,
    'tax_amount', o.tax_amount,
    'tax_rate', o.tax_rate,
    'tax_location', o.tax_location,
    'discount_reason', o.discount_reason,
    'pickup_complete', o.pickup_complete,
    'pickup_completed_at', o.pickup_completed_at,
    'pickup_completed_by', o.pickup_completed_by,
    'internal_notes', o.internal_notes,
    'payment_processor', o.payment_processor,
    'payment_status', o.payment_status,
    'payment_transaction_id', o.payment_transaction_id,
    'refunded_amount', o.refunded_amount,
    'refund_reason', o.refund_reason,
    'created_at', o.created_at,
    'stops', CASE WHEN o.stop_id IS NOT NULL THEN jsonb_build_object(
      'id', s.id,
      'city', s.city,
      'state', s.state,
      'date', s.date,
      'time', s.time,
      'location', s.location,
      'brand_id', s.brand_id
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
      ))
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = o.id
    ), '[]'::JSONB),
    'refunds', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', r.id,
        'order_id', r.order_id,
        'amount', r.amount,
        'reason', r.reason,
        'processor', r.processor,
        'processor_refund_id', r.processor_refund_id,
        'status', r.status,
        'created_at', r.created_at
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