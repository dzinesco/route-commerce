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
--
-- Table schema (relevant columns):
--   id          UUID          PK
--   brand_id    UUID          FK brands
--   city        TEXT
--   state       TEXT
--   location    TEXT
--   date        TIMESTAMPTZ
--   time        TEXT          -- free-form ("8:00 AM – 2:00 PM")
--   address     TEXT
--   zip         TEXT
--   cutoff_time TIMESTAMPTZ   -- accepts ISO datetime OR "HH:MM"
--   slug        TEXT
--   active      BOOLEAN
--   status      TEXT          -- 'draft' | 'active' | ...

BEGIN;

-- ── 1. admin_create_stop ───────────────────────────────────────────────────
-- Inserts a single stop. Slug is derived from city + date; if a stop with
-- the same slug already exists for the brand, a numeric suffix is appended.
--
-- Robust type handling:
--   * p_date TEXT  -> cast to TIMESTAMPTZ; NULLIF handles empty string
--   * p_cutoff_time TEXT  -> accepts full ISO datetime ("2025-01-01T08:00")
--     OR a time-only value ("08:00" / "08:00:00") which is combined with
--     p_date to form a TIMESTAMPTZ. NULLIF handles empty string.
--   * p_time TEXT is passed through as-is (the column is free-form text).

CREATE OR REPLACE FUNCTION public.admin_create_stop(
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
    RAISE EXCEPTION 'brand_id is required';
  END IF;
  IF p_city IS NULL OR length(trim(p_city)) = 0 THEN
    RAISE EXCEPTION 'city is required';
  END IF;

  -- ── Parse p_date ─────────────────────────────────────────────────────────
  v_date_value := NULLIF(trim(p_date), '')::TIMESTAMPTZ;
  IF v_date_value IS NULL THEN
    RAISE EXCEPTION 'date is required';
  END IF;

  -- ── Parse p_cutoff_time (accepts ISO datetime OR "HH:MM[:SS]") ───────────
  IF p_cutoff_time IS NULL OR length(trim(p_cutoff_time)) = 0 THEN
    v_cutoff_val := NULL;
  ELSIF p_cutoff_time ~ '^\d{1,2}:\d{2}(:\d{2})?$' THEN
    -- Time-only value — combine with the stop's date
    v_cutoff_val := (v_date_value::DATE + trim(p_cutoff_time)::TIME)::TIMESTAMPTZ;
  ELSE
    -- Assume a full ISO datetime string
    v_cutoff_val := trim(p_cutoff_time)::TIMESTAMPTZ;
  END IF;

  -- ── Derive unique slug ───────────────────────────────────────────────────
  v_slug_base := lower(regexp_replace(trim(p_city), '\s+', '-', 'g'))
                 || '-' || to_char(v_date_value, 'YYYY-MM-DD');
  v_slug := v_slug_base;

  WHILE EXISTS (SELECT 1 FROM stops WHERE brand_id = p_brand_id AND slug = v_slug) LOOP
    v_counter := v_counter + 1;
    v_slug := v_slug_base || '-' || v_counter;
  END LOOP;

  -- ── Insert ───────────────────────────────────────────────────────────────
  INSERT INTO stops (
    brand_id, city, state, location, date, time, slug,
    address, zip, cutoff_time, active, status
  ) VALUES (
    p_brand_id, p_city, p_state, p_location,
    v_date_value, p_time, v_slug,
    p_address, p_zip, v_cutoff_val, p_active, 'draft'
  )
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('id', v_id, 'slug', v_slug);
EXCEPTION WHEN OTHERS THEN
  -- Re-raise as a structured error so the client gets a useful message
  RAISE EXCEPTION 'admin_create_stop failed: % (SQLSTATE %)', SQLERRM, SQLSTATE;
END;
$$;

-- ── 2. admin_create_stops_batch ────────────────────────────────────────────
-- Inserts many stops in one call. Returns JSONB with created IDs + slugs.
-- On any per-row failure the whole batch rolls back (transactional).
-- Same robust date / cutoff_time handling as the single-row RPC.

CREATE OR REPLACE FUNCTION public.admin_create_stops_batch(
  p_brand_id UUID,
  p_stops    JSONB  -- array of {city, state, location, date, time, address?, zip?, cutoff_time?, active?}
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row        JSONB;
  v_result     JSONB := '[]'::JSONB;
  v_slug_base  TEXT;
  v_slug       TEXT;
  v_counter    INT;
  v_id         UUID;
  v_city       TEXT;
  v_state      TEXT;
  v_location   TEXT;
  v_date_text  TEXT;
  v_time       TEXT;
  v_address    TEXT;
  v_zip        TEXT;
  v_cutoff_txt TEXT;
  v_active     BOOLEAN;
  v_date_value TIMESTAMPTZ;
  v_cutoff_val TIMESTAMPTZ;
BEGIN
  IF p_brand_id IS NULL THEN
    RAISE EXCEPTION 'brand_id is required';
  END IF;

  IF p_stops IS NULL OR jsonb_typeof(p_stops) <> 'array' OR jsonb_array_length(p_stops) = 0 THEN
    RETURN '[]'::JSONB;
  END IF;

  FOR v_row IN SELECT * FROM jsonb_array_elements(p_stops) LOOP
    v_city       := v_row->>'city';
    v_state      := v_row->>'state';
    v_location   := v_row->>'location';
    v_date_text  := v_row->>'date';
    v_time       := v_row->>'time';
    v_address    := v_row->>'address';
    v_zip        := v_row->>'zip';
    v_cutoff_txt := v_row->>'cutoff_time';
    v_active     := COALESCE((v_row->>'active')::BOOLEAN, false);

    IF v_city IS NULL OR length(trim(v_city)) = 0 THEN
      RAISE EXCEPTION 'city is required for all stops';
    END IF;

    -- Parse date
    v_date_value := NULLIF(trim(v_date_text), '')::TIMESTAMPTZ;
    IF v_date_value IS NULL THEN
      RAISE EXCEPTION 'date is required for all stops';
    END IF;

    -- Parse cutoff_time (accepts ISO datetime OR "HH:MM[:SS]")
    IF v_cutoff_txt IS NULL OR length(trim(v_cutoff_txt)) = 0 THEN
      v_cutoff_val := NULL;
    ELSIF v_cutoff_txt ~ '^\d{1,2}:\d{2}(:\d{2})?$' THEN
      v_cutoff_val := (v_date_value::DATE + trim(v_cutoff_txt)::TIME)::TIMESTAMPTZ;
    ELSE
      v_cutoff_val := trim(v_cutoff_txt)::TIMESTAMPTZ;
    END IF;

    v_slug_base := lower(regexp_replace(trim(v_city), '\s+', '-', 'g'))
                   || '-' || to_char(v_date_value, 'YYYY-MM-DD');
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
      p_brand_id, v_city, v_state, v_location,
      v_date_value, v_time, v_slug,
      v_address, v_zip, v_cutoff_val, v_active, 'draft'
    )
    RETURNING id INTO v_id;

    v_result := v_result || jsonb_build_object('id', v_id, 'slug', v_slug)::JSONB;
  END LOOP;

  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'admin_create_stops_batch failed: % (SQLSTATE %)', SQLERRM, SQLSTATE;
END;
$$;

-- ── 3. Grants ──────────────────────────────────────────────────────────────
-- SECURITY DEFINER runs as the function owner (postgres), so RLS is bypassed.
-- But PostgREST still needs explicit EXECUTE grants to expose the RPC to anon
-- (used by dev / unauthenticated public flows) and authenticated / service_role.

GRANT EXECUTE ON FUNCTION public.admin_create_stop(
  UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN
) TO anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.admin_create_stops_batch(UUID, JSONB)
  TO anon, authenticated, service_role;

-- ── 4. Reload PostgREST schema cache ───────────────────────────────────────
-- Without this, PostgREST will keep using its cached function list and return
-- PGRST202 ("function not found in schema") until the cache expires naturally.
-- Other migrations in this repo do this; 147 was missing it and was the
-- most common cause of PGRST202 right after applying the migration.

NOTIFY pgrst, 'reload schema';

COMMIT;
