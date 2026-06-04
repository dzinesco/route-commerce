-- Migration 203: Locations table (reusable venues) + admin RPCs
--
-- Purpose
-- -------
-- Today, "where a stop happens" is captured in 3 denormalized fields on the
-- stops table:
--   * location (venue name, e.g. "Tractor Supply")
--   * address  (street address, e.g. "13778 E I-25 Frontage Rd")
--   * phone    (was never on stops — only enriched from the xlsx Stop Directory)
--
-- That works for one-off inserts but breaks down for the Tuxedo 2026 tour
-- where the same venue (Tractor Supply, Murdoch's, etc.) repeats 5-15 times
-- across the season with the same address/phone/contact. Editing the address
-- means updating N stops. Listing "all unique venues we visit" requires
-- SELECT DISTINCT with a GROUP BY, not a real table.
--
-- This migration introduces a `locations` table — the canonical venue record
-- — and links each stop to it via a nullable location_id FK. Existing
-- denormalized fields on stops are kept (backwards compatible) but new
-- admin paths should prefer location_id.
--
-- The 269 seeded Tuxedo stops are backfilled into 49 unique locations
-- (one per (brand_id, name, address) tuple) by a follow-up script —
-- this migration only creates the schema and RPCs.
--
-- RPCs (all SECURITY DEFINER, all brand-scoped):
--   * admin_create_location     — insert single location
--   * admin_create_locations_batch — insert many in one call (mirrors stops pattern)
--   * admin_update_location     — partial update of name/address/phone/contact
--   * admin_delete_location     — soft delete via deleted_at (mirrors stops)
--   * get_locations_for_brand   — public read RPC (filters deleted_at, soft-publish)
--   * admin_attach_location_to_stop — link a stop to a location (idempotent)

BEGIN;

-- =============================================================================
-- 1. locations table
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.locations (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id      UUID         NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  name          TEXT         NOT NULL,
  address       TEXT,
  city          TEXT,
  state         TEXT,
  zip           TEXT,
  phone         TEXT,
  contact_name  TEXT,
  contact_email TEXT,
  notes         TEXT,
  active        BOOLEAN      NOT NULL DEFAULT true,
  deleted_at    TIMESTAMPTZ  DEFAULT NULL,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Slug per brand for nice URLs (locations/slug-{id}) — derived from name + zip
-- to disambiguate. Same collision-handling pattern as stops.
ALTER TABLE public.locations
  ADD COLUMN IF NOT EXISTS slug TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_locations_brand_slug
  ON public.locations (brand_id, slug)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_locations_brand_active
  ON public.locations (brand_id, active)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_locations_brand_name
  ON public.locations (brand_id, lower(name))
  WHERE deleted_at IS NULL;

-- updated_at trigger (reuses the generic set_updated_at fn if present)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at') THEN
    DROP TRIGGER IF EXISTS trg_locations_updated_at ON public.locations;
    CREATE TRIGGER trg_locations_updated_at
      BEFORE UPDATE ON public.locations
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END$$;

-- =============================================================================
-- 2. Link stops → locations
-- =============================================================================

ALTER TABLE public.stops
  ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_stops_location_id
  ON public.stops (location_id)
  WHERE deleted_at IS NULL;

-- =============================================================================
-- 3. RLS for locations
-- =============================================================================

ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "platform_admin_read_locations" ON public.locations;
DROP POLICY IF EXISTS "brand_admin_read_locations"   ON public.locations;
DROP POLICY IF EXISTS "platform_admin_all_locations" ON public.locations;
DROP POLICY IF EXISTS "brand_admin_all_locations"    ON public.locations;

-- Platform admin sees all non-deleted
CREATE POLICY "platform_admin_read_locations" ON public.locations
  FOR SELECT USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.user_id = auth.uid()
      AND au.role = 'platform_admin'
    )
  );

-- Brand admin / store_employee sees their own brand's non-deleted
CREATE POLICY "brand_admin_read_locations" ON public.locations
  FOR SELECT USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.user_id = auth.uid()
      AND au.role IN ('brand_admin', 'store_employee')
      AND au.brand_id = locations.brand_id
    )
  );

-- Writes go through SECURITY DEFINER RPCs (no direct INSERT/UPDATE/DELETE from anon)
-- so no INSERT/UPDATE/DELETE policies are granted to anon/authenticated.

-- =============================================================================
-- 4. RPCs
-- =============================================================================

-- ── 4a. admin_create_location ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_create_location(
  p_brand_id      UUID,
  p_name          TEXT,
  p_address       TEXT    DEFAULT NULL,
  p_city          TEXT    DEFAULT NULL,
  p_state         TEXT    DEFAULT NULL,
  p_zip           TEXT    DEFAULT NULL,
  p_phone         TEXT    DEFAULT NULL,
  p_contact_name  TEXT    DEFAULT NULL,
  p_contact_email TEXT    DEFAULT NULL,
  p_notes         TEXT    DEFAULT NULL,
  p_active        BOOLEAN DEFAULT true
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id        UUID;
  v_slug      TEXT;
  v_slug_base TEXT;
  v_counter   INT := 0;
BEGIN
  IF p_brand_id IS NULL THEN
    RAISE EXCEPTION 'brand_id is required';
  END IF;
  IF p_name IS NULL OR length(trim(p_name)) = 0 THEN
    RAISE EXCEPTION 'name is required';
  END IF;

  v_slug_base := lower(regexp_replace(trim(p_name), '[^a-z0-9]+', '-', 'g'))
                 || COALESCE('-' || regexp_replace(COALESCE(p_zip, ''), '[^a-z0-9]+', '', 'gi'), '');
  v_slug_base := trim(BOTH '-' FROM v_slug_base);
  v_slug := v_slug_base;
  WHILE EXISTS (SELECT 1 FROM locations WHERE brand_id = p_brand_id AND slug = v_slug AND deleted_at IS NULL) LOOP
    v_counter := v_counter + 1;
    v_slug := v_slug_base || '-' || v_counter;
  END LOOP;

  INSERT INTO public.locations (
    brand_id, name, address, city, state, zip, phone,
    contact_name, contact_email, notes, active, slug
  ) VALUES (
    p_brand_id, trim(p_name),
    NULLIF(trim(p_address), ''),
    NULLIF(trim(p_city), ''),
    NULLIF(trim(p_state), ''),
    NULLIF(trim(p_zip), ''),
    NULLIF(trim(p_phone), ''),
    NULLIF(trim(p_contact_name), ''),
    NULLIF(trim(p_contact_email), ''),
    NULLIF(trim(p_notes), ''),
    p_active, v_slug
  )
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('id', v_id, 'slug', v_slug);
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'admin_create_location failed: % (SQLSTATE %)', SQLERRM, SQLSTATE;
END;
$$;

-- ── 4b. admin_create_locations_batch ─────────────────────────────────────────
-- Mirrors admin_create_stops_batch. p_locations: JSONB array of objects with
-- the same shape as the single-row params. Returns JSONB array of {id, slug}.
-- Transactional: any per-row failure rolls the whole batch back.
CREATE OR REPLACE FUNCTION public.admin_create_locations_batch(
  p_brand_id   UUID,
  p_locations  JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row      JSONB;
  v_result   JSONB := '[]'::JSONB;
  v_id       UUID;
  v_slug     TEXT;
  v_slug_base TEXT;
  v_counter  INT;
BEGIN
  IF p_brand_id IS NULL THEN
    RAISE EXCEPTION 'brand_id is required';
  END IF;
  IF p_locations IS NULL OR jsonb_typeof(p_locations) <> 'array' OR jsonb_array_length(p_locations) = 0 THEN
    RETURN '[]'::JSONB;
  END IF;

  FOR v_row IN SELECT * FROM jsonb_array_elements(p_locations) LOOP
    IF v_row->>'name' IS NULL OR length(trim(v_row->>'name')) = 0 THEN
      RAISE EXCEPTION 'name is required for all locations';
    END IF;

    v_slug_base := lower(regexp_replace(trim(v_row->>'name'), '[^a-z0-9]+', '-', 'g'))
                   || COALESCE('-' || regexp_replace(COALESCE(v_row->>'zip', ''), '[^a-z0-9]+', '', 'gi'), '');
    v_slug_base := trim(BOTH '-' FROM v_slug_base);
    v_slug := v_slug_base;
    v_counter := 0;
    WHILE EXISTS (SELECT 1 FROM locations WHERE brand_id = p_brand_id AND slug = v_slug AND deleted_at IS NULL) LOOP
      v_counter := v_counter + 1;
      v_slug := v_slug_base || '-' || v_counter;
    END LOOP;

    INSERT INTO public.locations (
      brand_id, name, address, city, state, zip, phone,
      contact_name, contact_email, notes, active, slug
    ) VALUES (
      p_brand_id,
      trim(v_row->>'name'),
      NULLIF(trim(v_row->>'address'), ''),
      NULLIF(trim(v_row->>'city'), ''),
      NULLIF(trim(v_row->>'state'), ''),
      NULLIF(trim(v_row->>'zip'), ''),
      NULLIF(trim(v_row->>'phone'), ''),
      NULLIF(trim(v_row->>'contact_name'), ''),
      NULLIF(trim(v_row->>'contact_email'), ''),
      NULLIF(trim(v_row->>'notes'), ''),
      COALESCE((v_row->>'active')::BOOLEAN, true),
      v_slug
    )
    RETURNING id INTO v_id;

    v_result := v_result || jsonb_build_object('id', v_id, 'slug', v_slug)::JSONB;
  END LOOP;

  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'admin_create_locations_batch failed: % (SQLSTATE %)', SQLERRM, SQLSTATE;
END;
$$;

-- ── 4c. admin_update_location ────────────────────────────────────────────────
-- Partial update: only fields present in p_updates (JSONB) are written.
-- Example: SELECT admin_update_location('<id>', '<brand_id>', '{"phone": "555-1234"}');
CREATE OR REPLACE FUNCTION public.admin_update_location(
  p_location_id UUID,
  p_brand_id    UUID,
  p_updates     JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing RECORD;
  v_key      TEXT;
  v_value    TEXT;
BEGIN
  IF p_location_id IS NULL THEN
    RAISE EXCEPTION 'location_id is required';
  END IF;
  IF p_updates IS NULL OR jsonb_typeof(p_updates) <> 'object' THEN
    RAISE EXCEPTION 'updates must be a JSON object';
  END IF;

  -- Lock + ownership check
  SELECT * INTO v_existing FROM public.locations
    WHERE id = p_location_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Location not found');
  END IF;
  IF p_brand_id IS NOT NULL AND v_existing.brand_id != p_brand_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Location not found');
  END IF;

  -- Build dynamic UPDATE — only set fields explicitly present in p_updates
  FOR v_key, v_value IN
    SELECT key, value FROM jsonb_each_text(p_updates)
    WHERE key IN ('name', 'address', 'city', 'state', 'zip', 'phone',
                  'contact_name', 'contact_email', 'notes', 'active')
  LOOP
    EXECUTE format(
      'UPDATE public.locations SET %I = $1 WHERE id = $2',
      v_key
    ) USING v_value, p_location_id;
  END LOOP;

  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'admin_update_location failed: % (SQLSTATE %)', SQLERRM, SQLSTATE;
END;
$$;

-- ── 4d. admin_delete_location ────────────────────────────────────────────────
-- Soft delete via deleted_at. If any non-deleted stop still references this
-- location, refuse — caller must reassign or hard-delete those stops first.
CREATE OR REPLACE FUNCTION public.admin_delete_location(
  p_location_id UUID,
  p_brand_id    UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_loc          RECORD;
  v_stops_count  INT;
BEGIN
  SELECT * INTO v_loc FROM public.locations
    WHERE id = p_location_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Location not found');
  END IF;
  IF p_brand_id IS NOT NULL AND v_loc.brand_id != p_brand_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Location not found');
  END IF;

  SELECT COUNT(*) INTO v_stops_count FROM public.stops
    WHERE location_id = p_location_id AND deleted_at IS NULL;
  IF v_stops_count > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Cannot delete location — ' || v_stops_count || ' stop(s) still reference it. Reassign or delete those stops first.'
    );
  END IF;

  UPDATE public.locations SET deleted_at = NOW() WHERE id = p_location_id;
  RETURN jsonb_build_object('success', true);
END;
$$;

-- ── 4e. get_locations_for_brand ──────────────────────────────────────────────
-- Public read RPC. Mirrors get_public_stops_for_brand.
-- Returns active, non-deleted locations for a brand slug.
CREATE OR REPLACE FUNCTION public.get_locations_for_brand(p_brand_slug TEXT)
RETURNS TABLE (
  id            UUID,
  name          TEXT,
  address       TEXT,
  city          TEXT,
  state         TEXT,
  zip           TEXT,
  phone         TEXT,
  contact_name  TEXT,
  contact_email TEXT,
  notes         TEXT,
  slug          TEXT,
  stop_count    BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.id, l.name, l.address, l.city, l.state, l.zip, l.phone,
    l.contact_name, l.contact_email, l.notes, l.slug,
    (SELECT COUNT(*) FROM stops s
       WHERE s.location_id = l.id AND s.deleted_at IS NULL)::BIGINT AS stop_count
  FROM locations l
  INNER JOIN brands b ON l.brand_id = b.id
  WHERE l.deleted_at IS NULL
    AND l.active = true
    AND b.slug = p_brand_slug
  ORDER BY lower(l.name) ASC;
END;
$$;

-- ── 4f. admin_attach_location_to_stop ────────────────────────────────────────
-- One-way link: set stops.location_id. Idempotent.
CREATE OR REPLACE FUNCTION public.admin_attach_location_to_stop(
  p_stop_id     UUID,
  p_location_id UUID,
  p_brand_id    UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stop      RECORD;
  v_location  RECORD;
BEGIN
  SELECT * INTO v_stop FROM stops
    WHERE id = p_stop_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Stop not found');
  END IF;
  IF p_brand_id IS NOT NULL AND v_stop.brand_id != p_brand_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Stop not found');
  END IF;

  SELECT * INTO v_location FROM locations
    WHERE id = p_location_id AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Location not found');
  END IF;
  IF v_location.brand_id != v_stop.brand_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Location belongs to a different brand');
  END IF;

  UPDATE stops SET location_id = p_location_id WHERE id = p_stop_id;
  -- Also denormalize the location name + address from the venue so the
  -- storefront cards stay useful even when stops.location_id is unset.
  UPDATE stops SET location = v_location.name, address = COALESCE(v_location.address, stops.address)
    WHERE id = p_stop_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- =============================================================================
-- 5. Grants
-- =============================================================================

GRANT EXECUTE ON FUNCTION public.admin_create_location(
  UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN
) TO anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.admin_create_locations_batch(UUID, JSONB)
  TO anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.admin_update_location(UUID, UUID, JSONB)
  TO anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.admin_delete_location(UUID, UUID)
  TO anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.get_locations_for_brand(TEXT)
  TO anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.admin_attach_location_to_stop(UUID, UUID, UUID)
  TO anon, authenticated, service_role;

COMMIT;
