-- Migration: 148_public_stops_rpc.sql
-- Description: Public RPC to fetch active stops for a brand by slug.
-- Used by the /tuxedo and /indian-river-direct storefront stop pages
-- (refactored from client-side supabase.from() to server components).
--
-- SECURITY DEFINER bypasses RLS for a clean public read; the function
-- filters by brand slug + active=true so callers can't enumerate other
-- brands' stops. Granted to anon for public storefront access.

CREATE OR REPLACE FUNCTION get_public_stops_for_brand(p_brand_slug TEXT)
RETURNS TABLE (
  id UUID,
  city TEXT,
  state TEXT,
  date TIMESTAMPTZ,
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

-- Public storefront pages call this via the anon key.
GRANT EXECUTE ON FUNCTION get_public_stops_for_brand(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_public_stops_for_brand(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_public_stops_for_brand(TEXT) TO service_role;
