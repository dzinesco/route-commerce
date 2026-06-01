-- =============================================================================
-- Water Log V1.6 - Security Hardening: block direct water_users access
--
-- Problem: pin_hash can be read via direct REST SELECT with anon key.
-- Fix: Remove direct SELECT policies. All reads go through SECURITY DEFINER
-- RPCs which run as the supabase postgres user and bypass RLS.
--
-- Changes:
-- 1. DROP "Users readable by all" policy (was added to fix getWaterAdminSession)
-- 2. Create get_water_user_by_id(p_user_id) RPC for language lookup (SECURITY DEFINER)
-- 3. Create get_water_admin_session() RPC (SECURITY DEFINER) replacing direct
--    water_sessions + water_users JOIN in field.ts getWaterAdminSession
-- 4. Update field.ts to use RPCs instead of direct REST calls
-- 5. Supabase will continue to route all water_users writes through the existing
--    SECURITY DEFINER RPCs (create_water_user, update_water_user, etc.)
-- =============================================================================

-- Step 1: Remove direct SELECT policy from water_users
DROP POLICY IF EXISTS "Users readable by all" ON public.water_users;

-- Step 2: Create a SECURITY DEFINER RPC to get a single user's language preference
-- This replaces the direct REST call in field.ts line 83
-- (runs as supabase postgres user, bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_water_user_by_id(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'language_preference', language_preference
  ) INTO v_result
  FROM public.water_users
  WHERE id = p_user_id AND deleted_at IS NULL;

  RETURN v_result;
END;
$$;

-- Step 3: Create get_water_admin_session() RPC (SECURITY DEFINER)
-- Reads the wl_session cookie and returns the associated user's info.
-- Replaces the direct water_sessions + water_users JOIN in getWaterAdminSession.
-- Runs as supabase postgres user, bypasses RLS on both water_sessions and water_users.
CREATE OR REPLACE FUNCTION public.get_water_admin_session()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_session_id text;
  v_result     jsonb;
BEGIN
  -- Read wl_session from request cookies (set by verify_water_pin)
  -- In SECURITY DEFINER context, we can't access HTTP cookies directly.
  -- The session_id is passed from the caller (Next.js server action).
  -- Instead, create a variant that accepts session_id as a parameter.
  RETURN null; -- placeholder — actual implementation uses p_session_id below
END;
$$;

-- Drop and recreate with proper signature (accepts p_session_id)
DROP FUNCTION IF EXISTS public.get_water_admin_session();

CREATE OR REPLACE FUNCTION public.get_water_admin_session(p_session_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'user_id', s.user_id,
    'name',    u.name,
    'role',    u.role
  ) INTO v_result
  FROM public.water_sessions s
  JOIN public.water_users u ON u.id = s.user_id
  WHERE s.id = p_session_id::uuid
    AND s.expires_at > now()
    AND u.role = 'water_admin'
    AND u.deleted_at IS NULL;

  RETURN v_result;
END;
$$;

NOTIFY pgrst, 'reload schema';