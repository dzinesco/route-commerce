-- =============================================================================
-- Communication Center V1 — Core Schema
-- Fully idempotent: safe to re-run after partial failure or interrupted deploy
--
-- Cross-brand platform module: supports Tuxedo Corn, Indian River Direct, and
-- future brands via brand_id separation and RLS.
--
-- Design principles:
--   - Operational messaging first (stop notifications, pickup reminders, etc.)
--   - Audience rules owned by campaigns (no separate reusable audience table)
--   - Environment-based provider config (Resend API key in env, not in DB)
--   - Event-driven future-ready (event_type / event_id on message_logs)
--   - No live email/SMS sending until explicitly enabled after testing
--   - Customer data lives in orders table — no separate customers table
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Tables (CREATE TABLE IF NOT EXISTS is already idempotent) ────────────

CREATE TABLE IF NOT EXISTS public.communication_settings (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id            UUID        NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  default_sender_email TEXT,
  default_sender_name  TEXT,
  reply_to_email       TEXT,
  email_provider       TEXT        NOT NULL DEFAULT 'resend',
  email_footer_html   TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(brand_id)
);

CREATE TABLE IF NOT EXISTS public.communication_templates (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id        UUID        NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  name            TEXT        NOT NULL,
  subject         TEXT        NOT NULL,
  body_text       TEXT        NOT NULL DEFAULT '',
  body_html       TEXT,
  template_type   TEXT        NOT NULL,
  campaign_type   TEXT,
  created_by      UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.communication_campaigns (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id        UUID        NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  name            TEXT        NOT NULL,
  subject         TEXT,
  body_text       TEXT,
  body_html       TEXT,
  template_id     UUID        REFERENCES communication_templates(id) ON DELETE SET NULL,
  campaign_type   TEXT        NOT NULL,
  status          TEXT        NOT NULL DEFAULT 'draft',
  audience_rules  JSONB       NOT NULL DEFAULT '{}',
  scheduled_at    TIMESTAMPTZ,
  sent_at         TIMESTAMPTZ,
  created_by      UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.communication_message_logs (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id        UUID        NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  campaign_id     UUID        REFERENCES communication_campaigns(id) ON DELETE SET NULL,
  customer_id     UUID,
  customer_email  TEXT,
  delivery_method TEXT        NOT NULL,
  subject         TEXT,
  body_preview    TEXT,
  status          TEXT        NOT NULL,
  sent_at         TIMESTAMPTZ,
  error_message   TEXT,
  event_type      TEXT,
  event_id        UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.customer_communication_preferences (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id     UUID        NOT NULL,
  brand_id        UUID        NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  email_opt_in    BOOLEAN     NOT NULL DEFAULT true,
  sms_opt_in      BOOLEAN     NOT NULL DEFAULT false,
  email_opt_in_at TIMESTAMPTZ,
  sms_opt_in_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(customer_id, brand_id)
);

-- ── Indexes (CREATE INDEX IF NOT EXISTS is already idempotent) ────────────

CREATE INDEX IF NOT EXISTS idx_communication_settings_brand
  ON public.communication_settings(brand_id);
CREATE INDEX IF NOT EXISTS idx_communication_templates_brand
  ON public.communication_templates(brand_id);
CREATE INDEX IF NOT EXISTS idx_communication_campaigns_brand_status
  ON public.communication_campaigns(brand_id, status);
CREATE INDEX IF NOT EXISTS idx_communication_campaigns_brand_type
  ON public.communication_campaigns(brand_id, campaign_type);
CREATE INDEX IF NOT EXISTS idx_communication_message_logs_brand_sent
  ON public.communication_message_logs(brand_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_communication_message_logs_campaign
  ON public.communication_message_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_communication_message_logs_customer
  ON public.communication_message_logs(customer_id);
CREATE INDEX IF NOT EXISTS idx_communication_message_logs_event
  ON public.communication_message_logs(event_type, event_id) WHERE event_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customer_comm_prefs_customer_brand
  ON public.customer_communication_preferences(customer_id, brand_id);

-- ── RLS — idempotent (ALTER TABLE ENABLE is safe to re-run) ────────────────

ALTER TABLE public.communication_settings  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_templates  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_campaigns  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_message_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_communication_preferences ENABLE ROW LEVEL SECURITY;

-- ── Policies (DROP IF EXISTS before each CREATE makes them idempotent) ────

DROP POLICY IF EXISTS "Platform admin can read communication_settings"
  ON public.communication_settings;
DROP POLICY IF EXISTS "Brand admin can read own brand communication_settings"
  ON public.communication_settings;
CREATE POLICY "Platform admin can read communication_settings"
  ON public.communication_settings FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.user_id = auth.uid()
    AND admin_users.role = 'platform_admin'
  ));
CREATE POLICY "Brand admin can read own brand communication_settings"
  ON public.communication_settings FOR SELECT TO authenticated
  USING (brand_id IN (
    SELECT brand_id FROM admin_users
    WHERE admin_users.user_id = auth.uid()
    AND admin_users.role = 'brand_admin'
  ));

DROP POLICY IF EXISTS "Platform admin can read communication_templates"
  ON public.communication_templates;
DROP POLICY IF EXISTS "Brand admin can read own brand communication_templates"
  ON public.communication_templates;
CREATE POLICY "Platform admin can read communication_templates"
  ON public.communication_templates FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.user_id = auth.uid()
    AND admin_users.role = 'platform_admin'
  ));
CREATE POLICY "Brand admin can read own brand communication_templates"
  ON public.communication_templates FOR SELECT TO authenticated
  USING (brand_id IN (
    SELECT brand_id FROM admin_users
    WHERE admin_users.user_id = auth.uid()
    AND admin_users.role = 'brand_admin'
  ));

DROP POLICY IF EXISTS "Platform admin can read communication_campaigns"
  ON public.communication_campaigns;
DROP POLICY IF EXISTS "Brand admin can read own brand communication_campaigns"
  ON public.communication_campaigns;
CREATE POLICY "Platform admin can read communication_campaigns"
  ON public.communication_campaigns FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.user_id = auth.uid()
    AND admin_users.role = 'platform_admin'
  ));
CREATE POLICY "Brand admin can read own brand communication_campaigns"
  ON public.communication_campaigns FOR SELECT TO authenticated
  USING (brand_id IN (
    SELECT brand_id FROM admin_users
    WHERE admin_users.user_id = auth.uid()
    AND admin_users.role = 'brand_admin'
  ));

DROP POLICY IF EXISTS "Platform admin can read communication_message_logs"
  ON public.communication_message_logs;
DROP POLICY IF EXISTS "Brand admin can read own brand communication_message_logs"
  ON public.communication_message_logs;
CREATE POLICY "Platform admin can read communication_message_logs"
  ON public.communication_message_logs FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.user_id = auth.uid()
    AND admin_users.role = 'platform_admin'
  ));
CREATE POLICY "Brand admin can read own brand communication_message_logs"
  ON public.communication_message_logs FOR SELECT TO authenticated
  USING (brand_id IN (
    SELECT brand_id FROM admin_users
    WHERE admin_users.user_id = auth.uid()
    AND admin_users.role = 'brand_admin'
  ));

DROP POLICY IF EXISTS "Anyone can read customer_communication_preferences"
  ON public.customer_communication_preferences;
DROP POLICY IF EXISTS "Platform admin can read customer_communication_preferences"
  ON public.customer_communication_preferences;
CREATE POLICY "Anyone can read customer_communication_preferences"
  ON public.customer_communication_preferences FOR SELECT TO anon USING (true);
CREATE POLICY "Platform admin can read customer_communication_preferences"
  ON public.customer_communication_preferences FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.user_id = auth.uid()
    AND admin_users.role = 'platform_admin'
  ));

-- ── SECURITY DEFINER RPCs ─────────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.upsert_communication_settings(UUID, TEXT, TEXT, TEXT, TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.upsert_communication_settings(
  p_brand_id        UUID,
  p_sender_email    TEXT,
  p_sender_name     TEXT,
  p_reply_to_email  TEXT,
  p_provider        TEXT,
  p_footer_html     TEXT
)
RETURNS communication_settings
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_result communication_settings;
BEGIN
  INSERT INTO public.communication_settings
    (brand_id, default_sender_email, default_sender_name, reply_to_email, email_provider, email_footer_html)
  VALUES (p_brand_id, p_sender_email, p_sender_name, p_reply_to_email, p_provider, p_footer_html)
  ON CONFLICT (brand_id) DO UPDATE SET
    default_sender_email = EXCLUDED.default_sender_email,
    default_sender_name  = EXCLUDED.default_sender_name,
    reply_to_email       = EXCLUDED.reply_to_email,
    email_provider       = EXCLUDED.email_provider,
    email_footer_html    = EXCLUDED.email_footer_html,
    updated_at           = now()
  RETURNING * INTO v_result;
  RETURN v_result;
END;
$$;

DROP FUNCTION IF EXISTS public.upsert_communication_template(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID);
CREATE OR REPLACE FUNCTION public.upsert_communication_template(
  p_id          UUID,
  p_brand_id    UUID,
  p_name        TEXT,
  p_subject     TEXT,
  p_body_text   TEXT,
  p_body_html   TEXT,
  p_template_type TEXT,
  p_campaign_type TEXT,
  p_created_by  UUID
)
RETURNS communication_templates
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_result communication_templates;
  v_id UUID;
BEGIN
  v_id := coalesce(p_id, uuid_generate_v4());
  INSERT INTO public.communication_templates
    (id, brand_id, name, subject, body_text, body_html, template_type, campaign_type, created_by)
  VALUES (v_id, p_brand_id, p_name, p_subject, p_body_text, p_body_html, p_template_type, p_campaign_type, p_created_by)
  ON CONFLICT (id) DO UPDATE SET
    name          = EXCLUDED.name,
    subject       = EXCLUDED.subject,
    body_text     = EXCLUDED.body_text,
    body_html     = EXCLUDED.body_html,
    template_type = EXCLUDED.template_type,
    campaign_type = EXCLUDED.campaign_type,
    updated_at    = now()
  RETURNING * INTO v_result;
  RETURN v_result;
END;
$$;

DROP FUNCTION IF EXISTS public.upsert_communication_campaign(UUID, UUID, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, TEXT, JSONB, TIMESTAMPTZ, UUID);
CREATE OR REPLACE FUNCTION public.upsert_communication_campaign(
  p_id              UUID,
  p_brand_id        UUID,
  p_name            TEXT,
  p_subject         TEXT,
  p_body_text       TEXT,
  p_body_html       TEXT,
  p_template_id    UUID,
  p_campaign_type  TEXT,
  p_status          TEXT,
  p_audience_rules JSONB,
  p_scheduled_at   TIMESTAMPTZ,
  p_created_by     UUID
)
RETURNS communication_campaigns
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_result communication_campaigns;
  v_id UUID;
BEGIN
  v_id := coalesce(p_id, uuid_generate_v4());
  INSERT INTO public.communication_campaigns
    (id, brand_id, name, subject, body_text, body_html, template_id, campaign_type, status, audience_rules, scheduled_at, created_by)
  VALUES (v_id, p_brand_id, p_name, p_subject, p_body_text, p_body_html, p_template_id, p_campaign_type, p_status, p_audience_rules, p_scheduled_at, p_created_by)
  ON CONFLICT (id) DO UPDATE SET
    name           = EXCLUDED.name,
    subject        = EXCLUDED.subject,
    body_text      = EXCLUDED.body_text,
    body_html      = EXCLUDED.body_html,
    template_id    = EXCLUDED.template_id,
    campaign_type  = EXCLUDED.campaign_type,
    status         = EXCLUDED.status,
    audience_rules = EXCLUDED.audience_rules,
    scheduled_at   = EXCLUDED.scheduled_at,
    updated_at     = now()
  WHERE communication_campaigns.brand_id = p_brand_id
  RETURNING * INTO v_result;
  RETURN v_result;
END;
$$;

DROP FUNCTION IF EXISTS public.log_communication_messages(JSONB);
CREATE OR REPLACE FUNCTION public.log_communication_messages(p_entries JSONB)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_entry JSONB;
  v_inserted_count integer := 0;
BEGIN
  FOR v_entry IN SELECT * FROM jsonb_array_elements(p_entries)
  LOOP
    INSERT INTO public.communication_message_logs
      (brand_id, campaign_id, customer_id, customer_email, delivery_method,
       subject, body_preview, status, sent_at, error_message)
    VALUES (
      (v_entry->>'brand_id')::UUID,
      nullif(v_entry->>'campaign_id', '')::UUID,
      nullif(v_entry->>'customer_id', '')::UUID,
      v_entry->>'customer_email',
      v_entry->>'delivery_method',
      v_entry->>'subject',
      left(v_entry->>'body_preview', 500),
      coalesce(v_entry->>'status', 'queued'),
      now(),
      v_entry->>'error_message'
    );
    v_inserted_count := v_inserted_count + 1;
  END LOOP;
  RETURN v_inserted_count;
END;
$$;

DROP FUNCTION IF EXISTS public.opt_out_customer(UUID, UUID, TEXT);
CREATE OR REPLACE FUNCTION public.opt_out_customer(
  p_customer_id UUID,
  p_brand_id     UUID,
  p_method       TEXT
)
RETURNS customer_communication_preferences
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_result customer_communication_preferences;
BEGIN
  INSERT INTO public.customer_communication_preferences
    (customer_id, brand_id, email_opt_in, sms_opt_in, email_opt_in_at, sms_opt_in_at)
  VALUES (
    p_customer_id, p_brand_id,
    CASE WHEN p_method = 'email' THEN false ELSE true END,
    CASE WHEN p_method = 'sms'   THEN false ELSE true END,
    CASE WHEN p_method = 'email' THEN now() ELSE NULL END,
    CASE WHEN p_method = 'sms'   THEN now() ELSE NULL END
  )
  ON CONFLICT (customer_id, brand_id) DO UPDATE SET
    email_opt_in    = CASE WHEN p_method = 'email' THEN false ELSE customer_communication_preferences.email_opt_in END,
    sms_opt_in      = CASE WHEN p_method = 'sms'   THEN false ELSE customer_communication_preferences.sms_opt_in END,
    email_opt_in_at = CASE WHEN p_method = 'email' THEN now() ELSE email_opt_in_at END,
    sms_opt_in_at   = CASE WHEN p_method = 'sms'   THEN now() ELSE sms_opt_in_at END,
    updated_at      = now()
  RETURNING * INTO v_result;
  RETURN v_result;
END;
$$;

DROP FUNCTION IF EXISTS public.preview_campaign_audience(UUID, JSONB);
CREATE OR REPLACE FUNCTION public.preview_campaign_audience(
  p_brand_id       UUID,
  p_audience_rules JSONB
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_target     TEXT;
  v_stop_id     UUID;
  v_date_from   TIMESTAMPTZ;
  v_date_to     TIMESTAMPTZ;
  v_city        TEXT;
  v_order_hist  TEXT;
  v_days_back   INTEGER;
  v_product_id  UUID;
  v_count       INTEGER;
  v_customers   JSONB;
BEGIN
  v_target := p_audience_rules->>'target';

  -- Stop-based targeting
  IF v_target = 'stop' THEN
    v_stop_id   := nullif(p_audience_rules->>'stop_id', '')::UUID;
    v_date_from := nullif(p_audience_rules->>'date_from', '')::TIMESTAMPTZ;
    v_date_to   := nullif(p_audience_rules->>'date_to', '')::TIMESTAMPTZ;
    SELECT COUNT(DISTINCT o.customer_id),
           jsonb_agg(DISTINCT jsonb_build_object('id', o.customer_id, 'email', o.customer_email, 'name', o.customer_name) ORDER BY o.customer_name)
    INTO v_count, v_customers
    FROM orders o
    JOIN stops s ON s.id = o.stop_id
    LEFT JOIN customer_communication_preferences cp ON cp.customer_id = o.customer_id AND cp.brand_id = p_brand_id
    WHERE s.brand_id = p_brand_id AND o.status NOT IN ('canceled')
      AND (v_stop_id IS NULL OR o.stop_id = v_stop_id)
      AND (v_date_from IS NULL OR o.created_at >= v_date_from)
      AND (v_date_to   IS NULL OR o.created_at <= v_date_to)
      AND (cp.email_opt_in IS NULL OR cp.email_opt_in = true);

  -- ZIP/city targeting (customer ZIP not in orders — city filter only)
  ELSIF v_target = 'zip_code' THEN
    v_city := p_audience_rules->>'city';
    SELECT COUNT(DISTINCT o.customer_id),
           jsonb_agg(DISTINCT jsonb_build_object('id', o.customer_id, 'email', o.customer_email, 'name', o.customer_name) ORDER BY o.customer_name)
    INTO v_count, v_customers
    FROM orders o
    JOIN stops s ON s.id = o.stop_id
    LEFT JOIN customer_communication_preferences cp ON cp.customer_id = o.customer_id AND cp.brand_id = p_brand_id
    WHERE s.brand_id = p_brand_id AND o.status NOT IN ('canceled')
      AND (cp.email_opt_in IS NULL OR cp.email_opt_in = true)
      AND (v_city IS NULL OR true);  -- city filter placeholder; ZIP requires customer_zip column in orders

  -- Customer history targeting
  ELSIF v_target = 'customer_history' THEN
    v_order_hist := p_audience_rules->>'order_history';
    v_days_back  := (p_audience_rules->>'days_back')::INTEGER;

    IF v_order_hist = 'first_order' THEN
      WITH first_orders AS (
        SELECT o.customer_id, MIN(o.created_at)
        FROM orders o JOIN stops s ON s.id = o.stop_id
        WHERE s.brand_id = p_brand_id AND o.status NOT IN ('canceled')
          AND (v_days_back IS NULL OR o.created_at >= now() - (v_days_back || ' days')::INTERVAL)
        GROUP BY o.customer_id HAVING COUNT(*) = 1
      )
      SELECT COUNT(*),
             jsonb_agg(DISTINCT jsonb_build_object('id', fo.customer_id, 'email', o.customer_email, 'name', o.customer_name) ORDER BY o.customer_name)
      INTO v_count, v_customers
      FROM first_orders fo
      JOIN orders o ON o.customer_id = fo.customer_id
      LEFT JOIN customer_communication_preferences cp ON cp.customer_id = fo.customer_id AND cp.brand_id = p_brand_id
      WHERE (cp.email_opt_in IS NULL OR cp.email_opt_in = true);

    ELSIF v_order_hist = 'repeat' THEN
      WITH repeat_customer_ids AS (
        SELECT o.customer_id
        FROM orders o JOIN stops s ON s.id = o.stop_id
        WHERE s.brand_id = p_brand_id AND o.status NOT IN ('canceled')
          AND (v_days_back IS NULL OR o.created_at >= now() - (v_days_back || ' days')::INTERVAL)
        GROUP BY o.customer_id HAVING COUNT(*) > 1
      )
      SELECT COUNT(*),
             jsonb_agg(DISTINCT jsonb_build_object('id', rc.customer_id, 'email', o.customer_email, 'name', o.customer_name) ORDER BY o.customer_name)
      INTO v_count, v_customers
      FROM repeat_customer_ids rc
      JOIN orders o ON o.customer_id = rc.customer_id
      LEFT JOIN customer_communication_preferences cp ON cp.customer_id = rc.customer_id AND cp.brand_id = p_brand_id
      WHERE (cp.email_opt_in IS NULL OR cp.email_opt_in = true);

    ELSE
      SELECT COUNT(DISTINCT o.customer_id),
             jsonb_agg(DISTINCT jsonb_build_object('id', o.customer_id, 'email', o.customer_email, 'name', o.customer_name) ORDER BY o.customer_name)
      INTO v_count, v_customers
      FROM orders o
      JOIN stops s ON s.id = o.stop_id
      LEFT JOIN customer_communication_preferences cp ON cp.customer_id = o.customer_id AND cp.brand_id = p_brand_id
      WHERE s.brand_id = p_brand_id AND o.status NOT IN ('canceled')
        AND (v_days_back IS NULL OR o.created_at >= now() - (v_days_back || ' days')::INTERVAL)
        AND (cp.email_opt_in IS NULL OR cp.email_opt_in = true);
    END IF;

  -- Product-based targeting
  ELSIF v_target = 'product' THEN
    v_product_id := nullif(p_audience_rules->>'product_id', '')::UUID;
    SELECT COUNT(DISTINCT o.customer_id),
           jsonb_agg(DISTINCT jsonb_build_object('id', o.customer_id, 'email', o.customer_email, 'name', o.customer_name) ORDER BY o.customer_name)
    INTO v_count, v_customers
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    JOIN stops s ON s.id = o.stop_id
    LEFT JOIN customer_communication_preferences cp ON cp.customer_id = o.customer_id AND cp.brand_id = p_brand_id
    WHERE s.brand_id = p_brand_id AND o.status NOT IN ('canceled')
      AND (v_product_id IS NULL OR oi.product_id = v_product_id)
      AND (cp.email_opt_in IS NULL OR cp.email_opt_in = true);

  -- Explicit customer ID list
  ELSIF v_target = 'customer_ids' THEN
    SELECT COUNT(*),
           jsonb_agg(jsonb_build_object('id', o.customer_id, 'email', o.customer_email, 'name', o.customer_name) ORDER BY o.customer_name)
    INTO v_count, v_customers
    FROM orders o
    LEFT JOIN customer_communication_preferences cp ON cp.customer_id = o.customer_id AND cp.brand_id = p_brand_id
    WHERE o.customer_id IN (
      SELECT jsonb_array_elements_text(p_audience_rules->'customer_ids')::UUID
    )
      AND (cp.email_opt_in IS NULL OR cp.email_opt_in = true);

  ELSE
    -- all_customers or unknown
    SELECT COUNT(DISTINCT o.customer_id),
           jsonb_agg(DISTINCT jsonb_build_object('id', o.customer_id, 'email', o.customer_email, 'name', o.customer_name) ORDER BY o.customer_name)
    INTO v_count, v_customers
    FROM orders o
    JOIN stops s ON s.id = o.stop_id
    LEFT JOIN customer_communication_preferences cp ON cp.customer_id = o.customer_id AND cp.brand_id = p_brand_id
    WHERE s.brand_id = p_brand_id AND o.status NOT IN ('canceled')
      AND (cp.email_opt_in IS NULL OR cp.email_opt_in = true);
  END IF;

  -- Cap sample at 20
  SELECT jsonb_agg(x ORDER BY x->>'name') INTO v_customers
  FROM (SELECT * FROM jsonb_array_elements(coalesce(v_customers, '[]'::jsonb)) LIMIT 20) t(x);

  RETURN jsonb_build_object('count', v_count, 'sample_customers', v_customers);
END;
$$;

DROP FUNCTION IF EXISTS public.send_campaign(UUID);
CREATE OR REPLACE FUNCTION public.send_campaign(p_campaign_id UUID)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_campaign communication_campaigns;
  v_settings communication_settings;
  v_audience JSONB;
  v_entries  JSONB := '[]'::JSONB;
  v_customer JSONB;
  v_count    INTEGER := 0;
BEGIN
  SELECT * INTO v_campaign FROM communication_campaigns WHERE id = p_campaign_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Campaign not found'); END IF;
  SELECT * INTO v_settings FROM communication_settings WHERE brand_id = v_campaign.brand_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'No communication settings for brand'); END IF;
  v_audience := preview_campaign_audience(v_campaign.brand_id, v_campaign.audience_rules);
  FOR v_customer IN SELECT * FROM jsonb_array_elements(coalesce(v_audience->'sample_customers', '[]'::jsonb))
  LOOP
    v_entries := v_entries || jsonb_build_array(jsonb_build_object(
      'brand_id', v_campaign.brand_id, 'campaign_id', p_campaign_id,
      'customer_id', v_customer->>'id', 'customer_email', v_customer->>'email',
      'delivery_method', 'email', 'subject', v_campaign.subject,
      'body_preview', left(v_campaign.body_text, 500), 'status', 'queued'
    ));
    v_count := v_count + 1;
  END LOOP;
  PERFORM log_communication_messages(v_entries);
  UPDATE communication_campaigns SET status = 'sent', sent_at = now(), updated_at = now()
  WHERE id = p_campaign_id;
  RETURN jsonb_build_object('success', true, 'messages_logged', v_count);
END;
$$;

DROP FUNCTION IF EXISTS public.get_communication_campaigns(UUID);
CREATE OR REPLACE FUNCTION public.get_communication_campaigns(p_brand_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_campaigns JSONB;
BEGIN
  IF p_brand_id IS NULL THEN
    SELECT COALESCE(jsonb_agg(c ORDER BY c.created_at DESC), '[]'::JSONB) INTO v_campaigns FROM communication_campaigns c;
  ELSE
    SELECT COALESCE(jsonb_agg(c ORDER BY c.created_at DESC), '[]'::JSONB) INTO v_campaigns
    FROM communication_campaigns c WHERE c.brand_id = p_brand_id;
  END IF;
  RETURN jsonb_build_object('campaigns', v_campaigns);
END;
$$;

DROP FUNCTION IF EXISTS public.get_communication_campaign_by_id(UUID);
CREATE OR REPLACE FUNCTION public.get_communication_campaign_by_id(p_campaign_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_campaign communication_campaigns%ROWTYPE;
BEGIN
  SELECT * INTO v_campaign FROM communication_campaigns WHERE id = p_campaign_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('campaign', NULL); END IF;
  RETURN jsonb_build_object('campaign', row_to_json(v_campaign));
END;
$$;

DROP FUNCTION IF EXISTS public.get_communication_templates(UUID);
CREATE OR REPLACE FUNCTION public.get_communication_templates(p_brand_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_templates JSONB;
BEGIN
  IF p_brand_id IS NULL THEN
    SELECT COALESCE(jsonb_agg(t ORDER BY t.name), '[]'::JSONB) INTO v_templates FROM communication_templates t;
  ELSE
    SELECT COALESCE(jsonb_agg(t ORDER BY t.name), '[]'::JSONB) INTO v_templates
    FROM communication_templates t WHERE t.brand_id = p_brand_id;
  END IF;
  RETURN jsonb_build_object('templates', v_templates);
END;
$$;

DROP FUNCTION IF EXISTS public.get_communication_settings(UUID);
CREATE OR REPLACE FUNCTION public.get_communication_settings(p_brand_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_settings communication_settings%ROWTYPE;
BEGIN
  SELECT * INTO v_settings FROM communication_settings WHERE brand_id = p_brand_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('settings', NULL); END IF;
  RETURN jsonb_build_object('settings', row_to_json(v_settings));
END;
$$;

DROP FUNCTION IF EXISTS public.get_message_logs(UUID, UUID, TEXT, INTEGER);
CREATE OR REPLACE FUNCTION public.get_message_logs(
  p_brand_id    UUID,
  p_campaign_id UUID DEFAULT NULL,
  p_status      TEXT DEFAULT NULL,
  p_limit       INTEGER DEFAULT 100
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_logs JSONB;
BEGIN
  SELECT COALESCE(jsonb_agg(l ORDER BY l.created_at DESC), '[]'::JSONB) INTO v_logs
  FROM (
    SELECT l.* FROM communication_message_logs l
    WHERE (p_brand_id IS NULL OR l.brand_id = p_brand_id)
      AND (p_campaign_id IS NULL OR l.campaign_id = p_campaign_id)
      AND (p_status IS NULL OR l.status = p_status)
    ORDER BY l.created_at DESC LIMIT p_limit
  ) l;
  RETURN jsonb_build_object('logs', v_logs);
END;
$$;

DROP FUNCTION IF EXISTS public.delete_communication_campaign(UUID);
CREATE OR REPLACE FUNCTION public.delete_communication_campaign(p_campaign_id UUID)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE communication_campaigns SET status = 'canceled', updated_at = now()
  WHERE id = p_campaign_id;
  RETURN FOUND;
END;
$$;

NOTIFY pgrst, 'reload schema';