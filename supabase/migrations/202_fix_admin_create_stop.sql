-- 202_fix_admin_create_stop.sql
-- Fix/recreate admin_create_stop RPC using the signature required by callers.
--
-- The previous migration 147 defined the function but was never applied (or
-- was lost) to the live DB, resulting in PGRST202 "function not found" when
-- "Add New Stop" (createStop server action) tries to call it.
--
-- This uses the parameter order from the reported error + best-practice
-- style (always return jsonb with success/stop_id or error; no RAISE).
-- Robust date/cutoff parsing and slug generation are preserved so that
-- required columns (slug, status) are populated and duplicates are avoided.
--
-- Matches the client call in src/actions/stops/create-stop.ts which passes:
--   p_brand_id, p_city, p_state, p_location, p_date, p_time,
--   p_address, p_zip, p_cutoff_time, p_active
-- (named keys; param order in CREATE only affects the GRANT signature).

BEGIN;

-- Drop any stale overloads that might confuse PostgREST cache or signature matching.
DO $$
BEGIN
  DROP FUNCTION IF EXISTS public.admin_create_stop(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN);
  DROP FUNCTION IF EXISTS public.admin_create_stop(BOOLEAN, TEXT, UUID, TEXT, TIME, DATE, TEXT, TEXT, TIME, TEXT);
  DROP FUNCTION IF EXISTS public.admin_create_stop(BOOLEAN, TEXT, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);
EXCEPTION WHEN OTHERS THEN
  -- ignore if not present
  NULL;
END $$;

-- ── admin_create_stop (single) ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_create_stop(
  p_active      boolean,
  p_address     text,
  p_brand_id    uuid,
  p_city        text,
  p_cutoff_time text,
  p_date        text,
  p_location    text,
  p_state       text,
  p_time        text,
  p_zip         text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_date_value  TIMESTAMPTZ;
  v_cutoff_val  TIMESTAMPTZ;
  v_slug        TEXT;
  v_slug_base   TEXT;
  v_id          UUID;
  v_counter     INT := 0;
BEGIN
  IF p_brand_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'brand_id is required');
  END IF;
  IF p_city IS NULL OR length(trim(p_city)) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'city is required');
  END IF;

  -- ── Parse p_date (TEXT -> TIMESTAMPTZ) ────────────────────────────────────
  v_date_value := NULLIF(trim(p_date), '')::TIMESTAMPTZ;
  IF v_date_value IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'date is required');
  END IF;

  -- ── Parse p_cutoff_time (accepts ISO datetime OR "HH:MM[:SS]") ────────────
  IF p_cutoff_time IS NULL OR length(trim(p_cutoff_time)) = 0 THEN
    v_cutoff_val := NULL;
  ELSIF p_cutoff_time ~ '^\d{1,2}:\d{2}(:\d{2})?$' THEN
    -- Time-only value — combine with the stop's date
    v_cutoff_val := (v_date_value::DATE + trim(p_cutoff_time)::TIME)::TIMESTAMPTZ;
  ELSE
    -- Assume a full ISO datetime string
    v_cutoff_val := trim(p_cutoff_time)::TIMESTAMPTZ;
  END IF;

  -- ── Derive unique slug (required column) ──────────────────────────────────
  v_slug_base := lower(regexp_replace(trim(p_city), '\s+', '-', 'g'))
                 || '-' || to_char(v_date_value, 'YYYY-MM-DD');
  v_slug := v_slug_base;

  WHILE EXISTS (SELECT 1 FROM stops WHERE brand_id = p_brand_id AND slug = v_slug) LOOP
    v_counter := v_counter + 1;
    v_slug := v_slug_base || '-' || v_counter;
  END LOOP;

  -- ── Insert (include all required columns + status) ────────────────────────
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
    zip,
    slug,
    status
  )
  VALUES (
    p_active,
    p_address,
    p_brand_id,
    p_city,
    v_cutoff_val,
    v_date_value,
    p_location,
    p_state,
    p_time,
    p_zip,
    v_slug,
    'draft'
  )
  RETURNING id INTO v_id;

  RETURN jsonb_build_object(
    'success', true,
    'stop_id', v_id,
    'message', 'Stop created successfully'
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- Grant for the exact signature (types in declaration order).
-- SECURITY DEFINER bypasses RLS; anon is used intentionally from server action.
GRANT EXECUTE ON FUNCTION public.admin_create_stop(
  boolean, text, uuid, text, text, text, text, text, text, text
) TO anon, authenticated, service_role;

-- Reload PostgREST schema cache immediately so the function appears without
-- waiting for the periodic refresh (common source of PGRST202 after create).
NOTIFY pgrst, 'reload schema';

COMMIT;
