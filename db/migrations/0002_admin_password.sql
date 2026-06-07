-- 0002_admin_password.sql
--
-- Adds a `password_hash` column to `users` so the Auth.js Credentials
-- provider can verify email + password against the database.
--
-- Idempotent: uses `ADD COLUMN IF NOT EXISTS`. The column is nullable
-- because OAuth-only users (Google) never set a password.
--
-- The Credentials provider's `authorize` function is documented in
-- `src/lib/auth.ts` — it queries this column and runs `verifyPassword`
-- (see `src/lib/passwords.ts`) before returning the user.

BEGIN;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Update the updated_at trigger tracking — no new triggers needed since
-- `users` already has `set_updated_at` from migration 0001.

COMMIT;
