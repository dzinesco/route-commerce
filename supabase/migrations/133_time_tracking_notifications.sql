-- Migration 133: Time Tracking Overtime Notification System
-- Adds notification recipient config, alert thresholds, and audit log

BEGIN;

-- ── Expand time_tracking_settings ──────────────────────────────────────────

ALTER TABLE time_tracking_settings
  ADD COLUMN IF NOT EXISTS notification_emails    TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS notification_sms_numbers TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS enable_daily_alerts    BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS enable_weekly_alerts    BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS daily_alert_threshold   NUMERIC(5,2) NOT NULL DEFAULT 0.80,  -- 80%
  ADD COLUMN IF NOT EXISTS weekly_alert_threshold  NUMERIC(5,2) NOT NULL DEFAULT 0.80,  -- 80%
  ADD COLUMN IF NOT EXISTS send_end_of_period_summary BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS brand_name              TEXT NOT NULL DEFAULT 'Farm';

COMMENT ON COLUMN time_tracking_settings.notification_emails IS 'Email addresses to send overtime alerts to';
COMMENT ON COLUMN time_tracking_settings.notification_sms_numbers IS 'Phone numbers to send SMS alerts to (E.164 format)';
COMMENT ON COLUMN time_tracking_settings.daily_alert_threshold IS 'Send alert when daily hours reach this fraction of threshold (0.80 = 80%)';
COMMENT ON COLUMN time_tracking_settings.weekly_alert_threshold IS 'Send alert when weekly hours reach this fraction of threshold (0.80 = 80%)';
COMMENT ON COLUMN time_tracking_settings.brand_name IS 'Display name used in notification emails';

-- ── Notification audit log ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS time_tracking_notification_log (
  id              UUID NOT NULL DEFAULT gen_random_uuid(),
  brand_id        UUID NOT NULL,
  worker_id       UUID,
  worker_name     TEXT,
  trigger_type    TEXT NOT NULL CHECK (trigger_type IN (
    'daily_approaching','daily_reached',
    'weekly_approaching','weekly_reached',
    'end_of_period_summary'
  )),
  threshold_hours NUMERIC(8,2),
  actual_hours    NUMERIC(8,2),
  emails_sent     TEXT[] NOT NULL DEFAULT '{}',
  sms_numbers_sent TEXT[] NOT NULL DEFAULT '{}',
  email_sent      BOOLEAN NOT NULL DEFAULT false,
  sms_sent        BOOLEAN NOT NULL DEFAULT false,
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE time_tracking_notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Notification log readable by authenticated"
  ON time_tracking_notification_log FOR SELECT
  USING (true);

CREATE POLICY "Notification log writable by postgres"
  ON time_tracking_notification_log FOR ALL
  USING (true);

-- ── RPC: get_notification_log ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_time_tracking_notification_log(
  p_brand_id UUID,
  p_limit    INTEGER DEFAULT 100
)
RETURNS TABLE (
  id              UUID,
  worker_id       UUID,
  worker_name     TEXT,
  trigger_type    TEXT,
  threshold_hours NUMERIC(8,2),
  actual_hours    NUMERIC(8,2),
  emails_sent     TEXT[],
  sms_numbers_sent TEXT[],
  email_sent      BOOLEAN,
  sms_sent        BOOLEAN,
  error_message   TEXT,
  created_at      TIMESTAMPTZ
)
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    nl.id, nl.worker_id, nl.worker_name, nl.trigger_type,
    nl.threshold_hours, nl.actual_hours,
    nl.emails_sent, nl.sms_numbers_sent,
    nl.email_sent, nl.sms_sent, nl.error_message, nl.created_at
  FROM time_tracking_notification_log nl
  WHERE nl.brand_id = p_brand_id
  ORDER BY nl.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ── RPC: check_and_notify_overtime ────────────────────────────────────────
-- Call this after a worker clocks in or out.
-- Returns: { sent: boolean, triggers: text[], message: text }

CREATE OR REPLACE FUNCTION check_and_notify_overtime(
  p_brand_id      UUID,
  p_worker_id     UUID,
  p_worker_name   TEXT,
  p_daily_hours   NUMERIC(8,2),
  p_weekly_hours  NUMERIC(8,2)
)
RETURNS TABLE (sent BOOLEAN, trigger_type TEXT, message TEXT)
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  settings_rec  time_tracking_settings%ROWTYPE;
  triggered     TEXT[];
  email_body    TEXT;
  sms_body      TEXT;
  emails_arr    TEXT[];
  sms_arr       TEXT[];
  threshold_hrs NUMERIC(8,2);
  actual_hrs    NUMERIC(8,2);
  notify_err    TEXT;
BEGIN
  -- Fetch settings (create default if missing)
  SELECT * INTO settings_rec FROM time_tracking_settings WHERE brand_id = p_brand_id;
  IF NOT FOUND THEN
    INSERT INTO time_tracking_settings (brand_id) VALUES (p_brand_id)
    RETURNING * INTO settings_rec;
  END IF;

  -- Nothing to do if notifications disabled
  IF NOT settings_rec.overtime_notifications THEN
    RETURN QUERY SELECT false, ''::TEXT, 'notifications disabled'::TEXT;
    RETURN;
  END IF;

  triggered := ARRAY[]::TEXT[];

  -- ── Daily threshold check ────────────────────────────────────────────
  IF settings_rec.enable_daily_alerts AND p_daily_hours > 0 THEN
    threshold_hrs := settings_rec.daily_overtime_threshold;
    actual_hrs    := p_daily_hours;

    -- Reached daily overtime
    IF actual_hrs >= threshold_hrs THEN
      triggered := array_append(triggered, 'daily_reached');
    -- Approaching daily overtime (above threshold * daily_alert_threshold)
    ELSIF actual_hrs >= (threshold_hrs * settings_rec.daily_alert_threshold) THEN
      triggered := array_append(triggered, 'daily_approaching');
    END IF;
  END IF;

  -- ── Weekly threshold check ───────────────────────────────────────────
  IF settings_rec.enable_weekly_alerts AND p_weekly_hours > 0 THEN
    threshold_hrs := settings_rec.weekly_overtime_threshold;
    actual_hrs    := p_weekly_hours;

    IF actual_hrs >= threshold_hrs THEN
      triggered := array_append(triggered, 'weekly_reached');
    ELSIF actual_hrs >= (threshold_hrs * settings_rec.weekly_alert_threshold) THEN
      triggered := array_append(triggered, 'weekly_approaching');
    END IF;
  END IF;

  -- Nothing triggered
  IF array_length(triggered, 1) IS NULL THEN
    RETURN QUERY SELECT false, ''::TEXT, 'no trigger'::TEXT;
    RETURN;
  END IF;

  -- ── Send notifications ─────────────────────────────────────────────────
  emails_arr := COALESCE(settings_rec.notification_emails, ARRAY[]::TEXT[]);
  sms_arr    := COALESCE(settings_rec.notification_sms_numbers, ARRAY[]::TEXT[]);

  -- Build email body
  email_body := format(
    'Time Tracking Alert — %s\n\nWorker: %s\nBrand: %s\n\nAlerts triggered:\n%s\n\nDaily hours: %.1f / %.1f threshold\nWeekly hours: %.1f / %.1f threshold\n\nLog in to view: %s',
    settings_rec.brand_name,
    p_worker_name,
    settings_rec.brand_name,
    array_to_string(triggered, E'\n'),
    p_daily_hours, settings_rec.daily_overtime_threshold,
    p_weekly_hours, settings_rec.weekly_overtime_threshold,
    'https://route-commerce-platform.vercel.app/admin/time-tracking'
  );

  -- Log entry (we do notification sending via app layer, so just record triggers)
  INSERT INTO time_tracking_notification_log
    (brand_id, worker_id, worker_name, trigger_type, threshold_hours, actual_hours, emails_sent, sms_numbers_sent, email_sent, sms_sent)
  VALUES
    (p_brand_id, p_worker_id, p_worker_name, triggered[1],
     CASE triggered[1]
       WHEN 'daily_reached'    THEN settings_rec.daily_overtime_threshold
       WHEN 'daily_approaching' THEN settings_rec.daily_overtime_threshold
       WHEN 'weekly_reached'    THEN settings_rec.weekly_overtime_threshold
       WHEN 'weekly_approaching' THEN settings_rec.weekly_overtime_threshold
       ELSE NULL
     END,
     actual_hrs,
     emails_arr, sms_arr,
     false, false);  -- email/sms sent tracked by app layer after Resend/Twilio calls

  RETURN QUERY SELECT true, triggered[1], email_body::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ── RPC: send_end_of_period_notification ───────────────────────────────────

CREATE OR REPLACE FUNCTION send_time_tracking_period_summary(
  p_brand_id UUID
)
RETURNS TABLE (sent BOOLEAN, recipient TEXT, message TEXT)
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  settings_rec  time_tracking_settings%ROWTYPE;
  emails_arr    TEXT[];
  brand_name    TEXT;
  summary_html  TEXT;
  period_start  DATE;
  period_end    DATE;
  total_hrs     NUMERIC(10,2);
  worker_count  INTEGER;
BEGIN
  SELECT * INTO settings_rec FROM time_tracking_settings WHERE brand_id = p_brand_id;
  IF NOT FOUND OR NOT settings_rec.send_end_of_period_summary THEN
    RETURN QUERY SELECT false, ''::TEXT, 'disabled or not found'::TEXT;
    RETURN;
  END IF;

  emails_arr := COALESCE(settings_rec.notification_emails, ARRAY[]::TEXT[]);
  IF array_length(emails_arr, 1) IS NULL THEN
    RETURN QUERY SELECT false, ''::TEXT, 'no recipients'::TEXT;
    RETURN;
  END IF;

  -- Compute pay period bounds
  period_end   := current_date;
  period_start := period_end - (settings_rec.pay_period_length_days - 1)::INTEGER;

  -- Get total hours from worker_time_logs in period
  SELECT COALESCE(SUM(total_minutes), 0) / 60.0 INTO total_hrs
  FROM worker_time_logs wl
  JOIN time_tracking_workers w ON w.id = wl.worker_id
  WHERE w.brand_id = p_brand_id
    AND wl.clock_in >= period_start
    AND wl.clock_in < period_end + 1;

  SELECT COUNT(DISTINCT wl.worker_id) INTO worker_count
  FROM worker_time_logs wl
  JOIN time_tracking_workers w ON w.id = wl.worker_id
  WHERE w.brand_id = p_brand_id
    AND wl.clock_in >= period_start
    AND wl.clock_in < period_end + 1;

  -- Log the notification
  INSERT INTO time_tracking_notification_log
    (brand_id, trigger_type, threshold_hours, actual_hours, emails_sent, email_sent)
  VALUES
    (p_brand_id, 'end_of_period_summary',
     total_hrs, NULL,
     emails_arr, false);

  RETURN QUERY SELECT true, emails_arr[1], format(
    'Pay Period Summary: %s — %s\nTotal hours: %s\nWorkers active: %s',
    period_start, period_end, total_hrs, worker_count
  )::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ── Update get_time_tracking_settings to include new columns ───────────────

CREATE OR REPLACE FUNCTION get_time_tracking_settings(p_brand_id UUID)
RETURNS TABLE (
  id                       UUID,
  brand_id                 UUID,
  pay_period_start_day     INTEGER,
  pay_period_length_days   INTEGER,
  daily_overtime_threshold NUMERIC(5,2),
  weekly_overtime_threshold NUMERIC(5,2),
  overtime_multiplier      NUMERIC(4,2),
  overtime_notifications   BOOLEAN,
  notification_emails      TEXT[],
  notification_sms_numbers TEXT[],
  enable_daily_alerts      BOOLEAN,
  enable_weekly_alerts     BOOLEAN,
  daily_alert_threshold    NUMERIC(5,2),
  weekly_alert_threshold    NUMERIC(5,2),
  send_end_of_period_summary BOOLEAN,
  brand_name               TEXT,
  created_at               TIMESTAMPTZ,
  updated_at               TIMESTAMPTZ
)
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.brand_id, s.pay_period_start_day, s.pay_period_length_days,
         s.daily_overtime_threshold, s.weekly_overtime_threshold,
         s.overtime_multiplier, s.overtime_notifications,
         s.notification_emails, s.notification_sms_numbers,
         s.enable_daily_alerts, s.enable_weekly_alerts,
         s.daily_alert_threshold, s.weekly_alert_threshold,
         s.send_end_of_period_summary, s.brand_name,
         s.created_at, s.updated_at
  FROM time_tracking_settings s WHERE s.brand_id = p_brand_id;
END;
$$ LANGUAGE plpgsql;

-- ── Update update_time_tracking_settings to handle new columns ─────────────

CREATE OR REPLACE FUNCTION update_time_tracking_settings(
  p_brand_id                   UUID,
  p_pay_period_start_day       INTEGER,
  p_pay_period_length_days     INTEGER,
  p_daily_threshold            NUMERIC(5,2),
  p_weekly_threshold           NUMERIC(5,2),
  p_overtime_multiplier        NUMERIC(4,2),
  p_overtime_notifications     BOOLEAN,
  p_notification_emails        TEXT[] DEFAULT NULL,
  p_notification_sms_numbers   TEXT[] DEFAULT NULL,
  p_enable_daily_alerts        BOOLEAN DEFAULT NULL,
  p_enable_weekly_alerts        BOOLEAN DEFAULT NULL,
  p_daily_alert_threshold      NUMERIC(5,2) DEFAULT NULL,
  p_weekly_alert_threshold     NUMERIC(5,2) DEFAULT NULL,
  p_send_end_of_period_summary BOOLEAN DEFAULT NULL,
  p_brand_name                 TEXT DEFAULT NULL
)
RETURNS BOOLEAN
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE time_tracking_settings
  SET
    pay_period_start_day         = p_pay_period_start_day,
    pay_period_length_days       = p_pay_period_length_days,
    daily_overtime_threshold     = p_daily_threshold,
    weekly_overtime_threshold    = p_weekly_threshold,
    overtime_multiplier          = p_overtime_multiplier,
    overtime_notifications       = p_overtime_notifications,
    notification_emails          = COALESCE(p_notification_emails, notification_emails),
    notification_sms_numbers     = COALESCE(p_notification_sms_numbers, notification_sms_numbers),
    enable_daily_alerts          = COALESCE(p_enable_daily_alerts, enable_daily_alerts),
    enable_weekly_alerts          = COALESCE(p_enable_weekly_alerts, enable_weekly_alerts),
    daily_alert_threshold        = COALESCE(p_daily_alert_threshold, daily_alert_threshold),
    weekly_alert_threshold       = COALESCE(p_weekly_alert_threshold, weekly_alert_threshold),
    send_end_of_period_summary   = COALESCE(p_send_end_of_period_summary, send_end_of_period_summary),
    brand_name                   = COALESCE(p_brand_name, brand_name),
    updated_at                   = now()
  WHERE brand_id = p_brand_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql;

COMMIT;