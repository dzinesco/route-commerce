-- Migration: 146_sitemap_stops_rpc.sql
-- Description: RPC to fetch active stops with brand slug for sitemap generation

CREATE OR REPLACE FUNCTION get_active_stops_with_brand()
RETURNS TABLE (
  slug TEXT,
  brand_slug TEXT,
  last_modified TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.slug,
    b.slug AS brand_slug,
    COALESCE(s.updated_at, s.created_at) AS last_modified
  FROM stops s
  INNER JOIN brands b ON s.brand_id = b.id
  WHERE s.active = true
    AND s.slug IS NOT NULL
    AND b.slug IN ('tuxedo', 'indian-river-direct')
  ORDER BY s.updated_at DESC;
END;
$$;

-- Grant execute to anon and service role
GRANT EXECUTE ON FUNCTION get_active_stops_with_brand() TO anon;
GRANT EXECUTE ON FUNCTION get_active_stops_with_brand() TO service_role;
GRANT EXECUTE ON FUNCTION get_active_stops_with_brand() TO authenticated;
