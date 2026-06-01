-- 111_route_trace_recent_activity.sql
-- RPC for recent lot events (activity feed) + total_lots stat

BEGIN;

-- ── get_recent_lot_events ──────────────────────────────────────────────────────
-- Returns the most recent lot events across all lots for a brand,
-- enriched with lot context (lot_number, crop_type) for the dashboard feed.

DROP TYPE IF EXISTS "public"."recent_lot_event" CASCADE;
CREATE TYPE recent_lot_event AS (
  event_id          UUID,
  event_type        TEXT,
  event_time        TIMESTAMPTZ,
  location          TEXT,
  bin_id            TEXT,
  notes             TEXT,
  created_by_name   TEXT,
  lot_id            UUID,
  lot_number        TEXT,
  crop_type         TEXT,
  status            TEXT
);

CREATE OR REPLACE FUNCTION get_recent_lot_events(p_brand_id UUID, p_limit INT DEFAULT 10)
RETURNS SETOF recent_lot_event
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    he.id        AS event_id,
    he.event_type AS event_type,
    he.event_time AS event_time,
    he.location  AS location,
    he.bin_id    AS bin_id,
    he.notes     AS notes,
    he.created_by_name AS created_by_name,
    hl.id        AS lot_id,
    hl.lot_number AS lot_number,
    hl.crop_type  AS crop_type,
    hl.status     AS status
  FROM harvest_lot_events he
  JOIN harvest_lots hl ON hl.id = he.lot_id
  WHERE hl.brand_id = p_brand_id
  ORDER BY he.event_time DESC
  LIMIT p_limit;
END;
$$;

-- ── Update stats to include total_lots ─────────────────────────────────────────
-- get_route_trace_stats already returns a row — add total_lots
-- (CREATE OR REPLACE keeps the signature compatible)

DROP TYPE IF EXISTS "public"."route_trace_stats" CASCADE;
CREATE TYPE route_trace_stats AS (
  active_count           INT,
  in_transit_count       INT,
  at_shed_count          INT,
  total_lots_today       INT,
  total_harvested_today  INT,
  total_lots             INT
);

CREATE OR REPLACE FUNCTION get_route_trace_stats(p_brand_id UUID)
RETURNS route_trace_stats
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result route_trace_stats;
BEGIN
  SELECT
    COUNT(*) FILTER (WHERE status = 'active')        INTO result.active_count,
    COUNT(*) FILTER (WHERE status = 'in_transit')    INTO result.in_transit_count,
    COUNT(*) FILTER (WHERE status = 'at_shed')       INTO result.at_shed_count,
    COUNT(*) FILTER (WHERE status = 'active' AND DATE(harvest_date) = CURRENT_DATE)
                                                       INTO result.total_lots_today,
    COALESCE(SUM(quantity_lbs) FILTER (WHERE DATE(harvest_date) = CURRENT_DATE), 0)
                                                       INTO result.total_harvested_today,
    COUNT(*)                                           INTO result.total_lots
  FROM harvest_lots
  WHERE brand_id = p_brand_id;

  result.active_count      := COALESCE(result.active_count, 0);
  result.in_transit_count  := COALESCE(result.in_transit_count, 0);
  result.at_shed_count     := COALESCE(result.at_shed_count, 0);
  result.total_lots_today  := COALESCE(result.total_lots_today, 0);
  result.total_lots        := COALESCE(result.total_lots, 0);

  RETURN result;
END;
$$;

COMMIT;
