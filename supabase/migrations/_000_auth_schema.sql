-- _000_auth_schema.sql
--
-- Local stand-in for the Supabase `auth` schema. Supabase ships a
-- built-in `auth.users` table and `auth.uid()` / `auth.role()` functions
-- that SECURITY DEFINER RPCs read. For a direct-Postgres deployment
-- (no Supabase platform), we recreate the minimum surface those RPCs
-- depend on, and use Postgres session GUCs to thread the caller's
-- identity from the application layer.
--
-- Production auth model:
--   - Auth.js v5 manages the user session (Google OAuth in /login,
--     `dev_session` cookie for the demo flow).
--   - Each `pg` connection that calls a SECURITY DEFINER RPC first
--     runs `SELECT set_config('app.current_user_id', $1, true)` so
--     `auth.uid()` returns the correct value inside the RPC.
--   - The app-level middleware (`getAdminUser()`) is the primary
--     authorization gate; the RPCs are a defense-in-depth check that
--     the caller is in `admin_users` and not a foreign brand.
--
-- This file is local-only and should NOT be pushed to a Supabase-hosted
-- DB (the schema already exists there).

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. Schema
-- ═══════════════════════════════════════════════════════════════════════════

CREATE SCHEMA IF NOT EXISTS auth;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. auth.users — minimal Supabase-compatible shape
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Columns the migrations actually read:
--   id, email, raw_user_meta_data, raw_app_meta_data, encrypted_password
--   (Supabase's full schema has ~30 columns; the SECURITY DEFINER
--   functions in this codebase only need the four above.)

CREATE TABLE IF NOT EXISTS auth.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE,
  raw_user_meta_data JSONB DEFAULT '{}'::jsonb,
  raw_app_meta_data JSONB DEFAULT '{}'::jsonb,
  encrypted_password TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Mirror Supabase's `auth.identities` for the `update_admin_user`
-- trigger that writes back to `auth.users`. Most migrations don't
-- touch it; kept here so a stray FK / view doesn't blow up.
CREATE TABLE IF NOT EXISTS auth.identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  identity_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_id)
);

CREATE INDEX IF NOT EXISTS auth_identities_user_id_idx
  ON auth.identities (user_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. auth.uid() / auth.role() — session helpers
-- ═══════════════════════════════════════════════════════════════════════════
--
-- These mirror Supabase's signature. They read Postgres session GUCs
-- (`app.current_user_id` and `app.current_user_role`) that the
-- application layer sets before calling SECURITY DEFINER RPCs:
--
--   await client.query("SELECT set_config('app.current_user_id', $1, true)", [userId]);
--   await client.rpc("get_admin_users", { p_brand_id });
--
-- The `true` argument makes the setting transaction-local, so it
-- auto-resets at COMMIT / ROLLBACK — no leakage across pooled
-- connections.

CREATE OR REPLACE FUNCTION auth.uid()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.current_user_id', true), '')::UUID;
$$;

CREATE OR REPLACE FUNCTION auth.role()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(NULLIF(current_setting('app.current_user_role', true), ''), 'anon');
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. notify_pgrst — stub for PostgREST schema-reload signaling
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Some migrations `NOTIFY pgrst, 'reload schema'` to tell PostgREST to
-- refresh its cache. In a direct-pg deployment, no PostgREST runs, so
-- this is a no-op.

CREATE OR REPLACE FUNCTION public.notify_pgrst()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- no-op: no PostgREST to notify in a direct-pg deployment
  NULL;
END;
$$;
