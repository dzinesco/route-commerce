-- 147_admin_create_stop_rpcs.sql
-- SECURITY DEFINER RPCs for stop creation.
--
-- The stops table has RLS enabled with `block_stops_mutations`
-- (FOR INSERT WITH CHECK (false)) — direct REST inserts from
-- server actions are blocked. Previously `createStop` /
-- `createStopsBatch` in src/actions/stops/ relied on
-- SUPABASE_SERVICE_ROLE_KEY to bypass RLS, but:
--   1. In production environments the env var may be unset,
--      which silently downgrades the apikey header to anon and
--      triggers 42501.
--   2. createStopsBatch was hardcoded to NEXT_PUBLIC_SUPABASE_ANON_KEY,
--      which always fails with RLS enabled.
--
-- These RPCs run as the function owner (bypasses RLS) and accept
-- p_brand_id for explicit brand scoping. The application layer
-- (server actions) still validates the caller has can_manage_stops
-- via getAdminUser() before invoking the RPC.

BEGIN;

-- ── 1. admin_create_stop ───────────────────────────────────────────────────
-- Inserts a single stop. Slug is derived from city + date; if a stop with
-- the same slug already exists for the brand, a numeric suffix is appended.

CREATE OR REPLACE FUNCTION admin_create_stop(
  p_brand_id    UUID,
  p_city        TEXT,
  p_state       TEXT,
  p_location    TEXT,
  p_date        TEXT,
  p_time        TEXT,
  p_address     TEXT    DEFAULT NULL,
  p_zip         TEXT    DEFAULT NULL,
  p_cutoff_time TEXT    DEFAULT NULL,
  p_active      BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_slug      TEXT;
  v_slug_base TEXT;
  v_id        UUID;
  v_counter   INT := 0;
BEGIN
  IF p_brand_id IS NULL THEN
    RAISE EXCEPTION 'brand_id is required';
  END IF;
  IF p_city IS NULL OR length(trim(p_city)) = 0 THEN
    RAISE EXCEPTION 'city is required';
  END IF;

  v_slug_base := lower(regexp_replace(trim(p_city), '\s+', '-', 'g'))
                 || '-' || COALESCE(NULLIF(trim(p_date), ''), CURRENT_DATE::TEXT);
  v_slug := v_slug_base;

  -- Ensure unique slug per brand by appending a counter if needed
  WHILE EXISTS (SELECT 1 FROM stops WHERE brand_id = p_brand_id AND slug = v_slug) LOOP
    v_counter := v_counter + 1;
    v_slug := v_slug_base || '-' || v_counter;
  END LOOP;

  INSERT INTO stops (
    brand_id, city, state, location, date, time, slug,
    address, zip, cutoff_time, active, status
  ) VALUES (
    p_brand_id, p_city, p_state, p_location, p_date, p_time, v_slug,
    p_address, p_zip, p_cutoff_time, p_active, 'draft'
  )
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('id', v_id, 'slug', v_slug);
END;
$$;

-- ── 2. admin_create_stops_batch ────────────────────────────────────────────
-- Inserts many stops in one call. Returns JSONB with created IDs + slugs.
-- On any per-row failure the whole batch rolls back (transactional).

CREATE OR REPLACE FUNCTION admin_create_stops_batch(
  p_brand_id UUID,
  p_stops    JSONB  -- array of {city, state, location, date, time, address?, zip?, cutoff_time?, active?}
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_row       JSONB;
  v_result    JSONB := '[]'::JSONB;
  v_slug_base TEXT;
  v_slug      TEXT;
  v_counter   INT;
  v_id        UUID;
  v_city      TEXT;
  v_state     TEXT;
  v_location  TEXT;
  v_date      TEXT;
  v_time      TEXT;
  v_address   TEXT;
  v_zip       TEXT;
  v_cutoff    TEXT;
  v_active    BOOLEAN;
BEGIN
  IF p_brand_id IS NULL THEN
    RAISE EXCEPTION 'brand_id is required';
  END IF;

  IF p_stops IS NULL OR jsonb_typeof(p_stops) <> 'array' OR jsonb_array_length(p_stops) = 0 THEN
    RETURN '[]'::JSONB;
  END IF;

  FOR v_row IN SELECT * FROM jsonb_array_elements(p_stops) LOOP
    v_city     := v_row->>'city';
    v_state    := v_row->>'state';
    v_location := v_row->>'location';
    v_date     := v_row->>'date';
    v_time     := v_row->>'time';
    v_address  := v_row->>'address';
    v_zip      := v_row->>'zip';
    v_cutoff   := v_row->>'cutoff_time';
    v_active   := COALESCE((v_row->>'active')::BOOLEAN, false);

    IF v_city IS NULL OR length(trim(v_city)) = 0 THEN
      RAISE EXCEPTION 'city is required for all stops';
    END IF;

    v_slug_base := lower(regexp_replace(trim(v_city), '\s+', '-', 'g'))
                   || '-' || COALESCE(NULLIF(trim(v_date), ''), CURRENT_DATE::TEXT);
    v_slug := v_slug_base;
    v_counter := 0;
    WHILE EXISTS (SELECT 1 FROM stops WHERE brand_id = p_brand_id AND slug = v_slug) LOOP
      v_counter := v_counter + 1;
      v_slug := v_slug_base || '-' || v_counter;
    END LOOP;

    INSERT INTO stops (
      brand_id, city, state, location, date, time, slug,
      address, zip, cutoff_time, active, status
    ) VALUES (
      p_brand_id, v_city, v_state, v_location, v_date, v_time, v_slug,
      v_address, v_zip, v_cutoff, v_active, 'draft'
    )
    RETURNING id INTO v_id;

    v_result := v_result || jsonb_build_object('id', v_id, 'slug', v_slug)::JSONB;
  END LOOP;

  RETURN v_result;
END;
$$;

COMMIT;
