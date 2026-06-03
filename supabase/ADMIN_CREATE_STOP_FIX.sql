-- ============================================================================
-- Grok Fix Prompt: admin_create_stop (copy-paste ready for Supabase SQL Editor)
-- ============================================================================
-- This is the exact "Best Practice Version" from the fix prompt, with
-- additional comments. Run this directly in the Supabase SQL Editor
-- (https://supabase.com/dashboard/project/wnzkhezyhnfzhkhiflrp/sql) if the
-- migration push cannot be used.
--
-- After running, PostgREST may need a schema reload:
--   NOTIFY pgrst, 'reload schema';
--
-- Then test "Add New Stop" again.
--
-- The calling code (JS/TS) is in:
--   src/actions/stops/create-stop.ts  (the fetch to /rest/v1/rpc/admin_create_stop)
--   src/components/admin/AddStopModal.tsx
--   src/components/admin/NewStopForm.tsx
--   (all go through the server action createStop which builds the p_* args)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.admin_create_stop(
  p_active boolean,
  p_address text,
  p_brand_id uuid,
  p_city text,
  p_cutoff_time time,
  p_date date,
  p_location text,
  p_state text,
  p_time time,
  p_zip text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_stop_id uuid;
BEGIN
  INSERT INTO stops (
    active,
    address,
    brand_id,
    city,
    cutoff_time,
    date,
    location,
    state,
    time,
    zip
  )
  VALUES (
    p_active,
    p_address,
    p_brand_id,
    p_city,
    p_cutoff_time,
    p_date,
    p_location,
    p_state,
    p_time,
    p_zip
  )
  RETURNING id INTO new_stop_id;

  RETURN jsonb_build_object(
    'success', true,
    'stop_id', new_stop_id,
    'message', 'Stop created successfully'
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- Important: grant so PostgREST (anon key from server action) can invoke it.
GRANT EXECUTE ON FUNCTION public.admin_create_stop(
  boolean, text, uuid, text, time, date, text, text, time, text
) TO anon, authenticated, service_role;

-- Reload cache so the function is immediately visible (avoids PGRST202).
NOTIFY pgrst, 'reload schema';

-- NOTE: The above simple version may fail on INSERT because the stops table
-- requires "slug" and "status" (NOT NULL, no defaults in all cases).
-- Prefer the enhanced version in migrations/202_fix_admin_create_stop.sql
-- which includes slug generation and status='draft' while using a compatible
-- signature and the success/stop_id return shape.
