-- Migration 031: Reports V1 — Operational Reporting RPCs
-- SECURITY DEFINER — bypasses RLS, enforces brand scoping in SQL
-- All functions accept p_brand_id NULL = platform_admin sees all brands
-- brand_admin is filtered at the page level via getAdminUser()

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. get_reports_summary — 10 KPI cards
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_reports_summary(
  p_brand_id     UUID,
  p_start_date   DATE,
  p_end_date     DATE
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Base WHERE: always filter by brand if provided, always filter by date
  -- Status filter: exclude canceled orders from all revenue/order counts

  WITH date_orders AS (
    SELECT o.id, o.subtotal, o.status, o.brand_id,
           CASE WHEN EXISTS (
             SELECT 1 FROM order_items oi WHERE oi.order_id = o.id AND oi.fulfillment = 'pickup'
           ) THEN true ELSE false END AS has_pickup,
           CASE WHEN EXISTS (
             SELECT 1 FROM order_items oi WHERE oi.order_id = o.id AND oi.fulfillment = 'shipping'
           ) THEN true ELSE false END AS has_shipping
    FROM orders o
    WHERE o.created_at::DATE BETWEEN p_start_date AND p_end_date
      AND o.status != 'canceled'
      AND (p_brand_id IS NULL OR o.brand_id = p_brand_id)
  ),
  pickup_orders AS (
    SELECT COUNT(DISTINCT id) AS cnt FROM date_orders WHERE has_pickup
  ),
  shipping_orders AS (
    SELECT COUNT(DISTINCT id) AS cnt FROM date_orders WHERE has_shipping
  ),
  pending_pickups AS (
    SELECT COUNT(DISTINCT o.id) AS cnt
    FROM date_orders o
    WHERE o.has_pickup AND o.status = 'pending'
  ),
  completed_pickups AS (
    SELECT COUNT(DISTINCT o.id) AS cnt
    FROM date_orders o
    WHERE o.has_pickup AND o.status = 'completed'
  ),
  contacts_added AS (
    SELECT COUNT(*) AS cnt
    FROM communication_contacts cc
    WHERE cc.created_at::DATE BETWEEN p_start_date AND p_end_date
      AND cc.source = 'import'
      AND (p_brand_id IS NULL OR cc.brand_id = p_brand_id)
  ),
  campaigns_sent AS (
    SELECT COUNT(*) AS cnt
    FROM communication_campaigns cc
    WHERE cc.sent_at::DATE BETWEEN p_start_date AND p_end_date
      AND cc.status = 'sent'
      AND (p_brand_id IS NULL OR cc.brand_id = p_brand_id)
  ),
  messages_logged AS (
    SELECT COUNT(*) AS cnt
    FROM communication_message_logs ml
    WHERE ml.sent_at::DATE BETWEEN p_start_date AND p_end_date
      AND (p_brand_id IS NULL OR ml.brand_id = p_brand_id)
  )
  SELECT jsonb_build_object(
    'gross_sales',       COALESCE(SUM(subtotal), 0),
    'total_orders',      COUNT(DISTINCT id),
    'avg_order_value',   CASE WHEN COUNT(id) > 0 THEN ROUND(AVG(subtotal), 2) ELSE 0 END,
    'pickup_orders',     COALESCE((SELECT cnt FROM pickup_orders), 0),
    'shipping_orders',   COALESCE((SELECT cnt FROM shipping_orders), 0),
    'pending_pickups',   COALESCE((SELECT cnt FROM pending_pickups), 0),
    'completed_pickups', COALESCE((SELECT cnt FROM completed_pickups), 0),
    'contacts_added',    COALESCE((SELECT cnt FROM contacts_added), 0),
    'campaigns_sent',    COALESCE((SELECT cnt FROM campaigns_sent), 0),
    'messages_logged',   COALESCE((SELECT cnt FROM messages_logged), 0)
  ) INTO v_result
  FROM date_orders;

  RETURN v_result;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. get_orders_by_stop_report — orders grouped by stop
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_orders_by_stop_report(
  p_brand_id   UUID,
  p_start_date DATE,
  p_end_date   DATE
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN COALESCE(jsonb_agg(
    jsonb_build_object(
      'stop_name',       r.stop_name,
      'city',           r.city,
      'state',          r.state,
      'date',           r.date,
      'order_count',    r.order_count,
      'gross_sales',    r.gross_sales,
      'pending_count',  r.pending_count,
      'completed_count', r.completed_count
    ) ORDER BY r.date DESC
  ), '[]'::JSONB)
  FROM (
    SELECT
      s.city || ', ' || s.state AS stop_name,
      s.city,
      s.state,
      s.date,
      COUNT(DISTINCT o.id) AS order_count,
      COALESCE(SUM(o.subtotal), 0) AS gross_sales,
      COUNT(DISTINCT CASE WHEN o.status = 'pending' THEN o.id END) AS pending_count,
      COUNT(DISTINCT CASE WHEN o.status = 'completed' THEN o.id END) AS completed_count
    FROM orders o
    JOIN stops s ON s.id = o.stop_id
    WHERE o.created_at::DATE BETWEEN p_start_date AND p_end_date
      AND o.status != 'canceled'
      AND (p_brand_id IS NULL OR o.brand_id = p_brand_id)
    GROUP BY s.id, s.city, s.state, s.date
  ) r;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. get_sales_by_product_report — product revenue
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_sales_by_product_report(
  p_brand_id   UUID,
  p_start_date DATE,
  p_end_date   DATE
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN COALESCE(jsonb_agg(
    jsonb_build_object(
      'product_name', r.product_name,
      'units_sold',   r.units_sold,
      'gross_revenue', r.gross_revenue,
      'avg_price',    r.avg_price
    ) ORDER BY r.gross_revenue DESC
  ), '[]'::JSONB)
  FROM (
    SELECT
      p.name AS product_name,
      SUM(oi.quantity) AS units_sold,
      SUM(oi.price * oi.quantity) AS gross_revenue,
      ROUND(AVG(oi.price), 2) AS avg_price
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    JOIN products p ON p.id = oi.product_id
    WHERE o.created_at::DATE BETWEEN p_start_date AND p_end_date
      AND o.status != 'canceled'
      AND (p_brand_id IS NULL OR o.brand_id = p_brand_id)
    GROUP BY p.id, p.name
  ) r;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. get_fulfillment_report — pickup / shipping / mixed breakdown
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_fulfillment_report(
  p_brand_id   UUID,
  p_start_date DATE,
  p_end_date   DATE
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_total NUMERIC;
BEGIN
  SELECT COALESCE(SUM(o.subtotal), 0) INTO v_total
  FROM orders o
  WHERE o.created_at::DATE BETWEEN p_start_date AND p_end_date
    AND o.status != 'canceled'
    AND (p_brand_id IS NULL OR o.brand_id = p_brand_id);

  RETURN COALESCE(jsonb_agg(sub ORDER BY revenue DESC), '[]'::JSONB)
  FROM (
    SELECT
      CASE
        WHEN has_pickup AND has_shipping THEN 'mixed'
        WHEN has_pickup THEN 'pickup'
        ELSE 'shipping'
      END AS fulfillment_type,
      COUNT(DISTINCT o.id) AS order_count,
      SUM(o.subtotal) AS revenue,
      CASE WHEN v_total > 0 THEN ROUND(100.0 * SUM(o.subtotal) / v_total, 1) ELSE 0 END AS pct_of_total
    FROM (
      SELECT o.id, o.subtotal,
        EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.id AND oi.fulfillment = 'pickup') AS has_pickup,
        EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.id AND oi.fulfillment = 'shipping') AS has_shipping
      FROM orders o
      WHERE o.created_at::DATE BETWEEN p_start_date AND p_end_date
        AND o.status != 'canceled'
        AND (p_brand_id IS NULL OR o.brand_id = p_brand_id)
    ) o
    GROUP BY fulfillment_type
  ) sub;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. get_pickup_status_by_stop — per-stop pickup status
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_pickup_status_by_stop(
  p_brand_id   UUID,
  p_start_date DATE,
  p_end_date   DATE
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN COALESCE(jsonb_agg(
    jsonb_build_object(
      'stop_name',     r.stop_name,
      'city',          r.city,
      'date',          r.date,
      'total_orders',  r.total_orders,
      'pending',       r.pending,
      'completed',     r.completed,
      'canceled',      r.canceled
    ) ORDER BY r.date DESC
  ), '[]'::JSONB)
  FROM (
    SELECT
      s.city || ', ' || s.state AS stop_name,
      s.city,
      s.date,
      COUNT(DISTINCT o.id) AS total_orders,
      COUNT(DISTINCT CASE WHEN o.status = 'pending' THEN o.id END) AS pending,
      COUNT(DISTINCT CASE WHEN o.status = 'completed' THEN o.id END) AS completed,
      COUNT(DISTINCT CASE WHEN o.status = 'canceled' THEN o.id END) AS canceled
    FROM orders o
    JOIN stops s ON s.id = o.stop_id
    WHERE o.created_at::DATE BETWEEN p_start_date AND p_end_date
      AND EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.id AND oi.fulfillment = 'pickup')
      AND (p_brand_id IS NULL OR o.brand_id = p_brand_id)
    GROUP BY s.id, s.city, s.state, s.date
  ) r;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. get_contact_growth_report — new contacts over time
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_contact_growth_report(
  p_brand_id   UUID,
  p_start_date DATE,
  p_end_date   DATE
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN COALESCE(jsonb_agg(
    jsonb_build_object(
      'date',         r.date,
      'new_contacts', r.new_contacts,
      'imports',      r.imports,
      'total',        r.total
    ) ORDER BY r.date DESC
  ), '[]'::JSONB)
  FROM (
    SELECT
      d::DATE AS date,
      COALESCE(SUM(CASE WHEN cc.source IS DISTINCT FROM 'import' THEN 1 ELSE 0 END), 0) AS new_contacts,
      COALESCE(SUM(CASE WHEN cc.source = 'import' THEN 1 ELSE 0 END), 0) AS imports,
      COUNT(cc.*) AS total
    FROM generate_series(p_start_date, p_end_date, '1 day'::INTERVAL) d
    LEFT JOIN communication_contacts cc
      ON cc.created_at::DATE = d::DATE
      AND (p_brand_id IS NULL OR cc.brand_id = p_brand_id)
    GROUP BY d::DATE
  ) r;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. get_campaign_activity_report — campaign status and message counts
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_campaign_activity_report(
  p_brand_id   UUID,
  p_start_date DATE,
  p_end_date   DATE
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN COALESCE(jsonb_agg(
    jsonb_build_object(
      'campaign_name',  c.name,
      'status',         c.status,
      'campaign_type',  c.campaign_type,
      'sent_at',        c.sent_at,
      'messages_logged', COALESCE(ml.sent_count, 0)
    ) ORDER BY c.sent_at DESC NULLS LAST
  ), '[]'::JSONB)
  FROM communication_campaigns c
  LEFT JOIN (
    SELECT campaign_id, COUNT(*) AS sent_count
    FROM communication_message_logs
    WHERE sent_at::DATE BETWEEN p_start_date AND p_end_date
    GROUP BY campaign_id
  ) ml ON ml.campaign_id = c.id
  WHERE c.created_at::DATE BETWEEN p_start_date AND p_end_date
    AND (p_brand_id IS NULL OR c.brand_id = p_brand_id);
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- Refresh PostgREST schema cache
-- ═══════════════════════════════════════════════════════════════════════════

NOTIFY pgrst, 'reload schema';