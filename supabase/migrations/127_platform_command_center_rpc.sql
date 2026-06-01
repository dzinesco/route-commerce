-- Migration 127: Platform command center RPCs (final applied version)

-- Platform-wide metrics
CREATE OR REPLACE FUNCTION get_platform_command_center_metrics()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  result := jsonb_build_object(
    'active_brands', (
      SELECT COUNT(*) FROM brands WHERE slug IN ('tuxedo', 'indian-river-direct')
    ),
    'orders_today', (
      SELECT COUNT(*) FROM orders
      WHERE DATE(created_at) = CURRENT_DATE
    ),
    'revenue_today', (
      SELECT COALESCE(SUM(subtotal), 0)
      FROM orders
      WHERE DATE(created_at) = CURRENT_DATE
      AND status NOT IN ('cancelled', 'refunded')
    ),
    'active_routes', (
      SELECT COUNT(DISTINCT s.id)
      FROM stops s
      WHERE s.date::DATE >= CURRENT_DATE
      AND s.status = 'active'
      AND s.date ~ '^\d{4}-\d{2}-\d{2}$'
    ),
    'failed_orders_today', (
      SELECT COUNT(*)
      FROM orders
      WHERE DATE(created_at) = CURRENT_DATE
      AND status IN ('payment_failed', 'failed')
    ),
    'pending_orders_today', (
      SELECT COUNT(*)
      FROM orders
      WHERE DATE(created_at) = CURRENT_DATE
      AND status = 'pending'
    )
  );

  RETURN result;
END;
$$;

-- Recent activity feed (last 50 operational events across all brands)
CREATE OR REPLACE FUNCTION get_platform_activity_feed()
RETURNS TABLE (
  id UUID,
  event_type TEXT,
  entity_type TEXT,
  entity_id UUID,
  payload JSONB,
  actor_type TEXT,
  source TEXT,
  created_at TIMESTAMPTZ,
  brand_id UUID,
  brand_name TEXT
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    oe.id,
    oe.event_type,
    oe.entity_type,
    oe.entity_id,
    oe.payload,
    oe.actor_type::TEXT,
    oe.source::TEXT,
    oe.created_at,
    (oe.payload->>'brand_id')::UUID AS brand_id,
    b.name AS brand_name
  FROM operational_events oe
  LEFT JOIN brands b ON b.id = (oe.payload->>'brand_id')::UUID
  ORDER BY oe.created_at DESC
  LIMIT 50;
END;
$$;

-- Per-brand health snapshot
DROP FUNCTION IF EXISTS get_brand_health_snapshot();
CREATE OR REPLACE FUNCTION get_brand_health_snapshot()
RETURNS TABLE (
  brand_id UUID,
  brand_name TEXT,
  brand_slug TEXT,
  plan_tier TEXT,
  orders_today INT,
  revenue_today NUMERIC,
  active_stops INT,
  failed_orders INT,
  pending_orders INT,
  last_activity TIMESTAMPTZ,
  open_pain_items INT,
  health_status TEXT
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH bm AS (
    SELECT
      b.id AS bid,
      b.name AS bname,
      b.slug AS bslug,
      COUNT(DISTINCT o.id) FILTER (WHERE DATE(o.created_at) = CURRENT_DATE) AS ords_today,
      SUM(o.subtotal) FILTER (WHERE DATE(o.created_at) = CURRENT_DATE AND o.status NOT IN ('cancelled', 'refunded')) AS rev_today,
      COUNT(DISTINCT s.id) FILTER (
        WHERE (s.date ~ '^\d{4}-\d{2}-\d{2}$') AND (s.date::DATE >= CURRENT_DATE) AND s.status = 'active'
      ) AS act_stops,
      COUNT(DISTINCT o.id) FILTER (WHERE DATE(o.created_at) = CURRENT_DATE AND o.status IN ('payment_failed', 'failed')) AS fail_ords,
      COUNT(DISTINCT o.id) FILTER (WHERE DATE(o.created_at) = CURRENT_DATE AND o.status = 'pending') AS pend_ords,
      MAX(oe.created_at) AS last_act
    FROM brands b
    LEFT JOIN orders o ON o.brand_id = b.id
    LEFT JOIN stops s ON s.brand_id = b.id
    LEFT JOIN operational_events oe ON oe.payload->>'brand_id' = b.id::TEXT
    WHERE b.slug IN ('tuxedo', 'indian-river-direct')
    GROUP BY b.id, b.name, b.slug
  ),
  pc AS (
    SELECT f.brand_id AS pc_bid, COUNT(*) AS open_cnt
    FROM founder_pain_log f
    WHERE f.status = 'open'
    GROUP BY f.brand_id
  )
  SELECT
    bm.bid,
    bm.bname,
    bm.bslug,
    NULL::TEXT,
    COALESCE(bm.ords_today, 0)::INT,
    COALESCE(bm.rev_today, 0)::NUMERIC,
    COALESCE(bm.act_stops, 0)::INT,
    COALESCE(bm.fail_ords, 0)::INT,
    COALESCE(bm.pend_ords, 0)::INT,
    bm.last_act,
    COALESCE(pc.open_cnt, 0)::INT,
    CASE
      WHEN COALESCE(bm.fail_ords, 0) > 0 THEN 'critical'
      WHEN COALESCE(bm.pend_ords, 0) > 5 THEN 'warning'
      WHEN COALESCE(pc.open_cnt, 0) > 0 THEN 'warning'
      WHEN bm.last_act IS NULL OR bm.last_act < (NOW() - INTERVAL '24 hours') THEN 'warning'
      ELSE 'healthy'
    END
  FROM bm
  LEFT JOIN pc ON pc.pc_bid = bm.bid;
END;
$$;