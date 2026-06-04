-- Migration 204: Add permissive read policy for locations
--
-- Why: The admin Stops & Routes page reads stops via the Supabase JS client
-- (anon key + RLS). The `stops` table has a `Public read stops` policy with
-- qual=true, which lets the anon role see all non-deleted stops — that's how
-- the page works in dev mode (no Supabase auth). The admin_locations tab needs
-- the same behavior so the server component can use the same pattern:
--   supabase.from("locations").select(...)
--
-- Brand scoping is enforced at the application layer in the server component
-- (eq("brand_id", adminUser.brand_id)), matching how stops are scoped.
--
-- Brand-scoped public reads (storefront pages) go through get_locations_for_brand
-- RPC, which filters active=true.

DROP POLICY IF EXISTS "Public read locations" ON public.locations;
CREATE POLICY "Public read locations" ON public.locations
  FOR SELECT
  USING (true);
