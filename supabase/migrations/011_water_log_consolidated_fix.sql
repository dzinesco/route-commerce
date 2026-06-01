-- =============================================================================
-- Water Log V1.1 — Unit Types + Soft Delete Fix (consolidated)
--
-- If migration 008 was not run, this adds deleted_at columns.
-- If migration 010 had issues, this fixes the function overload and adds missing cols.
-- Safe to run multiple times — uses ADD COLUMN IF NOT EXISTS and IF EXISTS drops.
-- =============================================================================

-- ── Soft delete columns (if not already present) ─────────────────────────────
ALTER TABLE public.water_users
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE public.water_headgates
  ADD COLUMN IF NOT EXISTS unit TEXT NOT NULL DEFAULT 'CFS',
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- ── Fix update_water_headgate overload ───────────────────────────────────────
-- Drop old 3-param overload so there's only one version (with p_unit)
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

-- ── Fix update_water_entry overload ──────────────────────────────────────────
-- Drop old 3-param overload so only the 4-param version (p_unit optional) exists
DROP FUNCTION IF EXISTS public.update_water_entry(uuid, numeric, text);

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

-- ── Create Water Headgate (updated to support p_unit) ────────────────────────
DROP FUNCTION IF EXISTS public.create_water_headgate(uuid, text, text);

CREATE OR REPLACE FUNCTION public.create_water_headgate(
  p_brand_id uuid,
  p_name text,
  p_unit text DEFAULT 'CFS'
)
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

-- ── Delete Water User (soft delete) ───────────────────────────────────────────
DROP FUNCTION IF EXISTS public.delete_water_user(uuid);

CREATE OR REPLACE FUNCTION public.delete_water_user(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.water_users
  SET deleted_at = now()
  WHERE id = p_user_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found or already deleted');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ── Delete Water Headgate (soft delete) ──────────────────────────────────────
DROP FUNCTION IF EXISTS public.delete_water_headgate(uuid);

CREATE OR REPLACE FUNCTION public.delete_water_headgate(p_headgate_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.water_headgates
  SET deleted_at = now()
  WHERE id = p_headgate_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Headgate not found or already deleted');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ── Get Water Users (exclude soft-deleted) ───────────────────────────────────
DROP FUNCTION IF EXISTS public.get_water_users(uuid);

CREATE OR REPLACE FUNCTION public.get_water_users(p_brand_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT jsonb_build_object('users', COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'id', id,
          'name', name,
          'role', role,
          'active', active,
          'language_preference', language_preference,
          'last_used_at', last_used_at,
          'created_at', created_at,
          'deleted_at', deleted_at
        ) ORDER BY created_at DESC
       )
       FROM public.water_users
       WHERE brand_id = p_brand_id AND deleted_at IS NULL
      ), '[]'::jsonb
    ))
  );
END;
$$;

-- ── Get Water Headgates (exclude soft-deleted, include unit) ───────────────────
DROP FUNCTION IF EXISTS public.get_water_headgates(uuid, boolean);

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

-- ── Get Water Entries (include headgate_unit) ─────────────────────────────────
DROP FUNCTION IF EXISTS public.get_water_entries(uuid, int);

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

-- ── Get Water Entry By ID (include headgate_unit) ────────────────────────────
DROP FUNCTION IF EXISTS public.get_water_entry_by_id(uuid);

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

NOTIFY pgrst, 'reload schema';