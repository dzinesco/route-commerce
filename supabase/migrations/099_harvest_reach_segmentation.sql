-- ============================================================
-- 099_harvest_reach_segmentation.sql
-- Advanced segmentation: product filter, multi-filter AND/OR,
-- stop picker, campaign analytics, scheduled campaign sender
-- ============================================================

-- Helper: get all customer IDs matching a single filter block
CREATE OR REPLACE FUNCTION get_customer_ids_for_filter(
  p_brand_id       UUID,
  p_filter_type    TEXT,
  p_filter_params  JSONB
)
RETURNS TABLE (customer_id UUID)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_days_back    INTEGER := COALESCE((p_filter_params->>'days_back')::int, 90);
  v_date_from    TEXT    := p_filter_params->>'date_from';
  v_date_to      TEXT    := p_filter_params->>'date_to';
  v_stop_id      UUID    := NULLIF(p_filter_params->>'stop_id', '')::UUID;
  v_product_id   UUID    := NULLIF(p_filter_params->>'product_id', '')::UUID;
  v_zip_codes   TEXT[]  := NULL;
  v_city         TEXT    := p_filter_params->>'city';
  v_order_hist   TEXT    := COALESCE(p_filter_params->>'order_history', 'all');
  v_tags         TEXT[]  := NULL;
BEGIN
  -- Parse optional zip_codes array
  IF p_filter_params ? 'zip_codes' AND jsonb_typeof(p_filter_params->'zip_codes') = 'array' THEN
    v_zip_codes := ARRAY(SELECT jsonb_array_elements_text(p_filter_params->'zip_codes'));
  END IF;

  -- Parse optional tags array
  IF p_filter_params ? 'tags' AND jsonb_typeof(p_filter_params->'tags') = 'array' THEN
    v_tags := ARRAY(SELECT jsonb_array_elements_text(p_filter_params->'tags'));
  END IF;

  CASE p_filter_type
  WHEN 'all_customers' THEN
    RETURN QUERY
    SELECT DISTINCT c.id FROM customers c WHERE c.brand_id = p_brand_id;

  WHEN 'stop' THEN
    RETURN QUERY
    SELECT DISTINCT o.customer_id
    FROM orders o
    JOIN stops s ON s.id = o.stop_id
    WHERE o.brand_id = p_brand_id
      AND o.status NOT IN ('canceled')
      AND (v_stop_id IS NULL OR s.id = v_stop_id)
      AND (v_date_from IS NULL OR s.date >= v_date_from)
      AND (v_date_to   IS NULL OR s.date <= v_date_to);

  WHEN 'upcoming_stop' THEN
    RETURN QUERY
    SELECT DISTINCT o.customer_id
    FROM orders o
    JOIN stops s ON s.id = o.stop_id
    WHERE o.brand_id = p_brand_id
      AND o.status NOT IN ('canceled')
      AND s.date >= CURRENT_DATE::TEXT
      AND (v_stop_id IS NULL OR s.id = v_stop_id);

  WHEN 'product' THEN
    RETURN QUERY
    SELECT DISTINCT oi.order_id
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE o.brand_id = p_brand_id
      AND oi.product_id = v_product_id
      AND o.created_at >= NOW() - (v_days_back || ' days')::INTERVAL
      AND o.status NOT IN ('canceled');

  WHEN 'zip_code' THEN
    RETURN QUERY
    SELECT DISTINCT o.customer_id
    FROM orders o
    JOIN stops s ON s.id = o.stop_id
    WHERE o.brand_id = p_brand_id
      AND o.status NOT IN ('canceled')
      AND (v_zip_codes IS NULL OR s.zip = ANY(v_zip_codes))
      AND (v_city IS NULL OR s.city ILIKE v_city);

  WHEN 'customer_history' THEN
    RETURN QUERY
    SELECT oc.customer_id
    FROM (
      SELECT o.customer_id,
             COUNT(*)                                          AS order_count,
             MIN(o.created_at)                                 AS first_order_at
        FROM orders o
       WHERE o.brand_id = p_brand_id
         AND o.created_at >= NOW() - (v_days_back || ' days')::INTERVAL
         AND o.status NOT IN ('canceled')
       GROUP BY o.customer_id
    ) oc
    WHERE CASE v_order_hist
          WHEN 'first_order' THEN oc.order_count = 1
          WHEN 'repeat'      THEN oc.order_count > 1
          ELSE true
          END;

  WHEN 'tags' THEN
    RETURN QUERY
    SELECT DISTINCT cc.customer_id
    FROM communication_contacts cc
    WHERE cc.brand_id = p_brand_id
      AND cc.tags && v_tags;

  ELSE
    -- Unknown filter type: return empty
    RETURN;
  END CASE;
END;
$$;

-- ============================================================
-- preview_campaign_audience_v2
-- Supports single-target (legacy) and multi-filter SegmentRuleV2
-- { combinator: "AND"|"OR", filters: [{ type, params }] }
-- For legacy single-target: { target, ... } (backward compat)
-- Returns { count, sample_customers: [...] }
-- ============================================================
CREATE OR REPLACE FUNCTION preview_campaign_audience(
  p_brand_id       UUID,
  p_audience_rules JSONB
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_target      TEXT;
  v_count       BIGINT;
  v_customers   JSONB;
  v_combinator  TEXT := 'AND';
  v_filters     JSONB;
  v_customer_ids UUID[];
  v_set          UUID[];
  v_first       BOOLEAN := TRUE;
  v_filter      JSONB;
  v_filter_type TEXT;
  v_filter_params JSONB;
BEGIN
  v_target := p_audience_rules->>'target';

  -- Multi-filter SegmentRuleV2 format
  IF p_audience_rules ? 'filters' THEN
    v_combinator := COALESCE(p_audience_rules->>'combinator', 'AND');
    v_filters    := p_audience_rules->'filters';

    FOR v_filter IN SELECT * FROM jsonb_array_elements(v_filters)
    LOOP
      v_filter_type    := v_filter->>'type';
      v_filter_params  := COALESCE(v_filter->'params', '{}'::jsonb);

      -- Collect matching customer IDs for this filter
      IF v_combinator = 'AND' THEN
        -- INTERSECTION: only keep customers who match this AND all previous
        IF v_first THEN
          v_set  := ARRAY(SELECT customer_id FROM get_customer_ids_for_filter(p_brand_id, v_filter_type, v_filter_params));
          v_first := FALSE;
        ELSE
          v_set := ARRAY(
            SELECT unnest
            FROM unnest(v_set) AS unnest
            WHERE unnest = ANY(ARRAY(SELECT customer_id FROM get_customer_ids_for_filter(p_brand_id, v_filter_type, v_filter_params)))
          );
        END IF;
      ELSE
        -- UNION: accumulate all unique customers
        v_set := array_distinct(v_set || ARRAY(SELECT customer_id FROM get_customer_ids_for_filter(p_brand_id, v_filter_type, v_filter_params)));
        v_first := FALSE;
      END IF;
    END LOOP;

    -- Build result from accumulated set
    SELECT COUNT(*),
           COALESCE(jsonb_agg(sub), '[]'::jsonb)
    INTO v_count, v_customers
    FROM (
      SELECT jsonb_build_object(
        'id',    c.id,
        'email', COALESCE(cc.email, c.primary_email),
        'name',  COALESCE(c.first_name || ' ' || c.last_name, c.primary_email),
        'tags',  COALESCE(cc.tags, '{}'::text[]),
        'phone', cc.phone
      ) AS sub
      FROM unnest(v_set) AS uid(customer_id)
      JOIN customers c ON c.id = uid.customer_id
      LEFT JOIN communication_contacts cc ON cc.customer_id = c.id AND cc.brand_id = p_brand_id
      LIMIT 20
    ) sub;

    RETURN jsonb_build_object('count', v_count, 'sample_customers', v_customers);
  END IF;

  -- Legacy single-target format (backward compat)
  CASE v_target
  WHEN 'product' THEN
    WITH matching AS (
      SELECT DISTINCT o.customer_id
      FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      WHERE o.brand_id = p_brand_id
        AND oi.product_id = NULLIF(p_audience_rules->>'product_id', '')::UUID
        AND o.created_at >= NOW() - (COALESCE((p_audience_rules->>'days_back')::int, 90) || ' days')::INTERVAL
        AND o.status NOT IN ('canceled')
    )
    SELECT COUNT(*) INTO v_count FROM matching;
    SELECT COALESCE(jsonb_agg(sub), '[]'::jsonb) INTO v_customers
    FROM (
      SELECT jsonb_build_object(
        'id',    c.id,
        'email', COALESCE(cc.email, c.primary_email),
        'name',  COALESCE(c.first_name || ' ' || c.last_name, c.primary_email),
        'tags',  COALESCE(cc.tags, '{}'::text[]),
        'phone', cc.phone
      ) AS sub
      FROM (SELECT DISTINCT customer_id FROM matching) m
      JOIN customers c ON c.id = m.customer_id
      LEFT JOIN communication_contacts cc ON cc.customer_id = c.id AND cc.brand_id = p_brand_id
      LIMIT 20
    ) sub;

  WHEN 'upcoming_stop' THEN
    WITH matching AS (
      SELECT DISTINCT o.customer_id
      FROM orders o
      JOIN stops s ON s.id = o.stop_id
      WHERE o.brand_id = p_brand_id
        AND s.date >= CURRENT_DATE::TEXT
        AND o.status NOT IN ('canceled')
        AND (NULLIF(p_audience_rules->>'stop_id', '') IS NULL OR s.id = NULLIF(p_audience_rules->>'stop_id', '')::UUID)
    )
    SELECT COUNT(*) INTO v_count FROM matching;
    SELECT COALESCE(jsonb_agg(sub), '[]'::jsonb) INTO v_customers
    FROM (
      SELECT jsonb_build_object(
        'id',    c.id,
        'email', COALESCE(cc.email, c.primary_email),
        'name',  COALESCE(c.first_name || ' ' || c.last_name, c.primary_email),
        'tags',  COALESCE(cc.tags, '{}'::text[]),
        'phone', cc.phone
      ) AS sub
      FROM (SELECT DISTINCT customer_id FROM matching) m
      JOIN customers c ON c.id = m.customer_id
      LEFT JOIN communication_contacts cc ON cc.customer_id = c.id AND cc.brand_id = p_brand_id
      LIMIT 20
    ) sub;

  WHEN 'stop' THEN
    WITH matching AS (
      SELECT DISTINCT o.customer_id
      FROM orders o
      JOIN stops s ON s.id = o.stop_id
      WHERE o.brand_id = p_brand_id
        AND (NULLIF(p_audience_rules->>'stop_id', '') IS NULL OR s.id = NULLIF(p_audience_rules->>'stop_id', '')::UUID)
        AND (NULLIF(p_audience_rules->>'date_from', '') IS NULL OR s.date >= p_audience_rules->>'date_from')
        AND (NULLIF(p_audience_rules->>'date_to', '')   IS NULL OR s.date <= p_audience_rules->>'date_to')
        AND o.status NOT IN ('canceled')
    )
    SELECT COUNT(*) INTO v_count FROM matching;
    SELECT COALESCE(jsonb_agg(sub), '[]'::jsonb) INTO v_customers
    FROM (
      SELECT jsonb_build_object(
        'id',    c.id,
        'email', COALESCE(cc.email, c.primary_email),
        'name',  COALESCE(c.first_name || ' ' || c.last_name, c.primary_email),
        'tags',  COALESCE(cc.tags, '{}'::text[]),
        'phone', cc.phone
      ) AS sub
      FROM (SELECT DISTINCT customer_id FROM matching) m
      JOIN customers c ON c.id = m.customer_id
      LEFT JOIN communication_contacts cc ON cc.customer_id = c.id AND cc.brand_id = p_brand_id
      LIMIT 20
    ) sub;

  WHEN 'zip_code' THEN
    DECLARE
      v_zips TEXT[] := ARRAY(SELECT jsonb_array_elements_text(p_audience_rules->'zip_codes'));
      v_city TEXT   := p_audience_rules->>'city';
    BEGIN
      WITH matching AS (
        SELECT DISTINCT o.customer_id
        FROM orders o
        JOIN stops s ON s.id = o.stop_id
        WHERE o.brand_id = p_brand_id
          AND (v_zips IS NULL OR s.zip = ANY(v_zips))
          AND (v_city IS NULL OR s.city ILIKE v_city)
          AND o.status NOT IN ('canceled')
      )
      SELECT COUNT(*) INTO v_count FROM matching;
      SELECT COALESCE(jsonb_agg(sub), '[]'::jsonb) INTO v_customers
      FROM (
        SELECT jsonb_build_object(
          'id',    c.id,
          'email', COALESCE(cc.email, c.primary_email),
          'name',  COALESCE(c.first_name || ' ' || c.last_name, c.primary_email),
          'tags',  COALESCE(cc.tags, '{}'::text[]),
          'phone', cc.phone
        ) AS sub
        FROM (SELECT DISTINCT customer_id FROM matching) m
        JOIN customers c ON c.id = m.customer_id
        LEFT JOIN communication_contacts cc ON cc.customer_id = c.id AND cc.brand_id = p_brand_id
        LIMIT 20
      ) sub;
    END;

  WHEN 'customer_history' THEN
    DECLARE
      v_hist  TEXT := COALESCE(p_audience_rules->>'order_history', 'all');
      v_days  INT  := COALESCE((p_audience_rules->>'days_back')::int, 90);
    BEGIN
      WITH order_counts AS (
        SELECT o.customer_id, COUNT(*) AS order_count
        FROM orders o
        WHERE o.brand_id = p_brand_id
          AND o.created_at >= NOW() - (v_days || ' days')::INTERVAL
          AND o.status NOT IN ('canceled')
        GROUP BY o.customer_id
      ),
      filtered AS (
        SELECT customer_id FROM order_counts oc
        WHERE CASE v_hist
              WHEN 'first_order' THEN oc.order_count = 1
              WHEN 'repeat'      THEN oc.order_count > 1
              ELSE true END
      )
      SELECT COUNT(*) INTO v_count FROM filtered;
      SELECT COALESCE(jsonb_agg(sub), '[]'::jsonb) INTO v_customers
      FROM (
        SELECT jsonb_build_object(
          'id',    c.id,
          'email', COALESCE(cc.email, c.primary_email),
          'name',  COALESCE(c.first_name || ' ' || c.last_name, c.primary_email),
          'tags',  COALESCE(cc.tags, '{}'::text[]),
          'phone', cc.phone
        ) AS sub
        FROM filtered f
        JOIN customers c ON c.id = f.customer_id
        LEFT JOIN communication_contacts cc ON cc.customer_id = c.id AND cc.brand_id = p_brand_id
        LIMIT 20
      ) sub;
    END;

  WHEN 'customer_ids' THEN
    DECLARE
      v_ids UUID[] := ARRAY(SELECT NULLIF(trim(value), '')::UUID FROM jsonb_array_elements_text(p_audience_rules->'customer_ids'));
    BEGIN
      SELECT COUNT(*) INTO v_count
      FROM unnest(v_ids) AS uid(id)
      WHERE uid.id IN (SELECT id FROM customers WHERE brand_id = p_brand_id);
      SELECT COALESCE(jsonb_agg(sub), '[]'::jsonb) INTO v_customers
      FROM (
        SELECT jsonb_build_object(
          'id',    c.id,
          'email', COALESCE(cc.email, c.primary_email),
          'name',  COALESCE(c.first_name || ' ' || c.last_name, c.primary_email),
          'tags',  COALESCE(cc.tags, '{}'::text[]),
          'phone', cc.phone
        ) AS sub
        FROM unnest(v_ids) AS uid(id)
        JOIN customers c ON c.id = uid.id
        LEFT JOIN communication_contacts cc ON cc.customer_id = c.id AND cc.brand_id = p_brand_id
        LIMIT 20
      ) sub;
    END;

  ELSE -- 'all_customers' or unknown
    SELECT COUNT(*) INTO v_count FROM customers WHERE brand_id = p_brand_id;
    SELECT COALESCE(jsonb_agg(sub), '[]'::jsonb) INTO v_customers
    FROM (
      SELECT jsonb_build_object(
        'id',    c.id,
        'email', COALESCE(cc.email, c.primary_email),
        'name',  COALESCE(c.first_name || ' ' || c.last_name, c.primary_email),
        'tags',  COALESCE(cc.tags, '{}'::text[]),
        'phone', cc.phone
      ) AS sub
      FROM customers c
      LEFT JOIN communication_contacts cc ON cc.customer_id = c.id AND cc.brand_id = p_brand_id
      WHERE c.brand_id = p_brand_id
      LIMIT 20
    ) sub;
  END CASE;

  RETURN jsonb_build_object('count', v_count, 'sample_customers', v_customers);
END;
$$;

-- ============================================================
-- get_products_for_segment_picker
-- Returns active products for product-filter dropdown
-- ============================================================
CREATE OR REPLACE FUNCTION get_products_for_segment_picker(p_brand_id UUID)
RETURNS TABLE (id UUID, name TEXT, type TEXT, price NUMERIC)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.name, p.type, p.price
  FROM products p
  WHERE p.brand_id = p_brand_id
    AND p.deleted_at IS NULL
    AND p.active = true
  ORDER BY p.name ASC;
END;
$$;

-- ============================================================
-- get_stops_for_segment_picker
-- Returns stops with is_upcoming / is_past flags
-- ============================================================
CREATE OR REPLACE FUNCTION get_stops_for_segment_picker(
  p_brand_id UUID,
  p_stop_id  UUID DEFAULT NULL
)
RETURNS TABLE (
  id          UUID,
  city        TEXT,
  state       TEXT,
  date        TEXT,
  time        TEXT,
  location    TEXT,
  zip         TEXT,
  is_upcoming BOOLEAN,
  is_past     BOOLEAN
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_today TEXT := CURRENT_DATE::TEXT;
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.city,
    s.state,
    s.date,
    s.time,
    s.location,
    s.zip,
    (s.date >= v_today) AS is_upcoming,
    (s.date < v_today)  AS is_past
  FROM stops s
  WHERE s.brand_id   = p_brand_id
    AND s.deleted_at IS NULL
    AND s.active     = true
    AND s.status     = 'active'
    AND (p_stop_id IS NULL OR s.id = p_stop_id)
  ORDER BY s.date DESC;
END;
$$;

-- ============================================================
-- get_campaign_analytics
-- Aggregates message logs into campaign engagement stats
-- ============================================================
CREATE OR REPLACE FUNCTION get_campaign_analytics(
  p_brand_id    UUID,
  p_campaign_id UUID DEFAULT NULL
)
RETURNS TABLE (
  campaign_id     UUID,
  campaign_name   TEXT,
  total_sent      BIGINT,
  total_delivered BIGINT,
  total_opened    BIGINT,
  total_clicked   BIGINT,
  total_bounced   BIGINT,
  delivered_rate  NUMERIC,
  open_rate       NUMERIC,
  click_rate      NUMERIC,
  bounce_rate     NUMERIC,
  sent_at         TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cc.id                                                            AS campaign_id,
    cc.name                                                          AS campaign_name,
    COUNT(CASE WHEN ml.status != 'queued' THEN 1 END)::BIGINT       AS total_sent,
    COUNT(CASE WHEN ml.delivered_at IS NOT NULL THEN 1 END)::BIGINT AS total_delivered,
    COUNT(CASE WHEN ml.opened_at    IS NOT NULL THEN 1 END)::BIGINT AS total_opened,
    COUNT(CASE WHEN ml.clicked_at   IS NOT NULL THEN 1 END)::BIGINT AS total_clicked,
    COUNT(CASE WHEN ml.bounced_at   IS NOT NULL THEN 1 END)::BIGINT AS total_bounced,

    CASE WHEN COUNT(CASE WHEN ml.status != 'queued' THEN 1 END) > 0
         THEN ROUND(100.0
              * COUNT(CASE WHEN ml.delivered_at IS NOT NULL THEN 1 END)
              / COUNT(CASE WHEN ml.status != 'queued' THEN 1 END), 1)
         ELSE 0 END                                                  AS delivered_rate,

    CASE WHEN COUNT(CASE WHEN ml.delivered_at IS NOT NULL THEN 1 END) > 0
         THEN ROUND(100.0
              * COUNT(CASE WHEN ml.opened_at IS NOT NULL THEN 1 END)
              / COUNT(CASE WHEN ml.delivered_at IS NOT NULL THEN 1 END), 1)
         ELSE 0 END                                                  AS open_rate,

    CASE WHEN COUNT(CASE WHEN ml.delivered_at IS NOT NULL THEN 1 END) > 0
         THEN ROUND(100.0
              * COUNT(CASE WHEN ml.clicked_at IS NOT NULL THEN 1 END)
              / COUNT(CASE WHEN ml.delivered_at IS NOT NULL THEN 1 END), 1)
         ELSE 0 END                                                  AS click_rate,

    CASE WHEN COUNT(CASE WHEN ml.status != 'queued' THEN 1 END) > 0
         THEN ROUND(100.0
              * COUNT(CASE WHEN ml.bounced_at IS NOT NULL THEN 1 END)
              / COUNT(CASE WHEN ml.status != 'queued' THEN 1 END), 1)
         ELSE 0 END                                                  AS bounce_rate,

    cc.sent_at
  FROM communication_campaigns cc
  LEFT JOIN communication_message_logs ml ON ml.campaign_id = cc.id
  WHERE cc.brand_id = p_brand_id
    AND (p_campaign_id IS NULL OR cc.id = p_campaign_id)
    AND cc.status = 'sent'
  GROUP BY cc.id, cc.name, cc.sent_at
  ORDER BY cc.sent_at DESC NULLS LAST;
END;
$$;

-- ============================================================
-- send_scheduled_campaigns
-- Called by cron job: sends all overdue scheduled campaigns
-- ============================================================
CREATE OR REPLACE FUNCTION send_scheduled_campaigns()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_campaign communication_campaigns;
  v_result JSONB := '[]'::JSONB;
  v_send_result JSONB;
BEGIN
  FOR v_campaign IN
    SELECT * FROM communication_campaigns
    WHERE status = 'scheduled'
      AND scheduled_at <= NOW()
  LOOP
    SELECT send_campaign(v_campaign.id) INTO v_send_result;
    v_result := v_result || jsonb_build_array(
      jsonb_build_object(
        'campaign_id', v_campaign.id,
        'campaign_name', v_campaign.name,
        'result', v_send_result
      )
    );
  END LOOP;

  RETURN jsonb_build_object('results', v_result);
END;
$$;