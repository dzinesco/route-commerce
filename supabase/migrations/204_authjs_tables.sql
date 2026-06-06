-- ============================================================
-- Auth.js (NextAuth v5) tables
-- ============================================================
-- Schema expected by @auth/pg-adapter.
-- Reference: https://authjs.dev/getting-started/adapters/pg
--
-- Column names are kept as the adapter expects them (case-sensitive,
-- camelCase, quoted). Do NOT rename these without also updating the
-- adapter code in node_modules/@auth/pg-adapter.
--
-- We use UUIDs for user ids (consistent with the rest of the platform)
-- rather than SERIAL. The adapter doesn't care what type `id` is — it
-- just passes the value through.
-- ============================================================

-- ── users ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT,
    email           TEXT UNIQUE,
    "emailVerified" TIMESTAMPTZ,
    image           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── accounts ─────────────────────────────────────────────────
-- One row per (provider, providerAccountId). Links external OAuth
-- accounts to a local user.
CREATE TABLE IF NOT EXISTS accounts (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId"             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type                 TEXT NOT NULL,
    provider             TEXT NOT NULL,
    "providerAccountId"  TEXT NOT NULL,
    refresh_token        TEXT,
    access_token         TEXT,
    expires_at           BIGINT,
    id_token             TEXT,
    scope                TEXT,
    session_state        TEXT,
    token_type           TEXT,
    UNIQUE (provider, "providerAccountId")
);

CREATE INDEX IF NOT EXISTS accounts_userid_idx ON accounts ("userId");

-- ── sessions ─────────────────────────────────────────────────
-- One row per active session. With database strategy enabled, the
-- session token is stored here and looked up on every request.
CREATE TABLE IF NOT EXISTS sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId"        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires         TIMESTAMPTZ NOT NULL,
    "sessionToken"  TEXT NOT NULL UNIQUE
);

CREATE INDEX IF NOT EXISTS sessions_userid_idx ON sessions ("userId");
CREATE INDEX IF NOT EXISTS sessions_expires_idx ON sessions (expires);

-- ── verification_token ──────────────────────────────────────
-- Used for email magic-link / passwordless flows. Not used by the
-- Google provider, but the adapter still references the table.
CREATE TABLE IF NOT EXISTS verification_token (
    identifier  TEXT NOT NULL,
    expires     TIMESTAMPTZ NOT NULL,
    token       TEXT NOT NULL,
    PRIMARY KEY (identifier, token)
);

-- ── Grant access to the pg pool used by the Auth.js adapter ──
-- (No-op if you're connecting as the table owner; included for
-- completeness in case a separate app role is used.)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON users, accounts, sessions, verification_token TO authenticator;
