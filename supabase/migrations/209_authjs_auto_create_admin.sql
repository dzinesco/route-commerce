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

-- Defensive: ensure admin_users.user_id has a unique constraint so the
-- `ON CONFLICT (user_id)` below resolves. The table was created via the
-- Supabase dashboard — we can't be sure the dashboard created a UNIQUE
-- index on user_id. If the constraint is missing, the ON CONFLICT
-- clause will fail the whole "Apply migrations" step on the deploy
-- runner. Skip silently if a matching unique/primary constraint already
-- exists, otherwise add one (cleaning up any duplicate rows first so
-- the ADD CONSTRAINT doesn't fail).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.admin_users'::regclass
      AND contype IN ('u', 'p')           -- unique or primary key
      AND pg_get_constraintdef(oid) ILIKE '%(user_id)%'
  ) THEN
    -- Shouldn't happen in practice (this RPC is the only writer for new
    -- rows), but guard against duplicate user_id values that would
    -- block the unique constraint from being created.
    DELETE FROM admin_users a
    USING admin_users b
    WHERE a.user_id = b.user_id
      AND a.ctid > b.ctid;
    ALTER TABLE admin_users
      ADD CONSTRAINT admin_users_user_id_key UNIQUE (user_id);
  END IF;
END $$;

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
