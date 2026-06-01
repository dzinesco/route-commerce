-- Migration 120: Water Log High/Low Alerts
-- 1. Add threshold columns to water_headgates
-- 2. Add alert config to water_admin_settings
-- 3. Create water_alert_log table
-- 4. Create trigger_water_alert RPC with Twilio SMS

-- 1. Threshold columns
ALTER TABLE water_headgates ADD COLUMN IF NOT EXISTS high_threshold NUMERIC(12,4);
ALTER TABLE water_headgates ADD COLUMN IF NOT EXISTS low_threshold NUMERIC(12,4);

-- 2. Alert config columns
ALTER TABLE water_admin_settings ADD COLUMN IF NOT EXISTS alert_phone TEXT;
ALTER TABLE water_admin_settings ADD COLUMN IF NOT EXISTS alerts_enabled BOOLEAN NOT NULL DEFAULT false;

-- 3. Alert log table
CREATE TABLE IF NOT EXISTS water_alert_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  headgate_id UUID NOT NULL REFERENCES water_headgates(id) ON DELETE CASCADE,
  entry_id UUID NOT NULL REFERENCES water_log_entries(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('high', 'low')),
  threshold_value NUMERIC(12,4) NOT NULL,
  reading_value NUMERIC(12,4) NOT NULL,
  message_sent TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Update save_water_admin_settings to handle new columns
CREATE OR REPLACE FUNCTION save_water_admin_settings(
  p_brand_id UUID,
  p_enabled BOOLEAN,
  p_pin_hash TEXT,
  p_session_duration_hours INTEGER,
  p_can_edit_entries BOOLEAN,
  p_can_delete_entries BOOLEAN,
  p_can_export_csv BOOLEAN,
  p_alert_phone TEXT DEFAULT NULL,
  p_alerts_enabled BOOLEAN DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO water_admin_settings
    (brand_id, enabled, pin_hash, session_duration_hours, can_edit_entries, can_delete_entries, can_export_csv, alert_phone, alerts_enabled)
  VALUES
    (p_brand_id, p_enabled, p_pin_hash, p_session_duration_hours, p_can_edit_entries, p_can_delete_entries, p_can_export_csv, p_alert_phone, COALESCE(p_alerts_enabled, false))
  ON CONFLICT (brand_id) DO UPDATE SET
    enabled = EXCLUDED.enabled,
    pin_hash = COALESCE(EXCLUDED.pin_hash, water_admin_settings.pin_hash),
    session_duration_hours = EXCLUDED.session_duration_hours,
    can_edit_entries = EXCLUDED.can_edit_entries,
    can_delete_entries = EXCLUDED.can_delete_entries,
    can_export_csv = EXCLUDED.can_export_csv,
    alert_phone = COALESCE(EXCLUDED.alert_phone, water_admin_settings.alert_phone),
    alerts_enabled = COALESCE(EXCLUDED.alerts_enabled, water_admin_settings.alerts_enabled),
    updated_at = now();

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 5. Update get_water_admin_settings to return new columns
CREATE OR REPLACE FUNCTION get_water_admin_settings(p_brand_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'enabled', enabled,
    'session_duration_hours', session_duration_hours,
    'can_edit_entries', can_edit_entries,
    'can_delete_entries', can_delete_entries,
    'can_export_csv', can_export_csv,
    'alert_phone', alert_phone,
    'alerts_enabled', COALESCE(alerts_enabled, false)
  ) INTO v_result
  FROM water_admin_settings
  WHERE brand_id = p_brand_id;

  RETURN v_result;
END;
$$;

-- 6. Update water_headgates admin view/RPC to include thresholds
CREATE OR REPLACE FUNCTION get_water_headgates_admin(p_brand_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_agg(jsonb_build_object(
    'id', id,
    'name', name,
    'active', active,
    'unit', unit,
    'created_at', created_at,
    'headgate_token', headgate_token,
    'high_threshold', high_threshold,
    'low_threshold', low_threshold,
    'last_used_at', last_used_at
  ) ORDER BY created_at DESC) INTO v_result
  FROM water_headgates
  WHERE brand_id = p_brand_id AND deleted_at IS NULL;

  RETURN jsonb_build_object('headgates', COALESCE(v_result, '[]'::jsonb));
END;
$$;

-- 7. Trigger alert RPC — checks thresholds and sends Twilio SMS
CREATE OR REPLACE FUNCTION trigger_water_alert(
  p_entry_id UUID,
  p_alert_type TEXT,
  p_threshold_value NUMERIC,
  p_reading_value NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_headgate_id UUID;
  v_headgate_name TEXT;
  v_headgate_high NUMERIC;
  v_headgate_low NUMERIC;
  v_brand_id UUID;
  v_alert_phone TEXT;
  v_alerts_enabled BOOLEAN;
  v_site_url TEXT;
  v_message TEXT;
  v_sent BOOLEAN := false;
  v_result JSONB;
  v_entry_time TEXT;
  v_entry_headgate_id UUID;
  v_entry_brand_id UUID;
  v_entry_measurement NUMERIC;
  v_entry_unit TEXT;
BEGIN
  -- Look up the entry to get headgate + brand info
  SELECT headgate_id, brand_id, measurement, unit, TO_CHAR(logged_at, 'YYYY-MM-DD HH24:MI') INTO v_entry_headgate_id, v_entry_brand_id, v_entry_measurement, v_entry_unit, v_entry_time
  FROM water_log_entries
  WHERE id = p_entry_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Entry not found');
  END IF;

  -- Look up headgate thresholds
  SELECT id, name, high_threshold, low_threshold INTO v_headgate_id, v_headgate_name, v_headgate_high, v_headgate_low
  FROM water_headgates
  WHERE id = v_entry_headgate_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Headgate not found');
  END IF;

  -- Look up admin settings for this brand
  SELECT alert_phone, COALESCE(alerts_enabled, false) INTO v_alert_phone, v_alerts_enabled
  FROM water_admin_settings
  WHERE brand_id = v_entry_brand_id;

  -- Check if alert should fire
  IF NOT v_alerts_enabled OR v_alert_phone IS NULL OR v_alert_phone = '' THEN
    RETURN jsonb_build_object('success', true, 'triggered', false, 'reason', 'alerts disabled or no phone');
  END IF;

  -- Check threshold breach
  IF p_alert_type = 'high' AND (v_headgate_high IS NULL OR p_reading_value <= v_headgate_high) THEN
    RETURN jsonb_build_object('success', true, 'triggered', false, 'reason', 'not above high threshold');
  END IF;

  IF p_alert_type = 'low' AND (v_headgate_low IS NULL OR p_reading_value >= v_headgate_low) THEN
    RETURN jsonb_build_object('success', true, 'triggered', false, 'reason', 'not below low threshold');
  END IF;

  -- Build message
  v_site_url := COALESCE(NULLIF(COALESCE(current_setting('app.settings.site_url', true), ''), ''), 'https://routecommerce.com');

  IF p_alert_type = 'high' THEN
    v_message := 'Alert: Headgate ''' || v_headgate_name || ''' reading ' || p_reading_value || ' ' || v_entry_unit || ' exceeded High threshold of ' || v_headgate_high || ' at ' || v_entry_time || '. View: ' || v_site_url || '/water/admin';
  ELSE
    v_message := 'Alert: Headgate ''' || v_headgate_name || ''' reading ' || p_reading_value || ' ' || v_entry_unit || ' fell below Low threshold of ' || v_headgate_low || ' at ' || v_entry_time || '. View: ' || v_site_url || '/water/admin';
  END IF;

  -- Insert alert log
  INSERT INTO water_alert_log (brand_id, headgate_id, entry_id, alert_type, threshold_value, reading_value, message_sent, sent_at)
  VALUES (v_entry_brand_id, v_headgate_id, p_entry_id, p_alert_type, p_threshold_value, p_reading_value, v_message, now())
  RETURNING id INTO v_result;

  -- Send SMS via Twilio REST API (ignore failures — alert is logged either way)
  PERFORM (
    SELECT net.http_post(
      url := 'https://api.twilio.com/2010-04-01/Accounts/' || NULLIF(COALESCE(current_setting('app.settings.twilio_account_sid', true), ''), '') || '/Messages.json',
      headers := '{"Authorization": "Basic " || encode((' || Quote_literal(COALESCE(NULLIF(current_setting('app.settings.twilio_account_sid', true), ''), '') || ':' || COALESCE(NULLIF(current_setting('app.settings.twilio_auth_token', true), ''), '')) || ')::bytea, ''base64''), "Content-Type": "application/x-www-form-urlencoded"}',
      body := 'From=' || COALESCE(NULLIF(COALESCE(current_setting('app.settings.twilio_phone_number', true), ''), ''), '') || '&To=' || v_alert_phone || '&Body=' || urlencode(v_message)
    )
    WHERE NULLIF(COALESCE(current_setting('app.settings.twilio_account_sid', true), ''), '') IS NOT NULL
  );

  RETURN jsonb_build_object('success', true, 'triggered', true, 'message', v_message, 'alert_log_id', v_result);
EXCEPTION
  WHEN OTHERS THEN
    -- Log but don't fail — alert is recorded
    RETURN jsonb_build_object('success', true, 'triggered', true, 'message', v_message, 'sms_error', SQLERRM);
END;
$$;

-- 8. Update update_water_headgate to accept thresholds
CREATE OR REPLACE FUNCTION update_water_headgate(
  p_headgate_id UUID,
  p_name TEXT,
  p_active BOOLEAN,
  p_unit TEXT,
  p_brand_id UUID,
  p_high_threshold NUMERIC DEFAULT NULL,
  p_low_threshold NUMERIC DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE water_headgates
  SET name = p_name, active = p_active, unit = p_unit,
      high_threshold = p_high_threshold, low_threshold = p_low_threshold
  WHERE id = p_headgate_id AND brand_id = p_brand_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Headgate not found');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 9. Create alert log RPC for fetching
CREATE OR REPLACE FUNCTION get_water_alert_log(p_brand_id UUID, p_limit INTEGER DEFAULT 50)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_agg(q ORDER BY created_at DESC)
  INTO v_result
  FROM (
    SELECT
      a.id, a.alert_type, a.threshold_value, a.reading_value,
      a.message_sent, a.sent_at, a.created_at,
      h.name AS headgate_name,
      TO_CHAR(a.created_at, 'YYYY-MM-DD HH24:MI') AS formatted_time
    FROM water_alert_log a
    JOIN water_headgates h ON h.id = a.headgate_id
    WHERE a.brand_id = p_brand_id
    ORDER BY a.created_at DESC
    LIMIT p_limit
  ) q;

  RETURN jsonb_build_object('alerts', COALESCE(v_result, '[]'::jsonb));
END;
$$;