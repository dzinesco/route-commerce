-- 209_authjs_auto_create_admin.sql
-- Auto-create a platform_admin row when a new user signs in via Auth.js.
--
-- Called from the `signIn` event in `src/lib/auth.ts`. The RPC is
-- idempotent (ON CONFLICT DO NOTHING) so repeat sign-ins are no-ops.

-- Defensive: ensure can_manage_settings column exists. It was likely
-- added via the Supabase dashboard (it's referenced in the TypeScript
-- `AdminUser` type at `src/lib/admin-permissions-types.ts` but not in
-- any tracked migration). ADD COLUMN IF NOT EXISTS is safe to re-run.
ALTER TABLE admin_users
  ADD COLUMN IF NOT EXISTS can_manage_settings BOOLEAN NOT NULL DEFAULT false;

-- SECURITY DEFINER RPC: upsert a platform_admin row for the given
-- Auth.js user id.
--
-- Bypasses RLS on admin_users (which is enabled — see
-- 109_enable_rls_critical.sql:21). Runs with the function owner's
-- privileges so the auto-create on first sign-in can always succeed.
CREATE OR REPLACE FUNCTION upsert_admin_user_for_authjs(p_user_id UUID)
RETURNS SETOF admin_users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  INSERT INTO admin_users (
    user_id,
    role,
    active,
    must_change_password,
    can_manage_products,
    can_manage_stops,
    can_manage_orders,
    can_manage_pickup,
    can_manage_messages,
    can_manage_refunds,
    can_manage_users,
    can_manage_water_log,
    can_manage_reports,
    can_manage_settings
  )
  VALUES (
    p_user_id,
    'platform_admin',
    true,
    false,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true
  )
  ON CONFLICT (user_id) DO NOTHING
  RETURNING *;
END;
$$;

-- Reload PostgREST schema cache so the new RPC is immediately callable.
NOTIFY pgrst, 'reload schema';
