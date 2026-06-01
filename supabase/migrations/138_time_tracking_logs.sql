-- Time tracking logs table
CREATE TABLE IF NOT EXISTS time_tracking_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  worker_id uuid NOT NULL REFERENCES time_tracking_workers(id) ON DELETE CASCADE,
  task_id uuid REFERENCES time_tracking_tasks(id) ON DELETE SET NULL,
  clock_in timestamptz NOT NULL,
  clock_out timestamptz,
  lunch_break_minutes integer DEFAULT 0,
  notes text,
  submitted_via text DEFAULT 'manual',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS time_tracking_logs_worker ON time_tracking_logs(worker_id);
CREATE INDEX IF NOT EXISTS time_tracking_logs_brand ON time_tracking_logs(brand_id);
CREATE INDEX IF NOT EXISTS time_tracking_logs_clock_in ON time_tracking_logs(clock_in);

-- get_worker_time_logs RPC
CREATE OR REPLACE FUNCTION get_worker_time_logs(
  p_brand_id uuid,
  p_worker_id uuid DEFAULT NULL,
  p_task_id uuid DEFAULT NULL,
  p_start timestamptz DEFAULT NULL,
  p_end timestamptz DEFAULT NULL,
  p_limit integer DEFAULT 200,
  p_offset integer DEFAULT 0
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN json_build_object(
    'logs', (
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT
          l.id,
          l.worker_id,
          w.name AS worker_name,
          l.task_id,
          t.name AS task_name,
          l.clock_in,
          l.clock_out,
          l.lunch_break_minutes,
          l.notes,
          l.submitted_via,
          l.created_at,
          CASE
            WHEN l.clock_out IS NOT NULL THEN
              (EXTRACT(EPOCH FROM (l.clock_out - l.clock_in))::integer / 60) - l.lunch_break_minutes
            ELSE
              (EXTRACT(EPOCH FROM (now() - l.clock_in))::integer / 60) - l.lunch_break_minutes
          END AS total_minutes
        FROM time_tracking_logs l
        JOIN time_tracking_workers w ON w.id = l.worker_id
        LEFT JOIN time_tracking_tasks t ON t.id = l.task_id
        WHERE l.brand_id = p_brand_id
          AND (p_worker_id IS NULL OR l.worker_id = p_worker_id)
          AND (p_task_id IS NULL OR l.task_id = p_task_id)
          AND (p_start IS NULL OR l.clock_in >= p_start)
          AND (p_end IS NULL OR l.clock_in <= p_end)
        ORDER BY l.clock_in DESC
        LIMIT p_limit
        OFFSET p_offset
      ) t
    )
  );
END;
$$;
