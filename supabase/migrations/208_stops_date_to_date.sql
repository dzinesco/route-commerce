-- Migration 208: Change stops.date from TIMESTAMPTZ to DATE
--
-- Why
-- ---
-- The `stops.date` column was created as TIMESTAMPTZ but is used throughout
-- the app as a calendar date (no time-of-day component). The mismatch
-- forces every client consumer to do `new Date(s.date + "T00:00:00")` to
-- coerce the timestamp into a local-midnight Date — and that hack silently
-- produces an Invalid Date when Supabase returns a `2026-06-15 00:00:00+00`
-- style string, leaving the Stops & Routes calendar empty.
--
-- Storing the column as DATE makes Supabase return a clean `YYYY-MM-DD`
-- string, which the existing `+ "T00:00:00"` parsing handles correctly.
--
-- The `time` (TEXT, "HH:MM") and `cutoff_time` (TIMESTAMPTZ) columns are
-- unchanged — they legitimately carry time-of-day information.
--
-- Affected RPC
-- -------------
-- `get_public_stops_for_brand` declares `date TIMESTAMPTZ` in its
-- RETURNS TABLE. Recreate it with `date DATE` so the return type matches
-- the underlying column.

-- 1. Drop the existing RPC so we can recreate it with a new return type.
--    PostgreSQL refuses CREATE OR REPLACE when the OUT-parameter row type
--    changes (error 42P13).
DROP FUNCTION IF EXISTS get_public_stops_for_brand(TEXT);

-- 2. Convert the column. USING date::DATE truncates the time component,
--    which is what we want — all existing rows are stored at 00:00 anyway.
ALTER TABLE public.stops
  ALTER COLUMN date TYPE DATE USING date::DATE;

-- 3. Recreate the public RPC with the corrected return type.
CREATE OR REPLACE FUNCTION get_public_stops_for_brand(p_brand_slug TEXT)
RETURNS TABLE (
  id UUID,
  city TEXT,
  state TEXT,
  date DATE,
  "time" TEXT,
  location TEXT,
  address TEXT,
  slug TEXT,
  cutoff_time TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.city,
    s.state,
    s.date,
    s."time",
    s.location,
    s.address,
    s.slug,
    s.cutoff_time
  FROM stops s
  INNER JOIN brands b ON s.brand_id = b.id
  WHERE s.active = true
    AND b.slug = p_brand_slug
  ORDER BY s.date ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_public_stops_for_brand(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_public_stops_for_brand(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_public_stops_for_brand(TEXT) TO service_role;
