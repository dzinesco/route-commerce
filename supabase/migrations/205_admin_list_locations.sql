-- Migration 205: admin_list_locations RPC
--
-- Returns ALL non-deleted locations for a brand (including inactive) with a
-- stop_count aggregation. Mirrors get_locations_for_brand but is brand_id-
-- keyed and admin-side (no active filter) so the Locations tab in the admin
-- Stops & Routes page can show inactive venues and draft venues.
--
-- brand_id NULL means platform_admin scope (all brands). This is the
-- standard application-layer brand-scoping pattern (SECURITY DEFINER RPCs
-- bypass RLS; caller is responsible for authorization).

CREATE OR REPLACE FUNCTION public.admin_list_locations(
  p_brand_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id            UUID,
  brand_id      UUID,
  name          TEXT,
  address       TEXT,
  city          TEXT,
  state         TEXT,
  zip           TEXT,
  phone         TEXT,
  contact_name  TEXT,
  contact_email TEXT,
  notes         TEXT,
  active        BOOLEAN,
  created_at    TIMESTAMPTZ,
  updated_at    TIMESTAMPTZ,
  deleted_at    TIMESTAMPTZ,
  slug          TEXT,
  stop_count    BIGINT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    l.id, l.brand_id, l.name, l.address, l.city, l.state, l.zip,
    l.phone, l.contact_name, l.contact_email, l.notes, l.active,
    l.created_at, l.updated_at, l.deleted_at, l.slug,
    COALESCE(s.cnt, 0) AS stop_count
  FROM public.locations l
  LEFT JOIN (
    SELECT location_id, COUNT(*) AS cnt
    FROM public.stops
    WHERE deleted_at IS NULL
    GROUP BY location_id
  ) s ON s.location_id = l.id
  WHERE l.deleted_at IS NULL
    AND (p_brand_id IS NULL OR l.brand_id = p_brand_id)
  ORDER BY lower(l.name) ASC;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_locations(UUID)
  TO anon, authenticated, service_role;
