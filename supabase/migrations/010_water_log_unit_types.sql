-- =============================================================================
-- Water Log V1.1 — Unit Types + Dedicated Edit Pages
--
-- Adds `unit` column to water_headgates so each headgate carries its
-- preferred measurement unit (CFS, GPM, etc.). This unit pre-selects
-- on the field form and is editable via dedicated headgate/user edit pages.
--
-- Also updates update_water_entry to support changing unit.
-- =============================================================================

-- ── Add unit to headgates ────────────────────────────────────
ALTER TABLE public.water_headgates
  ADD COLUMN IF NOT EXISTS unit TEXT NOT NULL DEFAULT 'CFS';

-- ── Update submit_water_entry to respect headgate's unit ─────
-- The field form should use the headgate's default unit.
-- Update get_water_entries to include headgate unit.
-- Update update_water_entry to accept optional unit change.

CREATE OR REPLACE FUNCTION public.update_water_entry(
  p_entry_id uuid,
  p_measurement numeric,
  p_notes text,
  p_unit text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF p_unit IS NOT NULL THEN
    UPDATE public.water_log_entries
    SET measurement = p_measurement, notes = p_notes, unit = p_unit
    WHERE id = p_entry_id;
  ELSE
    UPDATE public.water_log_entries
    SET measurement = p_measurement, notes = p_notes
    WHERE id = p_entry_id;
  END IF;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Entry not found');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Update get_water_entries to include headgate's default unit (for pre-fill)
CREATE OR REPLACE FUNCTION public.get_water_entries(p_brand_id uuid, p_limit int DEFAULT 50)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT jsonb_build_object('entries', COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'id', e.id,
          'headgate_id', e.headgate_id,
          'user_id', e.user_id,
          'headgate_name', hg.name,
          'user_name', u.name,
          'measurement', e.measurement,
          'unit', e.unit,
          'notes', e.notes,
          'submitted_via', e.submitted_via,
          'logged_at', e.logged_at,
          'headgate_unit', hg.unit
        ) ORDER BY e.logged_at DESC
       )
       FROM public.water_log_entries e
       JOIN public.water_headgates hg ON hg.id = e.headgate_id
       JOIN public.water_users u ON u.id = e.user_id
       WHERE e.brand_id = p_brand_id
      ), '[]'::jsonb
    ))
  );
END;
$$;

-- Update get_water_entry_by_id to include headgate_unit for pre-fill
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
        'logged_at', e.logged_at,
        'headgate_unit', hg.unit
      )
      FROM public.water_log_entries e
      JOIN public.water_headgates hg ON hg.id = e.headgate_id
      JOIN public.water_users u ON u.id = e.user_id
      WHERE e.id = p_entry_id
    ))
  );
END;
$$;

-- Drop overloads so there's only one version with p_unit defaulting
DROP FUNCTION IF EXISTS public.update_water_headgate(uuid, text, boolean);

CREATE OR REPLACE FUNCTION public.update_water_headgate(
  p_headgate_id uuid,
  p_name text,
  p_active boolean,
  p_unit text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF p_unit IS NOT NULL THEN
    UPDATE public.water_headgates
    SET name = p_name, active = p_active, unit = p_unit
    WHERE id = p_headgate_id AND deleted_at IS NULL;
  ELSE
    UPDATE public.water_headgates
    SET name = p_name, active = p_active
    WHERE id = p_headgate_id AND deleted_at IS NULL;
  END IF;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Headgate not found');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Update create_water_headgate to accept unit
CREATE OR REPLACE FUNCTION public.create_water_headgate(p_brand_id uuid, p_name text, p_unit text DEFAULT 'CFS')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_headgate_id uuid;
  v_result jsonb;
BEGIN
  INSERT INTO public.water_headgates (brand_id, name, unit)
  VALUES (p_brand_id, p_name, p_unit)
  RETURNING id INTO v_headgate_id;

  SELECT jsonb_build_object(
    'id', id,
    'name', name,
    'active', active,
    'unit', unit,
    'created_at', created_at
  ) INTO v_result
  FROM public.water_headgates WHERE id = v_headgate_id;

  RETURN jsonb_build_object('headgate', v_result);
END;
$$;

-- get_water_headgates admin view should include unit
CREATE OR REPLACE FUNCTION public.get_water_headgates(p_brand_id uuid, p_active_only boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT jsonb_build_object('headgates', COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'id', id,
          'name', name,
          'active', active,
          'unit', unit,
          'created_at', created_at,
          'deleted_at', deleted_at
        ) ORDER BY created_at DESC
       )
       FROM public.water_headgates
       WHERE brand_id = p_brand_id
         AND (NOT p_active_only OR active = true)
         AND deleted_at IS NULL
      ), '[]'::jsonb
    ))
  );
END;
$$;

NOTIFY pgrst, 'reload schema';