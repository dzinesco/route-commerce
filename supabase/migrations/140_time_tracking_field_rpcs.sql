-- verify_time_tracking_pin RPC
-- Looks up worker by brand_id + pin, creates a session token, returns worker info
CREATE OR REPLACE FUNCTION verify_time_tracking_pin(
  p_brand_id uuid,
  p_pin text
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_worker time_tracking_workers%ROWTYPE;
  v_session_id text;
  v_expires_at timestamptz;
BEGIN
  SELECT * INTO v_worker
  FROM time_tracking_workers
  WHERE brand_id = p_brand_id AND pin = p_pin AND active = true
  LIMIT 1;

  IF v_worker IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid PIN');
  END IF;

  -- Update last_used_at
  UPDATE time_tracking_workers SET last_used_at = now() WHERE id = v_worker.id;

  -- Generate session
  v_session_id := gen_random_uuid()::text;
  v_expires_at := now() + interval '12 hours';

  RETURN json_build_object(
    'success', true,
    'worker_id', v_worker.id,
    'name', v_worker.name,
    'role', v_worker.role,
    'lang', v_worker.lang,
    'brand_id', v_worker.brand_id,
    'session_id', v_session_id,
    'expires_at', v_expires_at
  );
END;
$$;

-- clock_in_worker RPC
-- Creates a new time tracking log entry with clock_in set to now
CREATE OR REPLACE FUNCTION clock_in_worker(
  p_brand_id uuid,
  p_worker_id uuid,
  p_task_id uuid DEFAULT NULL,
  p_task_name text DEFAULT 'General Labor'
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_task_id uuid;
  v_log_id uuid;
BEGIN
  -- Resolve task_name to task_id if provided
  IF p_task_id IS NULL AND p_task_name IS NOT NULL THEN
    SELECT id INTO v_task_id FROM time_tracking_tasks WHERE brand_id = p_brand_id AND name = p_task_name LIMIT 1;
  ELSE
    v_task_id := p_task_id;
  END IF;

  -- Check for open clock-in
  IF EXISTS (
    SELECT 1 FROM time_tracking_logs
    WHERE worker_id = p_worker_id AND clock_out IS NULL
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Already clocked in');
  END IF;

  -- Create log entry
  INSERT INTO time_tracking_logs (brand_id, worker_id, task_id, clock_in, submitted_via)
  VALUES (p_brand_id, p_worker_id, v_task_id, now(), 'kiosk')
  RETURNING id INTO v_log_id;

  RETURN json_build_object(
    'success', true,
    'log_id', v_log_id,
    'clock_in', now()
  );
END;
$$;

-- clock_out_worker RPC
-- Closes the open clock-in for a worker, calculates total minutes
CREATE OR REPLACE FUNCTION clock_out_worker(
  p_worker_id uuid,
  p_lunch_minutes integer DEFAULT 0,
  p_notes text DEFAULT NULL
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log time_tracking_logs%ROWTYPE;
  v_total_minutes integer;
BEGIN
  -- Find open clock-in
  SELECT * INTO v_log
  FROM time_tracking_logs
  WHERE worker_id = p_worker_id AND clock_out IS NULL
  ORDER BY clock_in DESC
  LIMIT 1;

  IF v_log IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'No open clock-in found');
  END IF;

  -- Calculate total minutes (excluding lunch)
  v_total_minutes := (EXTRACT(EPOCH FROM (now() - v_log.clock_in))::integer / 60) - p_lunch_minutes;
  IF v_total_minutes < 0 THEN v_total_minutes := 0; END IF;

  -- Update log
  UPDATE time_tracking_logs
  SET clock_out = now(),
      lunch_break_minutes = p_lunch_minutes,
      notes = p_notes
  WHERE id = v_log.id;

  RETURN json_build_object(
    'success', true,
    'log_id', v_log.id,
    'clock_out', now(),
    'total_minutes', v_total_minutes
  );
END;
$$;

-- get_open_clock_in RPC
-- Returns the open clock-in for a worker if exists
CREATE OR REPLACE FUNCTION get_open_clock_in(
  p_worker_id uuid
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log time_tracking_logs%ROWTYPE;
  v_task_name text;
  v_elapsed integer;
BEGIN
  SELECT l.*, t.name AS task_name INTO v_log
  FROM time_tracking_logs l
  LEFT JOIN time_tracking_tasks t ON t.id = l.task_id
  WHERE l.worker_id = p_worker_id AND l.clock_out IS NULL
  ORDER BY l.clock_in DESC
  LIMIT 1;

  IF v_log IS NULL THEN
    RETURN json_build_object('success', true, 'open', false);
  END IF;

  v_elapsed := (EXTRACT(EPOCH FROM (now() - v_log.clock_in))::integer / 60);

  RETURN json_build_object(
    'success', true,
    'open', true,
    'log_id', v_log.id,
    'task_name', v_log.task_name,
    'clock_in', v_log.clock_in,
    'elapsed_minutes', v_elapsed
  );
END;
$$;

-- get_worker_pay_period_hours RPC
-- Calculates hours for current pay period (bi-weekly, starting from brand's pay_period_start)
CREATE OR REPLACE FUNCTION get_worker_pay_period_hours(
  p_brand_id uuid,
  p_worker_id uuid
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_period_start timestamptz;
  v_period_end timestamptz;
  v_total_minutes integer;
  v_daily_minutes integer;
  v_weekly_minutes integer;
BEGIN
  -- Default to bi-weekly from beginning of current month
  v_period_start := date_trunc('month', now()) + ((EXTRACT(DOW FROM date_trunc('month', now()))::integer + 6) % 7 || ' days')::interval;
  v_period_end := v_period_start + interval '13 days';

  -- If we're past end of period, roll forward
  WHILE v_period_end < now() LOOP
    v_period_start := v_period_start + interval '14 days';
    v_period_end := v_period_end + interval '14 days';
  END LOOP;

  -- Total minutes in period
  SELECT COALESCE(SUM(
    CASE
      WHEN clock_out IS NOT NULL THEN
        (EXTRACT(EPOCH FROM (clock_out - clock_in))::integer / 60) - lunch_break_minutes
      ELSE 0
    END
  ), 0) INTO v_total_minutes
  FROM time_tracking_logs
  WHERE worker_id = p_worker_id
    AND clock_in >= v_period_start
    AND clock_in <= v_period_end;

  -- Daily minutes (today)
  SELECT COALESCE(SUM(
    CASE
      WHEN clock_out IS NOT NULL THEN
        (EXTRACT(EPOCH FROM (clock_out - clock_in))::integer / 60) - lunch_break_minutes
      ELSE 0
    END
  ), 0) INTO v_daily_minutes
  FROM time_tracking_logs
  WHERE worker_id = p_worker_id
    AND clock_in >= date_trunc('day', now())
    AND clock_in < date_trunc('day', now()) + interval '1 day';

  -- Weekly minutes (current week starting Monday)
  SELECT COALESCE(SUM(
    CASE
      WHEN clock_out IS NOT NULL THEN
        (EXTRACT(EPOCH FROM (clock_out - clock_in))::integer / 60) - lunch_break_minutes
      ELSE 0
    END
  ), 0) INTO v_weekly_minutes
  FROM time_tracking_logs
  WHERE worker_id = p_worker_id
    AND clock_in >= date_trunc('week', now())
    AND clock_in < date_trunc('week', now()) + interval '7 days';

  RETURN json_build_object(
    'total_minutes', v_total_minutes,
    'total_hours', ROUND(v_total_minutes::numeric / 60, 2),
    'daily_minutes', v_daily_minutes,
    'daily_hours', ROUND(v_daily_minutes::numeric / 60, 2),
    'weekly_minutes', v_weekly_minutes,
    'weekly_hours', ROUND(v_weekly_minutes::numeric / 60, 2),
    'daily_overtime', v_daily_minutes > 720,
    'weekly_overtime', v_weekly_minutes > 3360,
    'period_start', v_period_start,
    'period_end', v_period_end
  );
END;
$$;

-- get_time_tracking_settings RPC
CREATE OR REPLACE FUNCTION get_time_tracking_settings(
  p_brand_id uuid
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Returns default settings; brand_settings integration can extend this later
  RETURN json_build_object(
    'pay_period_type', 'biweekly',
    'daily_overtime_threshold', 12,
    'weekly_overtime_threshold', 56
  );
END;
$$;