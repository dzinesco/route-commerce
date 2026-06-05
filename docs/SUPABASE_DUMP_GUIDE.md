# Supabase Dump & Restore Guide

This guide is the runbook for when your brother removes the Supabase
spend cap and we can finally connect to the live Supabase project to
pull the real schema + data.

## Prerequisites

- Brother has removed the Supabase spend cap (project status: ACTIVE_HEALTHY)
- Supabase project ref: `wnzkhezyhnfzhkhiflrp` (from CLAUDE.md)
- Supabase DB password: `YLKzP9jz2yqop7jr` (user-provided)
- Local Postgres running on `127.0.0.1:5432` (user: `routecommerce`,
  password: `routecommerce_dev_password`, db: `route_commerce`)

## Connection Test

The Supabase hostname has NO IPv4 address from this dev box. You
must use the **Supabase Supavisor pooler** (port 6543) which resolves
over IPv4. From your home network, you can also use the direct
hostname on port 5432.

```bash
# Direct hostname (home network only — dev box has no IPv6)
psql "postgres://postgres.wnzkhezyhnfzhkhiflrp:YLKzP9jz2yqop7jr@db.wnzkhezyhnfzhkhiflrp.supabase.co:5432/postgres"

# Pooler (works from dev box — IPv4 only)
psql "postgres://postgres.wnzkhezyhnfzhkhiflrp:YLKzP9jz2yqop7jr@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
```

If neither works after the cap is removed, check:
1. `getent hosts db.wnzkhezyhnfzhkhiflrp.supabase.co` — should return IPv4
2. Supabase dashboard → Settings → API → "Direct connection" string

## Capture Schema (no data)

```bash
# From your home network, with the password set:
PGPASSWORD="YLKzP9jz2yqop7jr" pg_dump \
  --host=db.wnzkhezyhnfzhkhiflrp.supabase.co \
  --port=5432 \
  --username=postgres \
  --dbname=postgres \
  --schema-only \
  --no-owner \
  --no-privileges \
  --no-acl \
  --file=supabase/captured_schema.sql
```

This produces a SQL file with all CREATE TABLE, CREATE FUNCTION,
CREATE INDEX, etc. statements. May be 50-200 MB depending on the
function count. **Compress it before committing:**

```bash
gzip supabase/captured_schema.sql  # → captured_schema.sql.gz
```

## Capture Data (no schema)

```bash
PGPASSWORD="YLKzP9jz2yqop7jr" pg_dump \
  --host=db.wnzkhezyhnfzhkhiflrp.supabase.co \
  --port=5432 \
  --username=postgres \
  --dbname=postgres \
  --data-only \
  --no-owner \
  --no-privileges \
  --no-acl \
  --disable-triggers \
  --file=supabase/captured_data.sql
```

Use `--disable-triggers` so the dump skips triggers that might fire
on INSERT and slow things down. Compress:

```bash
gzip supabase/captured_data.sql
```

## Restore to Local DB

```bash
cd /path/to/route-commerce
export PGPASSWORD=routecommerce_dev_password

# 1. Wipe the synthesized schema
psql -U routecommerce -h 127.0.0.1 -d route_commerce \
  -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# 2. Apply the real schema
zcat supabase/captured_schema.sql.gz | \
  psql -U routecommerce -h 127.0.0.1 -d route_commerce \
  -v ON_ERROR_STOP=1 2>&1 | tee /tmp/schema_restore.log

# 3. Apply the data
zcat supabase/captured_data.sql.gz | \
  psql -U routecommerce -h 127.0.0.1 -d route_commerce \
  -v ON_ERROR_STOP=1 2>&1 | tee /tmp/data_restore.log
```

## Verify

```bash
# Should show ~70+ tables (not just the 70 from the synthesized schema)
psql -U routecommerce -h 127.0.0.1 -d route_commerce -c "\dt"

# Should show actual data, not 0 rows everywhere
psql -U routecommerce -h 127.0.0.1 -d route_commerce -c "SELECT count(*) FROM brands;"
psql -U routecommerce -h 127.0.0.1 -d route_commerce -c "SELECT count(*) FROM products;"
psql -U routecommerce -h 127.0.0.1 -d route_commerce -c "SELECT count(*) FROM orders;"
```

## Clean Up

```bash
# Once verified, drop the synthesized schema (no longer needed)
rm supabase/synthesized/000_base_schema.sql
git add -A
git commit -m "remove synthesized schema (real dump now in place)"
```

## Schema-Per-Brand Restructure (FUTURE, not in this dump)

The user wants each brand in its own Postgres schema:
- `brand_tuxedo` — products, orders, stops, etc. for Tuxedo
- `brand_indian_river_direct` — products, orders, stops, etc. for IRD

This is a major refactor and is **NOT** part of the dump-and-restore.
Plan for it as a follow-up phase once the data is loaded into shared
tables and the app is verified working.

The refactor will involve:
1. Creating schemas `brand_tuxedo`, `brand_indian_river_direct`
2. Moving brand-specific tables into the appropriate schema
3. Updating all RPC SECURITY DEFINER functions to set
   `search_path` based on caller brand
4. Updating server actions to set `search_path` per request
5. Updating PostgREST config to expose schemas
6. Testing brand isolation thoroughly

## Troubleshooting

### "password authentication failed"
Password has been rotated. Check Supabase dashboard → Settings →
Database → Reset password. The user-provided password
`YLKzP9jz2yqop7jr` may need to be reset.

### "could not translate host name"
Dev box has no IPv6. Use the pooler hostname
`aws-0-us-east-1.pooler.supabase.com` or run from a machine with IPv6.

### "permission denied for schema auth"
The dump includes the `auth` schema which is Supabase-managed.
Filter it out with: `--exclude-schema=auth --exclude-schema=storage
--exclude-schema=realtime --exclude-schema=supabase_functions`.

### "relation already exists"
You forgot step 1 (DROP SCHEMA public CASCADE). The data restore
runs `INSERT` and may not recreate tables — only the schema dump
does that.

### "out of memory" during data restore
The data file is huge. Use `--single-transaction` to keep
Postgres from spilling to disk:

```bash
zcat supabase/captured_data.sql.gz | \
  psql -U routecommerce -h 127.0.0.1 -d route_commerce \
  --single-transaction \
  -v ON_ERROR_STOP=0 2>&1 | tee /tmp/data_restore.log
```

### Data dump is too big to commit
Don't commit it. The data file is in `.gitignore` and gets
re-loaded on first run via a one-shot script.
