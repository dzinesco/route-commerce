-- 204_admin_users_email_and_auth_subject.sql
--
-- Prepare `admin_users` for Auth.js v5 multi-provider sign-in.
--
-- Context:
--   The platform is migrating from a Supabase-only auth flow to Auth.js v5
--   with multiple providers (Google, Supabase password). With Auth.js, a
--   sign-in "subject" is the provider's stable user identifier:
--     - Supabase password: a UUID (matches `auth.users.id`).
--     - Google OAuth: an opaque string (the Google `sub` claim).
--   The existing `admin_users.user_id UUID` column can only hold Supabase
--   UUIDs, so Google sign-ins have nowhere to land. We also need the
--   `admin_users` row to carry an `email` directly so server-side lookups
--   no longer have to JOIN `auth.users` (which won't exist for Google users
--   anyway).
--
-- This migration:
--   1. Adds `email`, `auth_provider`, `auth_subject` columns.
--   2. Backfills `email` + `auth_provider` for existing Supabase rows.
--   3. Adds a unique index on `(auth_provider, auth_subject)` so the same
--      Google subject can't be provisioned twice.
--   4. Replaces `upsert_admin_user` with a version that accepts email +
--      provider + subject and can mint first-time Google sign-ins.
--   5. Adds `get_admin_user_for_session` so the application layer can
--      resolve an Auth.js `session.user.id` to an admin row in one call
--      (no `auth.users` join required).
--
-- This is idempotent — re-running is safe.

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. Schema additions
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.admin_users
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS auth_provider TEXT,
  ADD COLUMN IF NOT EXISTS auth_subject TEXT;

-- Backfill: pull email + mark existing rows as Supabase-originated.
UPDATE public.admin_users au
SET
  email = COALESCE(au.email, u.email),
  auth_provider = COALESCE(au.auth_provider, 'supabase')
FROM auth.users u
WHERE au.user_id = u.id
  AND (au.email IS NULL OR au.auth_provider IS NULL);

-- Backfill the remaining rows (no auth.users match) so the NOT NULL
-- constraint below doesn't reject them. These are likely orphaned test
-- rows; flag them with provider='supabase-orphan' for visibility.
UPDATE public.admin_users
SET
  email = COALESCE(email, 'unknown-' || id::TEXT || '@orphan.local'),
  auth_provider = COALESCE(auth_provider, 'supabase-orphan')
WHERE email IS NULL OR auth_provider IS NULL;

-- Enforce that every row carries an email and a provider. The lookup
-- RPCs rely on `email` being NOT NULL.
ALTER TABLE public.admin_users
  ALTER COLUMN email SET NOT NULL,
  ALTER COLUMN auth_provider SET NOT NULL;

-- CHECK: a row must have either a Supabase `user_id` (UUID) or an
-- `auth_subject` (Google etc.). This catches the case where a row is
-- accidentally inserted with neither.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'admin_users_subject_check'
  ) THEN
    ALTER TABLE public.admin_users
      ADD CONSTRAINT admin_users_subject_check
      CHECK (user_id IS NOT NULL OR auth_subject IS NOT NULL);
  END IF;
END $$;

-- Index: fast lookup by Auth.js session id (which is `auth_subject` for
-- Google, `user_id` for Supabase).
CREATE INDEX IF NOT EXISTS admin_users_user_id_idx
  ON public.admin_users (user_id)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS admin_users_auth_subject_idx
  ON public.admin_users (auth_provider, auth_subject)
  WHERE auth_subject IS NOT NULL;

-- Unique: prevent the same Google subject from being provisioned twice.
CREATE UNIQUE INDEX IF NOT EXISTS admin_users_auth_subject_unique
  ON public.admin_users (auth_provider, auth_subject)
  WHERE auth_subject IS NOT NULL;

-- Index: fast lookup by email (used for admin invites + future "sign in
-- with email" flows).
CREATE INDEX IF NOT EXISTS admin_users_email_idx
  ON public.admin_users (email);

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. upsert_admin_user — replace with multi-provider version
-- ═══════════════════════════════════════════════════════════════════════════

-- Drop the old single-arg version if it exists (Supabase may have
-- auto-generated it). Idempotent.
DROP FUNCTION IF EXISTS public.upsert_admin_user(UUID);

CREATE OR REPLACE FUNCTION public.upsert_admin_user(
  p_user_id UUID DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_auth_provider TEXT DEFAULT 'supabase',
  p_auth_subject TEXT DEFAULT NULL
)
RETURNS public.admin_users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing public.admin_users;
  v_inserted public.admin_users;
BEGIN
  -- 1. Find an existing row by the strongest signal we have.
  IF p_auth_subject IS NOT NULL AND p_auth_provider <> 'supabase' THEN
    SELECT * INTO v_existing
    FROM public.admin_users
    WHERE auth_provider = p_auth_provider
      AND auth_subject = p_auth_subject
    LIMIT 1;
  ELSIF p_user_id IS NOT NULL THEN
    SELECT * INTO v_existing
    FROM public.admin_users
    WHERE user_id = p_user_id
    LIMIT 1;
  ELSIF p_email IS NOT NULL THEN
    SELECT * INTO v_existing
    FROM public.admin_users
    WHERE lower(email) = lower(p_email)
    LIMIT 1;
  END IF;

  IF v_existing.id IS NOT NULL THEN
    -- 2a. Update missing fields in place (e.g. fill in `email` if the
    --     row was orphaned at provision time).
    UPDATE public.admin_users
    SET
      email = COALESCE(email, p_email),
      auth_provider = COALESCE(NULLIF(auth_provider, 'supabase-orphan'), p_auth_provider),
      auth_subject = COALESCE(auth_subject, p_auth_subject),
      user_id = COALESCE(user_id, p_user_id)
    WHERE id = v_existing.id
    RETURNING * INTO v_existing;
    RETURN v_existing;
  END IF;

  -- 2b. First-time sign-in. Insert a platform_admin row. Active is
  --     true so the user can sign in immediately; brand assignment is
  --     a manual step the platform admin takes later.
  INSERT INTO public.admin_users (
    user_id, email, auth_provider, auth_subject, role, active,
    can_manage_products, can_manage_stops, can_manage_orders,
    can_manage_pickup, can_manage_messages, can_manage_refunds,
    can_manage_users, can_manage_water_log, can_manage_reports,
    must_change_password
  ) VALUES (
    p_user_id, p_email, p_auth_provider, p_auth_subject,
    'platform_admin', true,
    true, true, true, true, true, true, true, true, true,
    false
  )
  RETURNING * INTO v_inserted;

  RETURN v_inserted;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. get_admin_user_for_session — Auth.js session resolver
-- ═══════════════════════════════════════════════════════════════════════════

-- Returns the admin row matching an Auth.js `session.user.id`, looking
-- up by `user_id` (Supabase UUID) OR `auth_subject` (Google etc.).
-- Returns NULL on miss — the application layer decides whether to
-- auto-provision a new row.
DROP FUNCTION IF EXISTS public.get_admin_user_for_session(TEXT);

CREATE OR REPLACE FUNCTION public.get_admin_user_for_session(p_session_id TEXT)
RETURNS public.admin_users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.admin_users;
BEGIN
  -- Try Supabase path first (UUID match on user_id).
  IF p_session_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    SELECT * INTO v_row
    FROM public.admin_users
    WHERE user_id = p_session_id::UUID
    LIMIT 1;
    IF v_row.id IS NOT NULL THEN
      RETURN v_row;
    END IF;
  END IF;

  -- Fallback: treat the session id as a provider `auth_subject`. The
  -- provider is unknown at this point, so match on the subject alone
  -- (still unique thanks to the partial unique index).
  SELECT * INTO v_row
  FROM public.admin_users
  WHERE auth_subject = p_session_id
  LIMIT 1;

  RETURN v_row;
END;
$$;
