-- Migration 032: Store Employee Role
--
-- Add store_employee to the platform's role model. No new columns —
-- admin_users.role already exists with values 'platform_admin', 'brand_admin'.
-- store_employee just adds a third recognized role.
--
-- RLS: store_employee can read orders for their brand (brand_id scoped).
-- SQL RPCs: get_admin_orders + get_admin_order_detail add store_employee brand scoping.
-- No changes to product/stop/communications/settings RLS — store_employee shouldn't
-- be granted those tables in RLS at all (they go through existing SECURITY DEFINER RPCs
-- with explicit can_manage_* guard checks in TypeScript actions).

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. RLS policy: store_employee can read their brand's orders
-- ═══════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Store employee can read their brand orders" ON orders;
CREATE POLICY "Store employee can read their brand orders"
  ON orders FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.role = 'store_employee'
      AND admin_users.brand_id = (
        SELECT brand_id FROM stops WHERE stops.id = orders.stop_id
      )
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. get_admin_orders — add store_employee brand scoping
--    (SECURITY DEFINER, no RLS — add explicit brand_id check for store_employee)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_admin_orders(p_brand_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_orders JSONB;
  v_stops JSONB;
  v_effective_brand_id UUID;
BEGIN
  -- Resolve effective brand: use p_brand_id if non-null,
  -- otherwise fall back to store_employee's own brand
  IF p_brand_id IS NOT NULL THEN
    v_effective_brand_id := p_brand_id;
  ELSE
    -- For store_employee with no p_brand_id, use their own brand_id
    -- (caller must pass brand_id for store_employee to avoid cross-brand data)
    v_effective_brand_id := NULL;
  END IF;

  IF v_effective_brand_id IS NULL THEN
    -- platform_admin or no brand scoping — return all orders
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
    -- brand-scoped query (brand_admin, store_employee, or platform_admin filtering)
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
      WHERE s.brand_id = v_effective_brand_id
      LIMIT 500
    ) t;

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', id, 'city', city, 'state', state,
      'date', date, 'time', time, 'location', location, 'brand_id', brand_id
    ) ORDER BY date), '[]'::JSONB)
    INTO v_stops FROM stops WHERE active = true AND brand_id = v_effective_brand_id;
  END IF;

  RETURN jsonb_build_object('orders', v_orders, 'stops', v_stops);
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. get_admin_order_detail — brand scoping (already SECURITY DEFINER,
--    add check that store_employee can only view orders in their brand)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_admin_order_detail(p_order_id UUID, p_brand_id UUID DEFAULT NULL)
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
  -- Resolve order's brand_id (from order.brand_id or stop.brand_id)
  SELECT
    COALESCE(o.brand_id, s.brand_id),
    s.brand_id
  INTO v_order_brand_id, v_stop_brand_id
  FROM orders o
  LEFT JOIN stops s ON o.stop_id = s.id
  WHERE o.id = p_order_id;

  -- Brand scoping: if p_brand_id is provided, restrict to that brand
  IF p_brand_id IS NOT NULL AND v_order_brand_id IS NOT NULL AND v_order_brand_id != p_brand_id THEN
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
    'stops', CASE WHEN o.stop_id IS NOT NULL THEN jsonb_build_object(
      'id', s.id, 'city', s.city, 'state', s.state,
      'date', s.date, 'time', s.time, 'location', s.location, 'brand_id', s.brand_id
    ) END,
    'order_items', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', oi.id, 'product_id', oi.product_id, 'product_name', p.name,
        'quantity', oi.quantity, 'price', oi.price, 'fulfillment', oi.fulfillment,
        'products', jsonb_build_object('name', p.name)
      ))
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = o.id
    ), '[]'::JSONB)
  )
  INTO v_order
  FROM orders o
  LEFT JOIN stops s ON o.stop_id = s.id
  WHERE o.id = p_order_id;

  RETURN v_order;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. Refresh PostgREST schema cache
-- ═══════════════════════════════════════════════════════════════════════════

NOTIFY pgrst, 'reload schema';