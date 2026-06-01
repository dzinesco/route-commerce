-- =============================================================================
-- Water Log V1 — Soft Delete
-- Adds deleted_at to water_users and water_headgates
-- Creates delete_water_user and delete_water_headgate RPCs
-- Existing entries preserved; deleted users/headgates excluded from queries
-- =============================================================================

-- Add deleted_at column to water_users
ALTER TABLE public.water_users
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Add deleted_at column to water_headgates
ALTER TABLE public.water_headgates
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- =============================================================================
-- delete_water_user(p_user_id uuid)
-- Soft-deletes a water user (sets deleted_at) so entries are preserved.
-- Returns jsonb: {success} or {success:false, error}
-- =============================================================================
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

-- =============================================================================
-- delete_water_headgate(p_headgate_id uuid)
-- Soft-deletes a water headgate (sets deleted_at) so entries are preserved.
-- Returns jsonb: {success} or {success:false, error}
-- =============================================================================
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

-- =============================================================================
-- Update get_water_users to exclude soft-deleted users
-- =============================================================================
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

-- =============================================================================
-- Update get_water_headgates to exclude soft-deleted headgates
-- =============================================================================
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
