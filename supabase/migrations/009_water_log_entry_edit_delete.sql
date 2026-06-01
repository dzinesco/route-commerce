-- =============================================================================
-- Water Log V1 — Entry Edit & Delete
-- Allows water_admin and platform_admin to edit measurement/notes
-- Allows deletion of entries (hard delete, not soft)
-- =============================================================================

-- =============================================================================
-- update_water_entry(p_entry_id uuid, p_measurement numeric, p_notes text)
-- Updates measurement and notes only. Preserves user_id, headgate_id,
-- logged_at, submitted_via.
-- Returns jsonb: {success} or {success:false, error}
-- =============================================================================
CREATE OR REPLACE FUNCTION public.update_water_entry(p_entry_id uuid, p_measurement numeric, p_notes text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.water_log_entries
  SET measurement = p_measurement, notes = p_notes
  WHERE id = p_entry_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Entry not found');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- =============================================================================
-- delete_water_entry(p_entry_id uuid)
-- Hard-deletes an entry. Use with caution — no soft-delete for entries.
-- Returns jsonb: {success} or {success:false, error}
-- =============================================================================
CREATE OR REPLACE FUNCTION public.delete_water_entry(p_entry_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  DELETE FROM public.water_log_entries WHERE id = p_entry_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Entry not found');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

NOTIFY pgrst, 'reload schema';

-- =============================================================================
-- get_water_entry_by_id(p_entry_id uuid)
-- Returns a single entry row for the edit page.
-- Returns jsonb: {entry: {...}} or {entry: null}
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_water_entry_by_id(p_entry_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT jsonb_build_object('entry', (
      SELECT jsonb_build_object(
        'id', e.id,
        'headgate_id', e.headgate_id,
        'user_id', e.user_id,
        'headgate_name', hg.name,
        'user_name', u.name,
        'measurement', e.measurement,
        'unit', e.unit,
        'notes', e.notes,
        'submitted_via', e.submitted_via,
        'logged_at', e.logged_at
      )
      FROM public.water_log_entries e
      JOIN public.water_headgates hg ON hg.id = e.headgate_id
      JOIN public.water_users u ON u.id = e.user_id
      WHERE e.id = p_entry_id
    ))
  );
END;
$$;

NOTIFY pgrst, 'reload schema';