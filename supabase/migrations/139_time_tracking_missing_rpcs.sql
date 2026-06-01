-- Update time log RPC
CREATE OR REPLACE FUNCTION update_worker_time_log(
  p_log_id uuid,
  p_task_name text,
  p_clock_in timestamptz,
  p_clock_out timestamptz DEFAULT NULL,
  p_lunch_minutes integer DEFAULT 0,
  p_notes text DEFAULT NULL
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_task_id uuid;
BEGIN
  SELECT id INTO v_task_id FROM time_tracking_tasks WHERE name = p_task_name LIMIT 1;

  UPDATE time_tracking_logs
  SET task_id = v_task_id,
      clock_in = p_clock_in,
      clock_out = p_clock_out,
      lunch_break_minutes = p_lunch_minutes,
      notes = p_notes
  WHERE id = p_log_id;

  RETURN json_build_object('success', true);
END;
$$;

-- Delete time log RPC
CREATE OR REPLACE FUNCTION delete_worker_time_log(p_log_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM time_tracking_logs WHERE id = p_log_id;
  RETURN json_build_object('success', true);
END;
$$;

-- Get time tracking summary RPC
CREATE OR REPLACE FUNCTION get_time_tracking_summary(
  p_brand_id uuid,
  p_start timestamptz,
  p_end timestamptz
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    WITH worker_stats AS (
      SELECT
        l.worker_id,
        w.name AS worker_name,
        COUNT(*) AS entry_count,
        SUM(
          CASE
            WHEN l.clock_out IS NOT NULL THEN
              (EXTRACT(EPOCH FROM (l.clock_out - l.clock_in))::integer / 60) - l.lunch_break_minutes
            ELSE 0
          END
        ) AS total_minutes
      FROM time_tracking_logs l
      JOIN time_tracking_workers w ON w.id = l.worker_id
      WHERE l.brand_id = p_brand_id
        AND l.clock_in >= p_start
        AND l.clock_in <= p_end
      GROUP BY l.worker_id, w.name
    ),
    task_stats AS (
      SELECT
        l.task_id,
        t.name AS task_name,
        t.name_es AS task_name_es,
        COUNT(*) AS entry_count,
        SUM(
          CASE
            WHEN l.clock_out IS NOT NULL THEN
              (EXTRACT(EPOCH FROM (l.clock_out - l.clock_in))::integer / 60) - l.lunch_break_minutes
            ELSE 0
          END
        ) AS total_minutes
      FROM time_tracking_logs l
      LEFT JOIN time_tracking_tasks t ON t.id = l.task_id
      WHERE l.brand_id = p_brand_id
        AND l.clock_in >= p_start
        AND l.clock_in <= p_end
      GROUP BY l.task_id, t.name, t.name_es
    ),
    totals AS (
      SELECT
        COUNT(*) AS entry_count,
        COALESCE(SUM(
          CASE
            WHEN l.clock_out IS NOT NULL THEN
              (EXTRACT(EPOCH FROM (l.clock_out - l.clock_in))::integer / 60) - l.lunch_break_minutes
            ELSE 0
          END
        ), 0) AS total_minutes,
        COUNT(*) FILTER (WHERE l.clock_out IS NULL) AS open_count
      FROM time_tracking_logs l
      WHERE l.brand_id = p_brand_id
        AND l.clock_in >= p_start
        AND l.clock_in <= p_end
    )
    SELECT json_build_object(
      'by_worker', (SELECT json_agg(json_build_object('id', worker_id, 'name', worker_name, 'entry_count', entry_count, 'total_hours', ROUND(total_minutes::numeric / 60, 2))) FROM worker_stats),
      'by_task', (SELECT json_agg(json_build_object('id', task_id, 'name', task_name, 'name_es', task_name_es, 'entry_count', entry_count, 'total_hours', ROUND(total_minutes::numeric / 60, 2))) FROM task_stats),
      'totals', (SELECT json_build_object('entry_count', entry_count, 'total_hours', ROUND(total_minutes::numeric / 60, 2), 'open_count', open_count) FROM totals)
    )
  );
END;
$$;
