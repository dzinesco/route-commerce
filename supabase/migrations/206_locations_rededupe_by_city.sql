-- Migration 206: Re-dedupe locations by (name, city, address)
--
-- Problem
-- -------
-- The original backfill (after migration 203) grouped venues by (name, address)
-- only — so "Tractor Supply" in Brighton, CO and "Tractor Supply" in
-- Canon City, CO both got rolled up to one location if they happened to share
-- the same address (or both had a NULL address). The same affected:
--   * Tractor Supply         — 58 stops at 10 distinct (city, address) combos
--   * Ace Hardware           — 27 stops at 3 distinct combos
--   * Murdoch's Ranch & Home — 25 stops at 3 distinct combos
--   * Big Tool Box           — 15 stops at 2 distinct combos
--   * JAX Farm & Ranch       — 13 stops at 2 distinct combos
-- Result: 5 of the 26 venues were each represented as a single over-broad
-- location record, hiding the real per-city venue from the Locations tab.
--
-- Fix
-- ---
-- Re-dedupe by (name, city, address). For each unique combo, create a fresh
-- location row, re-link stops to it, and soft-delete the over-grouped originals
-- (which by then have zero stop references). Idempotent: safe to re-run; on
-- re-run the CTE returns no rows and the script is a no-op.
--
-- Result: 41 locations for the Tuxedo brand (up from 26). 269 stops still
-- linked, just to the correct per-city venue record.

DO $$
DECLARE
  v_brand_id UUID := '64294306-5f42-463d-a5e8-2ad6c81a96de';
  v_inserted INT := 0;
  v_relinked INT := 0;
  v_soft_del INT := 0;
BEGIN
  -- 1. Insert one new location per distinct (name, city, address) tuple that
  --    isn't already a current non-deleted location. Skip if a row with the
  --    same (brand_id, name, lower(city), lower(address)) already exists.
  WITH venues AS (
    SELECT DISTINCT
      s.brand_id,
      s.location  AS name,
      NULLIF(btrim(COALESCE(s.city, '')), '')    AS city,
      NULLIF(btrim(COALESCE(s.address, '')), '') AS address
    FROM public.stops s
    WHERE s.brand_id = v_brand_id
      AND s.deleted_at IS NULL
      AND s.location IS NOT NULL
      AND length(trim(s.location)) > 0
  ),
  ranked AS (
    -- Stable, per-(name, city, address) ordering so slugs are reproducible
    SELECT
      v.*,
      row_number() OVER (
        PARTITION BY v.brand_id, lower(trim(v.name))
        ORDER BY lower(COALESCE(v.city, '')), lower(COALESCE(v.address, ''))
      ) AS rn
    FROM venues v
  ),
  inserted AS (
    INSERT INTO public.locations (
      brand_id, name, city, address, active, slug
    )
    SELECT
      r.brand_id,
      trim(r.name),
      r.city,
      r.address,
      true,
      -- Slug: name, optionally suffixed with -city, then a numeric counter
      -- only when multiple venues share the same name (e.g. Tractor Supply
      -- appears in 10 cities, so we get -1, -2, … -10).
      -- Use [[:alnum:]] so uppercase letters aren't stripped (e.g. "Tractor
      -- Supply" → "tractor-supply", not "ractor-upply").
      trim(BOTH '-' FROM lower(regexp_replace(trim(r.name), '[^[:alnum:]]+', '-', 'g')))
        || CASE
             WHEN r.city IS NOT NULL AND length(trim(r.city)) > 0
               THEN '-' || trim(BOTH '-' FROM lower(regexp_replace(trim(r.city), '[^[:alnum:]]+', '-', 'g')))
             ELSE ''
           END
        || CASE WHEN r.rn > 1 THEN '-' || r.rn::text ELSE '' END
    FROM ranked r
    WHERE NOT EXISTS (
      SELECT 1 FROM public.locations l
      WHERE l.brand_id  = r.brand_id
        AND l.name      = trim(r.name)
        AND l.deleted_at IS NULL
        AND lower(COALESCE(l.city,    '')) = lower(COALESCE(r.city,    ''))
        AND lower(COALESCE(l.address, '')) = lower(COALESCE(r.address, ''))
    )
    RETURNING id, name, city, address
  )
  SELECT COUNT(*) INTO v_inserted FROM inserted;
  RAISE NOTICE 'Inserted % new per-city locations', v_inserted;

  -- 2. Re-link each stop to the location whose (name, city, address) matches.
  --    Use lower() on both sides for case-insensitive matching.
  WITH new_links AS (
    SELECT
      s.id AS stop_id,
      l.id AS location_id
    FROM public.stops s
    JOIN public.locations l
      ON l.brand_id  = s.brand_id
     AND lower(trim(l.name)) = lower(trim(s.location))
     AND lower(COALESCE(l.city,    '')) = lower(COALESCE(NULLIF(btrim(s.city),    ''), ''))
     AND lower(COALESCE(l.address, '')) = lower(COALESCE(NULLIF(btrim(s.address), ''), ''))
     AND l.deleted_at IS NULL
    WHERE s.brand_id = v_brand_id
      AND s.deleted_at IS NULL
  )
  UPDATE public.stops s
  SET location_id = nl.location_id
  FROM new_links nl
  WHERE s.id = nl.stop_id;

  GET DIAGNOSTICS v_relinked = ROW_COUNT;
  RAISE NOTICE 'Re-linked % stops to their per-city locations', v_relinked;

  -- 3. Soft-delete any location that no longer has a non-deleted stop pointing
  --    to it. (These are the over-grouped originals from the previous dedupe.)
  UPDATE public.locations l
  SET deleted_at = NOW()
  WHERE l.brand_id = v_brand_id
    AND l.deleted_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.stops s
      WHERE s.location_id = l.id
        AND s.deleted_at IS NULL
    );

  GET DIAGNOSTICS v_soft_del = ROW_COUNT;
  RAISE NOTICE 'Soft-deleted % now-orphan locations', v_soft_del;
END$$;

-- Final summary
SELECT
  (SELECT COUNT(*) FROM public.locations
     WHERE brand_id = '64294306-5f42-463d-a5e8-2ad6c81a96de' AND deleted_at IS NULL) AS locations,
  (SELECT COUNT(*) FROM public.stops
     WHERE brand_id = '64294306-5f42-463d-a5e8-2ad6c81a96de' AND deleted_at IS NULL AND location_id IS NOT NULL) AS linked_stops,
  (SELECT COUNT(*) FROM public.locations
     WHERE brand_id = '64294306-5f42-463d-a5e8-2ad6c81a96de' AND deleted_at IS NOT NULL) AS soft_deleted;
