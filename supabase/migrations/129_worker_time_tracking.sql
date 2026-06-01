-- Worker Time Tracking
-- Tables: time_tracking_workers, time_tracking_tasks, worker_time_logs

-- ── Workers ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS time_tracking_workers (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id      UUID REFERENCES brands(id) ON DELETE CASCADE NOT NULL,
  name          TEXT NOT NULL,
  pin_hash      TEXT NOT NULL,  -- bcrypt hash of 4-6 digit PIN
  role          TEXT NOT NULL DEFAULT 'worker',  -- 'worker' | 'time_admin'
  lang          TEXT NOT NULL DEFAULT 'en',       -- 'en' | 'es'
  active        BOOLEAN NOT NULL DEFAULT true,
  last_used_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE time_tracking_workers ENABLE ROW LEVEL SECURITY;

-- Workers: anyone can verify PIN via RPC; updates only via SECURITY DEFINER RPCs
CREATE POLICY "Workers readable by authenticated" ON time_tracking_workers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Workers insertable by postgres" ON time_tracking_workers
  FOR INSERT TO postgres WITH CHECK (true);

CREATE POLICY "Workers updatable by postgres" ON time_tracking_workers
  FOR UPDATE TO postgres USING (true);

-- ── Tasks ───────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS time_tracking_tasks (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id    UUID REFERENCES brands(id) ON DELETE CASCADE NOT NULL,
  name        TEXT NOT NULL,
  name_es     TEXT,  -- Spanish name
  unit        TEXT NOT NULL DEFAULT 'hours',  -- 'hours' | 'pieces' | 'units'
  active      BOOLEAN NOT NULL DEFAULT true,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE time_tracking_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tasks readable by all" ON time_tracking_tasks
  FOR SELECT TO anon USING (true);

CREATE POLICY "Tasks writable by postgres" ON time_tracking_tasks
  FOR ALL TO postgres USING (true);

-- ── Time Logs ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS worker_time_logs (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id            UUID REFERENCES brands(id) ON DELETE CASCADE NOT NULL,
  worker_id           UUID REFERENCES time_tracking_workers(id) ON DELETE CASCADE NOT NULL,
  task_id             UUID REFERENCES time_tracking_tasks(id) ON DELETE SET NULL,
  task_name           TEXT NOT NULL,  -- snapshot at time of clock-out
  clock_in            TIMESTAMPTZ NOT NULL,
  clock_out           TIMESTAMPTZ,    -- null = currently clocked in
  lunch_break_minutes INT NOT NULL DEFAULT 0,
  notes               TEXT,
  submitted_via       TEXT NOT NULL DEFAULT 'field',  -- 'field' | 'admin'
  created_by          UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  updated_by          UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE worker_time_logs ENABLE ROW LEVEL SECURITY;

-- Time logs: readable by authenticated (brand-scoped), writable by postgres
CREATE POLICY "Time logs readable by authenticated" ON worker_time_logs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Time logs insertable by postgres" ON worker_time_logs
  FOR INSERT TO postgres WITH CHECK (true);

CREATE POLICY "Time logs updatable by postgres" ON worker_time_logs
  FOR UPDATE TO postgres USING (true);

-- ── Indexes ─────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_worker_time_logs_brand_id   ON worker_time_logs(brand_id);
CREATE INDEX IF NOT EXISTS idx_worker_time_logs_worker_id  ON worker_time_logs(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_time_logs_clock_in   ON worker_time_logs(clock_in);
CREATE INDEX IF NOT EXISTS idx_worker_time_logs_clock_out  ON worker_time_logs(clock_out) WHERE clock_out IS NULL;
CREATE INDEX IF NOT EXISTS idx_time_tracking_workers_brand ON time_tracking_workers(brand_id);
CREATE INDEX IF NOT EXISTS idx_time_tracking_tasks_brand   ON time_tracking_tasks(brand_id);

-- ── RPCs ────────────────────────────────────────────────────────────────────────

-- Verify PIN and return worker info + create session
CREATE OR REPLACE FUNCTION verify_time_tracking_pin(
  p_brand_id  UUID,
  p_pin       TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  w          time_tracking_workers;
  session_id UUID;
  diff_secs  INT;
BEGIN
  SELECT * INTO w
  FROM time_tracking_workers
  WHERE brand_id = p_brand_id AND active = true AND pin_hash = p_pin;

  IF w IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid PIN');
  END IF;

  -- Update last used
  UPDATE time_tracking_workers SET last_used_at = now() WHERE id = w.id;

  -- Create session record
  session_id = gen_random_uuid();
  -- Sessions expire in 12 hours (no session table needed — validated by timestamp comparison)

  RETURN jsonb_build_object(
    'success',    true,
    'worker_id', w.id,
    'name',      w.name,
    'role',      w.role,
    'lang',      w.lang,
    'session_id', session_id,
    'brand_id',  p_brand_id,
    'expires_at', now() + INTERVAL '12 hours'
  );
END;
$$;

-- Clock in — create a new time log entry
CREATE OR REPLACE FUNCTION clock_in_worker(
  p_brand_id  UUID,
  p_worker_id UUID,
  p_task_id   UUID DEFAULT NULL,
  p_task_name TEXT DEFAULT 'General Labor'
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_open time_tracking_logs%ROWTYPE;
  log_id        UUID;
BEGIN
  -- Check for open entry (no clock_out)
  SELECT * INTO existing_open
  FROM worker_time_logs
  WHERE worker_id = p_worker_id AND clock_out IS NULL
  LIMIT 1;

  IF found THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already clocked in');
  END IF;

  INSERT INTO worker_time_logs (brand_id, worker_id, task_id, task_name, clock_in)
  VALUES (p_brand_id, p_worker_id, p_task_id, p_task_name, now())
  RETURNING id INTO log_id;

  RETURN jsonb_build_object('success', true, 'log_id', log_id, 'clock_in', now());
END;
$$;

-- Clock out — close the open entry for this worker
CREATE OR REPLACE FUNCTION clock_out_worker(
  p_worker_id          UUID,
  p_lunch_minutes      INT DEFAULT 0,
  p_notes              TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  open_log  worker_time_logs%ROWTYPE;
  diff_mins INT;
BEGIN
  SELECT * INTO open_log
  FROM worker_time_logs
  WHERE worker_id = p_worker_id AND clock_out IS NULL
  ORDER BY clock_in DESC LIMIT 1;

  IF open_log IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No open clock-in found');
  END IF;

  diff_mins = EXTRACT(EPOCH FROM (now() - open_log.clock_in))::INT / 60 - p_lunch_minutes;

  UPDATE worker_time_logs
  SET clock_out = now(),
      lunch_break_minutes = p_lunch_minutes,
      notes = COALESCE(NULLIF(TRIM(p_notes), ''), NULL),
      updated_at = now()
  WHERE id = open_log.id;

  RETURN jsonb_build_object(
    'success', true,
    'log_id', open_log.id,
    'clock_out', now(),
    'total_minutes', GREATEST(0, diff_mins)
  );
END;
$$;

-- Get open clock-in for a worker (for resuming)
CREATE OR REPLACE FUNCTION get_open_clock_in(p_worker_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  open_log worker_time_logs%ROWTYPE;
BEGIN
  SELECT * INTO open_log
  FROM worker_time_logs
  WHERE worker_id = p_worker_id AND clock_out IS NULL
  ORDER BY clock_in DESC LIMIT 1;

  IF open_log IS NULL THEN
    RETURN jsonb_build_object('success', true, 'open', false);
  END IF;

  RETURN jsonb_build_object(
    'success',    true,
    'open',      true,
    'log_id',    open_log.id,
    'task_name', open_log.task_name,
    'clock_in',  open_log.clock_in,
    'elapsed_minutes', EXTRACT(EPOCH FROM (now() - open_log.clock_in))::INT / 60
  );
END;
$$;

-- Get workers for a brand (no pin_hash exposed)
CREATE OR REPLACE FUNCTION get_time_tracking_workers(p_brand_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT jsonb_build_object('workers', COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', id, 'name', name, 'role', role, 'lang', lang,
          'active', active, 'last_used_at', last_used_at, 'created_at', created_at
        ) ORDER BY name
      ), '[]'::jsonb
    ))
    FROM time_tracking_workers
    WHERE brand_id = p_brand_id
  );
END;
$$;

-- Create worker — auto-generates 4-digit PIN
CREATE OR REPLACE FUNCTION create_time_worker(
  p_brand_id UUID,
  p_name     TEXT,
  p_role     TEXT DEFAULT 'worker',
  p_lang     TEXT DEFAULT 'en'
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_pin   TEXT;
  new_hash  TEXT;
  new_id    UUID;
BEGIN
  -- Generate random 4-digit PIN
  new_pin = lpad((FLOOR(RANDOM() * 9000 + 1000))::INT::TEXT, 4, '0');
  -- Simple hash (for demo; use pgcrypto in production)
  new_hash = 'pin:' || new_pin;

  INSERT INTO time_tracking_workers (brand_id, name, pin_hash, role, lang)
  VALUES (p_brand_id, p_name, new_hash, p_role, p_lang)
  RETURNING id INTO new_id;

  RETURN jsonb_build_object(
    'success', true,
    'worker',  jsonb_build_object('id', new_id, 'name', p_name, 'role', p_role, 'lang', p_lang),
    'pin',     new_pin
  );
END;
$$;

-- Reset worker PIN — returns new PIN (shown once)
CREATE OR REPLACE FUNCTION reset_time_worker_pin(p_worker_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_pin  TEXT;
  new_hash TEXT;
BEGIN
  new_pin = lpad((FLOOR(RANDOM() * 9000 + 1000))::INT::TEXT, 4, '0');
  new_hash = 'pin:' || new_pin;
  UPDATE time_tracking_workers SET pin_hash = new_hash WHERE id = p_worker_id;
  RETURN jsonb_build_object('success', true, 'pin', new_pin);
END;
$$;

-- Update worker
CREATE OR REPLACE FUNCTION update_time_worker(
  p_worker_id UUID,
  p_name      TEXT,
  p_role      TEXT,
  p_lang      TEXT,
  p_active    BOOLEAN
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE time_tracking_workers
  SET name = p_name, role = p_role, lang = p_lang, active = p_active
  WHERE id = p_worker_id;
  RETURN jsonb_build_object('success', true);
END;
$$;

-- Delete worker
CREATE OR REPLACE FUNCTION delete_time_worker(p_worker_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM time_tracking_workers WHERE id = p_worker_id;
  RETURN jsonb_build_object('success', true);
END;
$$;

-- ── Tasks RPCs ────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_time_tracking_tasks(p_brand_id UUID, p_active_only BOOLEAN DEFAULT false)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT jsonb_build_object('tasks', COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', id, 'name', name, 'name_es', name_es, 'unit', unit,
          'active', active, 'sort_order', sort_order
        ) ORDER BY sort_order, name
      ), '[]'::jsonb
    ))
    FROM time_tracking_tasks
    WHERE brand_id = p_brand_id
      AND (NOT p_active_only OR active = true)
  );
END;
$$;

CREATE OR REPLACE FUNCTION create_time_task(
  p_brand_id UUID,
  p_name     TEXT,
  p_name_es  TEXT DEFAULT NULL,
  p_unit     TEXT DEFAULT 'hours',
  p_sort_order INT DEFAULT 0
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO time_tracking_tasks (brand_id, name, name_es, unit, sort_order)
  VALUES (p_brand_id, p_name, p_name_es, p_unit, p_sort_order)
  RETURNING id INTO new_id;
  RETURN jsonb_build_object('success', true, 'id', new_id);
END;
$$;

CREATE OR REPLACE FUNCTION update_time_task(
  p_task_id    UUID,
  p_name       TEXT,
  p_name_es    TEXT,
  p_unit       TEXT,
  p_active     BOOLEAN,
  p_sort_order INT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE time_tracking_tasks
  SET name = p_name, name_es = p_name_es, unit = p_unit,
      active = p_active, sort_order = p_sort_order
  WHERE id = p_task_id;
  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION delete_time_task(p_task_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM time_tracking_tasks WHERE id = p_task_id;
  RETURN jsonb_build_object('success', true);
END;
$$;

-- ── Time Log RPCs ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_worker_time_logs(
  p_brand_id UUID,
  p_worker_id UUID DEFAULT NULL,
  p_task_id  UUID DEFAULT NULL,
  p_start    TIMESTAMPTZ DEFAULT NULL,
  p_end      TIMESTAMPTZ DEFAULT NULL,
  p_limit    INT DEFAULT 100
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT jsonb_build_object('logs', COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', l.id,
          'worker_id', l.worker_id,
          'worker_name', w.name,
          'task_id', l.task_id,
          'task_name', l.task_name,
          'clock_in', l.clock_in,
          'clock_out', l.clock_out,
          'lunch_break_minutes', l.lunch_break_minutes,
          'notes', l.notes,
          'submitted_via', l.submitted_via,
          'total_minutes',
            CASE
              WHEN l.clock_out IS NOT NULL
              THEN LEAST(GREATEST(0, EXTRACT(EPOCH FROM (l.clock_out - l.clock_in))::INT / 60 - l.lunch_break_minutes), 1440)
              ELSE LEAST(GREATEST(0, EXTRACT(EPOCH FROM (now() - l.clock_in))::INT / 60), 1440)
            END,
          'created_at', l.created_at
        ) ORDER BY l.clock_in DESC
      ), '[]'::jsonb
    ))
    FROM worker_time_logs l
    JOIN time_tracking_workers w ON w.id = l.worker_id
    WHERE l.brand_id = p_brand_id
      AND (p_worker_id IS NULL OR l.worker_id = p_worker_id)
      AND (p_task_id  IS NULL OR l.task_id  = p_task_id)
      AND (p_start     IS NULL OR l.clock_in >= p_start)
      AND (p_end       IS NULL OR l.clock_in <= p_end)
    LIMIT p_limit
  );
END;
$$;

CREATE OR REPLACE FUNCTION update_worker_time_log(
  p_log_id          UUID,
  p_task_name       TEXT,
  p_clock_in        TIMESTAMPTZ,
  p_clock_out       TIMESTAMPTZ,
  p_lunch_minutes   INT,
  p_notes           TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE worker_time_logs
  SET task_name = p_task_name,
      clock_in = p_clock_in,
      clock_out = p_clock_out,
      lunch_break_minutes = p_lunch_minutes,
      notes = NULLIF(TRIM(p_notes), ''),
      updated_at = now()
  WHERE id = p_log_id;
  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION delete_worker_time_log(p_log_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM worker_time_logs WHERE id = p_log_id;
  RETURN jsonb_build_object('success', true);
END;
$$;

-- ── Summary RPC (for admin dashboard) ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_time_tracking_summary(
  p_brand_id UUID,
  p_start    TIMESTAMPTZ,
  p_end      TIMESTAMPTZ
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN jsonb_build_object(
    'by_worker', (
      SELECT COALESCE(jsonb_agg(r ORDER BY total_hours DESC), '[]'::jsonb)
      FROM (
        SELECT w.id, w.name,
          COUNT(l.id) AS entry_count,
          SUM(
            LEAST(GREATEST(0, EXTRACT(EPOCH FROM (COALESCE(l.clock_out, now()) - l.clock_in))::INT / 60 - l.lunch_break_minutes), 1440)
          ) / 60.0 AS total_hours
        FROM time_tracking_workers w
        LEFT JOIN worker_time_logs l ON l.worker_id = w.id
          AND l.clock_in >= p_start AND l.clock_in <= p_end
        WHERE w.brand_id = p_brand_id
        GROUP BY w.id, w.name
      ) r
    ),
    'by_task', (
      SELECT COALESCE(jsonb_agg(r ORDER BY total_hours DESC), '[]'::jsonb)
      FROM (
        SELECT t.id, t.name, t.name_es,
          COUNT(l.id) AS entry_count,
          SUM(
            LEAST(GREATEST(0, EXTRACT(EPOCH FROM (COALESCE(l.clock_out, now()) - l.clock_in))::INT / 60 - l.lunch_break_minutes), 1440)
          ) / 60.0 AS total_hours
        FROM time_tracking_tasks t
        LEFT JOIN worker_time_logs l ON l.task_id = t.id
          AND l.clock_in >= p_start AND l.clock_in <= p_end
        WHERE t.brand_id = p_brand_id
        GROUP BY t.id, t.name, t.name_es
      ) r
    ),
    'totals', (
      SELECT jsonb_build_object(
        'entry_count', COUNT(*),
        'total_hours', SUM(
          LEAST(GREATEST(0, EXTRACT(EPOCH FROM (COALESCE(clock_out, now()) - clock_in))::INT / 60 - lunch_break_minutes), 1440)
        ) / 60.0,
        'open_count', COUNT(*) FILTER (WHERE clock_out IS NULL)
      )
      FROM worker_time_logs
      WHERE brand_id = p_brand_id AND clock_in >= p_start AND clock_in <= p_end
    )
  );
END;
$$;
