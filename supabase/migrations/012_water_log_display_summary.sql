-- =============================================================================
-- Water Log V1.6 - Display Summary RPC
-- Returns headgate latest readings + today's aggregates for Smartsheet/display.
-- SECURITY DEFINER so anon key can call it (same as other water log RPCs).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_water_display_summary(p_brand_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN (
    WITH headgate_data AS (
      SELECT
        hg.id,
        hg.name,
        COALESCE(hg.unit, 'CFS') as unit,
        (
          SELECT jsonb_build_object(
            'measurement', le.measurement,
            'user_name', u.name,
            'logged_at', le.logged_at
          )
          FROM public.water_log_entries le
          JOIN public.water_users u ON u.id = le.user_id
          WHERE le.headgate_id = hg.id
          ORDER BY le.logged_at DESC
          LIMIT 1
        ) as latest_entry,
        (
          SELECT le.logged_at
          FROM public.water_log_entries le
          WHERE le.headgate_id = hg.id
          ORDER BY le.logged_at DESC
          LIMIT 1
        ) as last_logged_at,
        (
          SELECT FLOOR(EXTRACT(EPOCH FROM (now() - le.logged_at)) / 60)::int
          FROM public.water_log_entries le
          WHERE le.headgate_id = hg.id
          ORDER BY le.logged_at DESC
          LIMIT 1
        ) as minutes_ago
      FROM public.water_headgates hg
      WHERE hg.brand_id = p_brand_id
        AND hg.active = true
        AND hg.deleted_at IS NULL
    ),
    today_stats AS (
      SELECT
        count(*) as cnt,
        COALESCE(sum(measurement), 0) as total
      FROM public.water_log_entries
      WHERE brand_id = p_brand_id AND logged_at::date = CURRENT_DATE
    ),
    entries_ordered AS (
      SELECT e.logged_at, e.headgate_id, e.user_id, e.measurement, e.unit, e.notes, e.submitted_via
      FROM public.water_log_entries e
      WHERE e.brand_id = p_brand_id
      ORDER BY e.logged_at DESC
      LIMIT 20
    ),
    recent_entries_agg AS (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'logged_at', e.logged_at,
          'headgate_name', hg.name,
          'user_name', u.name,
          'user_role', u.role,
          'measurement', e.measurement,
          'unit', e.unit,
          'notes', e.notes,
          'submitted_via', e.submitted_via
        )
      ), '[]'::jsonb) as data
      FROM entries_ordered e
      JOIN public.water_headgates hg ON hg.id = e.headgate_id
      JOIN public.water_users u ON u.id = e.user_id
    )
    SELECT jsonb_build_object(
      'headgates', (
        SELECT COALESCE(jsonb_agg(
          jsonb_build_object(
            'id', hd.id,
            'name', hd.name,
            'unit', hd.unit,
            'latest_entry', hd.latest_entry,
            'last_logged_at', hd.last_logged_at,
            'minutes_ago', hd.minutes_ago
          )
        ), '[]'::jsonb)
        FROM headgate_data hd
      ),
      'today_count', (SELECT cnt FROM today_stats),
      'today_total', (SELECT total FROM today_stats),
      'recent_entries', (SELECT data FROM recent_entries_agg)
    )
  );
END;
$$;

NOTIFY pgrst, 'reload schema';
