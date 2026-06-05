-- 000_preflight_supabase_compat.sql
-- Stubs out Supabase-specific schemas/roles/functions so the
-- Supabase-flavored migrations in this folder can apply to plain
-- Postgres + PostgREST. Run FIRST.
--
-- In a real Supabase deployment, these are created automatically by
-- the platform. Here we recreate the minimum surface area the rest
-- of the migrations depend on.

-- ── Extensions Supabase preinstalls ─────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Roles Supabase normally provides ──────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN BYPASSRLS;
  END IF;
END
$$;

-- ── auth schema (Supabase Auth lives here; we just need uid() and friends)
CREATE SCHEMA IF NOT EXISTS auth;

-- auth.uid() — Supabase returns the user id from the JWT. In our self-hosted
-- setup the app can SET LOCAL "request.jwt.claim.sub" = '<uuid>' before
-- calling PostgREST. Default to NULL for unauthenticated requests.
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::UUID
$$;

CREATE OR REPLACE FUNCTION auth.role()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(NULLIF(current_setting('request.jwt.claim.role', true), ''), 'anon')
$$;

CREATE OR REPLACE FUNCTION auth.email()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.email', true), '')
$$;

-- ── storage schema intentionally omitted ───────────────────────────
-- We're replacing Supabase Storage with MinIO. The storage migrations
-- (087, 099-contact-imports, 145) have been deleted from this folder.

-- Grant the stub roles access to the public schema so RPCs can be called as them
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;

-- Make sure the routecommerce user can act as these roles (PostgREST will
-- SET ROLE before executing requests, depending on the JWT).
GRANT anon TO routecommerce;
GRANT authenticated TO routecommerce;
GRANT service_role TO routecommerce;
