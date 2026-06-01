-- Time Tracking Phase 2: Pay Period + Overtime Settings

-- ── Settings Table ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS time_tracking_settings (
  id                          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id                    UUID REFERENCES brands(id) ON DELETE CASCADE UNIQUE NOT NULL,
  pay_period_start_day        INT NOT NULL DEFAULT 0,  -- 0=Sun, 1=Mon, ... 6=Sat
  pay_period_length_days     INT NOT NULL DEFAULT 7,
  daily_overtime_threshold    NUMERIC(5,2) NOT NULL DEFAULT 8.0,  -- hours
  weekly_overtime_threshold   NUMERIC(5,2) NOT NULL DEFAULT 40.0, -- hours
  overtime_multiplier         NUMERIC(3,2) NOT NULL DEFAULT 1.50,
  overtime_notifications      BOOLEAN NOT NULL DEFAULT true,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE time_tracking_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Time tracking settings readable by authenticated" ON time_tracking_settings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Time tracking settings writable by postgres" ON time_tracking_settings
  FOR ALL TO postgres USING (true);

-- ── RPCs ───────────────────────────────────────────────────────────────────────

-- Get or init time tracking settings for a brand
CREATE OR REPLACE FUNCTION get_time_tracking_settings(p_brand_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s time_tracking_settings%ROWTYPE;
BEGIN
  SELECT * INTO s FROM time_tracking_settings WHERE brand_id = p_brand_id;
  IF s IS NULL THEN
    INSERT INTO time_tracking_settings (brand_id) VALUES (p_brand_id)
    RETURNING * INTO s;
  END IF;
  RETURN jsonb_build_object(
    'id', s.id,
    'brand_id', s.brand_id,
    'pay_period_start_day', s.pay_period_start_day,
    'pay_period_length_days', s.pay_period_length_days,
    'daily_overtime_threshold', s.daily_overtime_threshold,
    'weekly_overtime_threshold', s.weekly_overtime_threshold,
    'overtime_multiplier', s.overtime_multiplier,
    'overtime_notifications', s.overtime_notifications
  );
END;
$$;

-- Update time tracking settings
CREATE OR REPLACE FUNCTION update_time_tracking_settings(
  p_brand_id               UUID,
  p_pay_period_start_day   INT,
  p_pay_period_length_days INT,
  p_daily_threshold        NUMERIC(5,2),
  p_weekly_threshold       NUMERIC(5,2),
  p_overtime_multiplier    NUMERIC(3,2),
  p_overtime_notifications BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE time_tracking_settings
  SET pay_period_start_day     = p_pay_period_start_day,
      pay_period_length_days  = p_pay_period_length_days,
      daily_overtime_threshold  = p_daily_threshold,
      weekly_overtime_threshold = p_weekly_threshold,
      overtime_multiplier      = p_overtime_multiplier,
      overtime_notifications   = p_overtime_notifications,
      updated_at               = now()
  WHERE brand_id = p_brand_id;
  RETURN jsonb_build_object('success', true);
END;
$$;

-- Get worker's hours for current pay period with overtime flags
-- Returns: total_minutes, total_hours, daily_hours (today), weekly_hours (current week),
--          daily_overtime (bool), weekly_overtime (bool)
CREATE OR REPLACE FUNCTION get_worker_pay_period_hours(
  p_brand_id              UUID,
  p_worker_id             UUID,
  p_pay_period_start_day  INT DEFAULT 0,
  p_pay_period_length     INT DEFAULT 7
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  now_ts         TIMESTAMPTZ := now();
  week_start     TIMESTAMPTZ;
  period_start   TIMESTAMPTZ;
  period_end     TIMESTAMPTZ;
  today_start    TIMESTAMPTZ;
  today_end      TIMESTAMPTZ;
  total_mins     INT := 0;
  today_mins     INT := 0;
  week_mins      INT := 0;
  settings_rec   time_tracking_settings%ROWTYPE;
  daily_flag     BOOLEAN := false;
  weekly_flag    BOOLEAN := false;
BEGIN
  -- Get settings (use defaults if not found)
  SELECT * INTO settings_rec FROM time_tracking_settings WHERE brand_id = p_brand_id;
  IF settings_rec IS NOT NULL THEN
    p_pay_period_start_day := settings_rec.pay_period_start_day;
    p_pay_period_length   := settings_rec.pay_period_length_days;
  END IF;

  -- Compute week start (Sunday or Monday based on p_pay_period_start_day)
  week_start := date_trunc('week', now_ts)::TIMESTAMPTZ;
  -- Adjust if pay period starts on Monday (1)
  IF p_pay_period_start_day = 1 THEN
    week_start := (date_trunc('week', now_ts) + INTERVAL '1 day')::TIMESTAMPTZ;
  END IF;

  -- Compute pay period boundaries
  -- Period is p_pay_period_length days before now, aligned to week start + n * period_length
  period_end := now_ts;
  period_start := (now_ts - (p_pay_period_length || ' days')::INTERVAL)::TIMESTAMPTZ;

  -- Today boundaries
  today_start := (date_trunc('day', now_ts))::TIMESTAMPTZ;
  today_end   := (date_trunc('day', now_ts) + INTERVAL '1 day')::TIMESTAMPTZ;

  -- Total hours in pay period for this worker
  SELECT COALESCE(SUM(
    LEAST(GREATEST(0, EXTRACT(EPOCH FROM (COALESCE(l.clock_out, now_ts) - l.clock_in))::INT / 60 - l.lunch_break_minutes), 1440)
  ), 0)::INT
  INTO total_mins
  FROM worker_time_logs l
  WHERE l.worker_id = p_worker_id
    AND l.clock_in >= period_start AND l.clock_in <= period_end;

  -- Today's hours
  SELECT COALESCE(SUM(
    LEAST(GREATEST(0, EXTRACT(EPOCH FROM (COALESCE(l.clock_out, now_ts) - l.clock_in))::INT / 60 - l.lunch_break_minutes), 1440)
  ), 0)::INT
  INTO today_mins
  FROM worker_time_logs l
  WHERE l.worker_id = p_worker_id
    AND l.clock_in >= today_start AND l.clock_in < today_end;

  -- Current week hours
  SELECT COALESCE(SUM(
    LEAST(GREATEST(0, EXTRACT(EPOCH FROM (COALESCE(l.clock_out, now_ts) - l.clock_in))::INT / 60 - l.lunch_break_minutes), 1440)
  ), 0)::INT
  INTO week_mins
  FROM worker_time_logs l
  WHERE l.worker_id = p_worker_id
    AND l.clock_in >= week_start;

  -- Check overtime thresholds (using settings or defaults)
  IF settings_rec IS NOT NULL THEN
    daily_flag   := (today_mins / 60.0) >= settings_rec.daily_overtime_threshold;
    weekly_flag  := (week_mins / 60.0) >= settings_rec.weekly_overtime_threshold;
  ELSE
    daily_flag   := (today_mins / 60.0) >= 8.0;
    weekly_flag  := (week_mins / 60.0) >= 40.0;
  END IF;

  RETURN jsonb_build_object(
    'success',           true,
    'total_minutes',     total_mins,
    'total_hours',       (total_mins / 60.0)::NUMERIC(6,2),
    'daily_minutes',     today_mins,
    'daily_hours',       (today_mins / 60.0)::NUMERIC(6,2),
    'weekly_minutes',    week_mins,
    'weekly_hours',      (week_mins / 60.0)::NUMERIC(6,2),
    'daily_overtime',    daily_flag,
    'weekly_overtime',   weekly_flag,
    'period_start',      period_start,
    'period_end',        period_end
  );
END;
$$;