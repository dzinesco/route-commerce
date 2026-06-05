# Supabase Dump & Restore Guide

This guide is the runbook for capturing the real Supabase schema and data
and restoring it to a local Postgres database. It documents the exact
steps that worked when the spend cap was removed on 2026-06-05.

## Connection (this works from the dev box)

The Supabase project `wnzkhezyhnfzhkhiflrp` (route-commerce) is hosted in
**East US (North Virginia)**. The dev box has no IPv6, so we must use
the **Supavisor pooler** (IPv4 only) — and it's on **`aws-1`**, not `aws-0`.

```bash
# Working pooler URL (from supabase/.temp/pooler-url)
postgresql://postgres.wnzkhezyhnfzhkhiflrp:YLKzP9jz2yqop7jr@aws-1-us-east-1.pooler.supabase.com:5432/postgres
```

The `aws-0-us-east-1.pooler.supabase.com` hostname resolves over IPv4
but Supavisor returns "tenant/user not found" because the project lives
on `aws-1`. The correct region number is non-obvious — always check
`supabase/.temp/pooler-url` for the actual endpoint.

The direct hostname `db.wnzkhezyhnfzhkhiflrp.supabase.co` only resolves
over IPv6, which is unreachable from this dev box.

## pg_dump version

Supabase runs **PostgreSQL 17.6**. Local pg must be ≥ 17 to dump cleanly.
The dev box had pg 16 by default — install pg 17 client:

```bash
echo "deb [signed-by=/usr/share/keyrings/pgdg.gpg] http://apt.postgresql.org/pub/repos/apt/ noble-pgdg main" \
  | sudo tee /etc/apt/sources.list.d/pgdg.list
sudo apt-get update
sudo apt-get install -y --allow-unauthenticated postgresql-client-17
# Use /usr/lib/postgresql/17/bin/pg_dump explicitly (or update PATH)
```

## Capture Schema

```bash
export PGPASSWORD="YLKzP9jz2yqop7jr"
export PATH="/usr/lib/postgresql/17/bin:$PATH"

mkdir -p supabase/captured
pg_dump \
  --host=aws-1-us-east-1.pooler.supabase.com \
  --port=5432 \
  --username=postgres.wnzkhezyhnfzhkhiflrp \
  --dbname=postgres \
  --schema-only \
  --no-owner \
  --no-privileges \
  --no-acl \
  --exclude-schema=auth \
  --exclude-schema=storage \
  --exclude-schema=realtime \
  --exclude-schema=supabase_functions \
  --exclude-schema=graphql \
  --exclude-schema=graphql_public \
  --exclude-schema=pgsodium \
  --exclude-schema=pgsodium_masks \
  --exclude-schema=extensions \
  --exclude-schema=pgbouncer \
  --exclude-schema=supabase_migrations \
  --exclude-schema=net \
  --exclude-schema=vault \
  --file=supabase/captured/captured_schema.sql
```

Captured schema is ~540KB, 65 tables, 252 functions.

## Capture Data

```bash
pg_dump \
  --host=aws-1-us-east-1.pooler.supabase.com \
  --port=5432 \
  --username=postgres.wnzkhezyhnfzhkhiflrp \
  --dbname=postgres \
  --data-only \
  --no-owner \
  --no-privileges \
  --no-acl \
  --disable-triggers \
  --exclude-schema=auth \
  --exclude-schema=storage \
  --exclude-schema=realtime \
  --exclude-schema=supabase_functions \
  --exclude-schema=graphql \
  --exclude-schema=graphql_public \
  --exclude-schema=pgsodium \
  --exclude-schema=pgsodium_masks \
  --exclude-schema=extensions \
  --exclude-schema=pgbouncer \
  --exclude-schema=supabase_migrations \
  --exclude-schema=net \
  --exclude-schema=vault \
  --file=supabase/captured/captured_data.sql
```

Captured data is ~130KB for this project's current size.

## Restore to Local DB (PostgreSQL 16)

PostgreSQL 16 doesn't support `transaction_timeout` (added in PG 17) and
doesn't have the `supabase_vault` extension. Pre-create the stub objects:

```bash
export PGPASSWORD=routecommerce_dev_password
psql -U routecommerce -h 127.0.0.1 -d route_commerce <<'SQL'
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO routecommerce;

-- extensions schema (referenced by dump as extensions.uuid_generate_v4())
CREATE SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" SCHEMA extensions;

-- Stub functions in extensions schema (real Supabase has pgcrypto.crypt etc.)
CREATE OR REPLACE FUNCTION extensions.uuid_generate_v4()
  RETURNS uuid LANGUAGE sql AS $$ SELECT gen_random_uuid(); $$;
CREATE OR REPLACE FUNCTION extensions.gen_salt(text)
  RETURNS text LANGUAGE sql AS $$ SELECT '$2a$06$' || repeat('A', 53); $$;
CREATE OR REPLACE FUNCTION extensions.crypt(text, text)
  RETURNS text LANGUAGE sql AS $$ SELECT $1; $$;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA extensions TO routecommerce;

-- auth stub (we excluded auth schema from dump, but RLS policies reference auth.uid())
CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE IF NOT EXISTS auth.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT,
  raw_user_meta_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID
  LANGUAGE sql STABLE AS $$ SELECT NULL::UUID; $$;
GRANT USAGE ON SCHEMA auth TO routecommerce;
GRANT ALL ON auth.users TO routecommerce;
GRANT EXECUTE ON FUNCTION auth.uid() TO routecommerce;

-- Drop Supabase-specific publications (we don't have realtime / vault)
DROP PUBLICATION IF EXISTS supabase_realtime;
DROP PUBLICATION IF EXISTS supabase_realtime_messages_publication;
SQL
```

Strip the PG17-only `SET transaction_timeout` line from the dump:

```bash
sed -i 's/^SET transaction_timeout = 0;$/-- transaction_timeout requires PG17 (we are on PG16); skipped/' \
  supabase/captured/captured_schema.sql
```

Apply schema and data (idempotent — re-runs are safe):

```bash
psql -U routecommerce -h 127.0.0.1 -d route_commerce -v ON_ERROR_STOP=0 \
  -f supabase/captured/captured_schema.sql 2>&1 | tail -20

psql -U routecommerce -h 127.0.0.1 -d route_commerce -v ON_ERROR_STOP=0 \
  -f supabase/captured/captured_data.sql 2>&1 | tail -20
```

Most errors on re-run are "already exists" — that's expected because the
dump is idempotent for CREATE statements (we used `IF NOT EXISTS` where
possible, but pg_dump doesn't add it for everything).

## Verify

```bash
psql -U routecommerce -h 127.0.0.1 -d route_commerce -c "SELECT count(*) FROM pg_tables WHERE schemaname='public';"
# Expect: 65

psql -U routecommerce -h 127.0.0.1 -d route_commerce -c "SELECT count(*) FROM pg_proc WHERE pronamespace=(SELECT oid FROM pg_namespace WHERE nspname='public');"
# Expect: ~250+

psql -U routecommerce -h 127.0.0.1 -d route_commerce -c "SELECT name, slug, created_at FROM brands ORDER BY created_at;"
# Expect 5 brands: Tuxedo Corn, Indian River Direct, Sunrise Farms, Green Valley Organics, Orchard Fresh
```

## What Didn't Work (don't try these)

| Approach | Why it failed |
|---|---|
| `psql ... db.wnzkhezyhnfzhkhiflrp.supabase.co:5432` | Hostname is IPv6-only, dev box has no IPv6 |
| `aws-0-us-east-1.pooler.supabase.com` | "tenant/user not found" — wrong region (project is on `aws-1`) |
| `pg_dump 16.x` against PG 17 server | "server version mismatch" — fatal error |
| `supabase db dump --linked` | Requires Docker (we don't have it) |

## Notes

- The captured data includes 3 test brands (Sunrise, Green Valley, Orchard)
  created on 2026-06-03 — these were test data the user added during the
  migration work, not real customers. They can be deleted safely.
- Tuxedo Corn and Indian River Direct are the real production brands.
- The schema dump is committed to git at `supabase/captured/captured_schema.sql.gz`
  for reproducibility. The data dump is gitignored (regenerate as needed).
- After dump, the local PostgREST needs a schema cache reload — restart
  the postgrest process or it'll serve stale metadata for ~30 seconds.

## Post-restore: clean up test brands

The captured production data includes 3 test brands with hardcoded
sequential UUIDs (`a1b2c3d4-…`, `b2c3d4e5-…`, `c3d4e5f6-…`) created
during the migration work. They have no related rows in any of the 38
tables that FK to `brands.id`, so deletion is safe (CASCADE / NO ACTION
on zero rows is a no-op).

```sql
BEGIN;
  DELETE FROM brands
  WHERE slug IN ('sunrise-farms', 'green-valley', 'orchard-fresh');
  -- expect DELETE 3
COMMIT;
```

Verify the real brands remain:

```sql
SELECT name, slug, plan_tier FROM brands ORDER BY created_at;
-- Tuxedo Corn         | tuxedo              | starter
-- Indian River Direct | indian-river-direct | starter
```

## Migrating Brand Assets (Supabase Storage → MinIO)

Brand logos and other Storage files are NOT in the Postgres dump. The
storage layer is now MinIO (S3-compatible) instead of Supabase Storage.

### Download assets from Supabase

```bash
# Make sure the target buckets exist in MinIO (one-time)
mc mb --ignore-existing local/brand-logos local/videos \
                        local/product-images local/contacts-imports \
                        local/water-photos

# Pull each asset via the public URL. Path is <bucket>/<key> after the
# /storage/v1/object/public/ prefix in the Supabase URL.
mkdir -p .data/assets
BRAND_ID="<your-brand-uuid>"
for fname in logo.png olathe-sweet-logo.png olathe-sweet-logo-dark.png; do
  curl -sf -o ".data/assets/$fname" \
    "https://<project-ref>.supabase.co/storage/v1/object/public/brand-logos/$BRAND_ID/$fname"
  mc cp ".data/assets/$fname" "local/brand-logos/$BRAND_ID/$fname"
done
```

### Point the DB at MinIO (portable /storage/... paths)

After capture, the `brand_settings.logo_url` etc. values still point at
the Supabase URL. Replace the base with a relative `/storage/` path so
the Next.js rewrite in `next.config.ts` can route to whichever MinIO
endpoint is configured per environment (dev → `localhost:9000`, prod →
`storage.route.crispygoat.com`).

```sql
UPDATE brand_settings
SET
  logo_url = REPLACE(logo_url, 'https://<project-ref>.supabase.co/storage/v1/object/public', '/storage'),
  logo_url_dark = REPLACE(logo_url_dark, 'https://<project-ref>.supabase.co/storage/v1/object/public', '/storage'),
  olathe_sweet_logo_url = REPLACE(olathe_sweet_logo_url, 'https://<project-ref>.supabase.co/storage/v1/object/public', '/storage'),
  olathe_sweet_logo_url_dark = REPLACE(olathe_sweet_logo_url_dark, 'https://<project-ref>.supabase.co/storage/v1/object/public', '/storage'),
  hero_image_url = REPLACE(hero_image_url, 'https://<project-ref>.supabase.co/storage/v1/object/public', '/storage');
```

### Why a rewrite instead of pointing at MinIO directly

Next.js's image optimizer (`/_next/image?url=...`) refuses to fetch
upstream images whose hostname resolves to a private IP. Local MinIO is
on `127.0.0.1` / `::1`, so URLs like `http://localhost:9000/...` get
blocked:

```
⨯ upstream image http://localhost:9000/... resolved to private ip
  ["::1","127.0.0.1"]
```

The rewrite in `next.config.ts` resolves `/storage/*` to the configured
MinIO base URL server-side, so the browser sees a same-origin URL and
the optimizer's private-IP check is bypassed:

```ts
async rewrites() {
  const storageBase = process.env.STORAGE_PUBLIC_URL || "http://localhost:9000";
  return [{ source: "/storage/:path*", destination: `${storageBase}/:path*` }];
}
```

For production, set `STORAGE_PUBLIC_URL` to the public MinIO endpoint
(e.g., `https://storage.route.crispygoat.com`) and the same DB values
work without modification.

### Hardcoded brand asset URLs in client components

A few components used `publicUrl(BUCKETS.BRAND_LOGOS, ...)` to build a
MinIO URL at module load (used as a fallback before client-side data
loads). Switch these to `/storage/...` paths so the rewrite covers them:

- `src/components/storefront/TuxedoVideoHero.tsx` — hero video + Olathe Sweet dark logo
- `src/components/time-tracking/TimeTrackingFieldClient.tsx` — field UI logo
- `src/app/tuxedo/about/page.tsx` — about page logo

`src/lib/email-service.ts` should keep using `publicUrl(...)` because
Resend fetches the URL server-side from its own network — relative
paths won't work for emails.
