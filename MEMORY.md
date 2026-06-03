# MEMORY.md — Persistent Session Context

This file captures key context, decisions, fixes, and state from recent work so it survives across conversations.

**Last updated:** 2026-06-03 (during Supabase migration apply session)

---

## Supabase CLI + Migrations Tooling

### Login + Link (done in this session)
- User ran `supabase login`
- We ran: `supabase link --project-ref wnzkhezyhnfzhkhiflrp`
- Link succeeded. Project appears as **LINKED** (●) in `supabase projects list`.
- Link state lives under `supabase/.temp/` (project-ref, linked-project.json, pooler-url, etc.). **Not** the legacy `.supabase/config.toml` at project root.
- This enables `supabase db query --linked`, `supabase migration list`, etc.

### Important Environment Note
- Direct Postgres connections (`db.wnzkhezyhnfzhkhiflrp.supabase.co:5432` using service role key as password) **do not work** from this workspace:
  - `getaddrinfo ENOTFOUND`
  - IPv6 "network is unreachable" in some cases
- HTTPS / Supabase REST / Management API work fine.
- Therefore the `push-migrations.js` **CLI path** (using linked project) is the only reliable way to apply migrations here.

### Updated Migration Script
File: `supabase/push-migrations.js`

Key changes:
- Detection logic now recognizes modern link: `supabase/.temp/project-ref` (in addition to old `.supabase/config.toml`).
- `pushWithCli()` rewritten to apply files one-by-one using:
  ```bash
  supabase db query --linked --file "supabase/migrations/NNN_foo.sql"
  ```
  (Previously tried `db push --db-url ...` which used direct connection and failed here.)
- Falls back to direct `pg` only if CLI path fails.
- Header comments updated with current recommended workflow.

**Recommended commands now:**
```bash
supabase login
supabase link --project-ref wnzkhezyhnfzhkhiflrp
node supabase/push-migrations.js 148          # or any prefix
# or
npm run migrate:one 148
```

`npm run migrate` (no arg) will push every `*.sql` in order (use with caution).

---

## Migration Files Patched in This Session

These changes were required to make the files actually apply successfully against the live remote schema (column drift, syntax errors, non-idempotent statements, pre-existing tables).

### 091_brand_plan_tier.sql
- Fixed syntax error: extra `)` in `get_brand_plan_info`:
  ```sql
  ... date >= date_trunc('month', now()));   -- was broken
  ```
  → `now());`

### 145_create_product_images_bucket.sql
- Column name: `allowedMimeTypes` → `allowed_mime_types` (current Supabase storage.buckets schema uses snake_case).
- Made idempotent:
  - Bucket insert now uses `WHERE NOT EXISTS (...)` (handles both id and name unique constraints).
  - Added `DROP POLICY IF EXISTS ...` before each `CREATE POLICY` (so re-runs don't fail).

Policies created:
- "Public can view product-images"
- "Admins can upload product-images"

### 148_public_stops_rpc.sql
- `time` is a reserved word in Postgres.
- Quoted the output column and the source reference:
  ```sql
  RETURNS TABLE ( ..., "time" TEXT, ... )
  ...
  s."time",
  ```
- GRANTs to anon/authenticated/service_role added at bottom.

### 200_production_features.sql
- `user_activity_logs` table originated in `036_user_activity_logs.sql` (no `brand_id`, different column names: `activity_type` + `details`).
- 200's `CREATE TABLE IF NOT EXISTS` was a no-op.
- Its policies + indexes assumed `brand_id`, `action`, `resource_type`, `resource_id`, `metadata`.
- Added after the CREATE TABLE block:
  ```sql
  ALTER TABLE user_activity_logs
    ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
    ... (other columns) ...
  ```
- This unblocked policy creation and indexes.

Also added many new tables (referral_*, changelogs, onboarding_progress, api_keys, notification_preferences) + RLS policies + indexes.

### 201_seed_data.sql
- Heavily truncated.
- Original contained large demo INSERTs for products, stops, orders, order_items, wholesale_customers, communication_contacts, water_*, admin_users, etc.
- These used outdated column lists vs. the live DB (e.g. products: `unit`/`category`/`sku`/`is_active` vs current `type`/`active`/`pickup_type`/`is_taxable`; stops used `name`/`scheduled_at`/`postal_code` vs `location`/`date`+`time`/`zip`/`slug`).
- Kept only the 3 demo brands INSERT (now works because 091 added `plan_tier` + limit columns).
- Added explanatory comment.
- File now ends cleanly after `COMMIT;`.

(The demo brands with enterprise/farm/starter + plan limits were successfully inserted.)

### Other notes on 147 / 202
- `147_admin_create_stop_rpcs.sql` and `202_fix_admin_create_stop.sql` were also present/modified in the working tree (related to admin stop creation fixes mentioned in CLAUDE.md).

---

## Successfully Applied (this session, via updated script)

Batches included (not exhaustive):
- 084 (shipments)
- 091 (plan tier + get_brand_plan_info)
- 142 (integration_credentials / resend + twilio RPCs)
- 143 (enable_route_trace via set_brand_feature)
- 144 (time_tracking_worker_number_rls)
- 145 (product-images bucket + policies)
- 146 (sitemap stops RPC)
- 147 (admin create stop RPCs)
- 148 (public stops RPC) — verified working
- 200 (production features)
- 201 (brands seed only)
- 202 (admin create stop fix)

Verification queries (post-apply) confirmed:
- shipments table exists
- get_resend_credentials / get_public_stops_for_brand / get_active_stops_with_brand functions exist
- product-images bucket + its two policies exist
- demo brand (sunrise-farms) has plan_tier = 'enterprise'
- etc.

---

## Current State / Gotchas

- `supabase migration list` will show a lot of "pending" because the project's custom numeric migrations (00x_*.sql) were historically applied via the raw-SQL push script, not registered in Supabase's `schema_migrations` tracking table. Only early ones (001/002) + many timestamped migrations from other activity are tracked.
- Many migrations are intentionally written to be re-runnable. Re-pushing a prefix is the supported workflow for this project.
- When adding **new** migrations in the future, prefer the standard `supabase migration new` flow if possible, but the custom `push-migrations.js` + numeric prefix style is still the established pattern here.
- Storage policies, RLS, SECURITY DEFINER functions, and brand-scoped data are all over the place — test carefully after big applies.
- CLAUDE.md already documents the overall migrate story and the `get_brand_settings` gotcha.

---

## How to Use This Memory

- Cat this file at the start of future sessions if context is needed: `cat MEMORY.md`
- Update this file with new key facts, applied migrations, or new gotchas.
- Feel free to add dated sections.

---

## Unrelated / Other Changes in Tree (as of last git status)

(See `git status --short` and `git diff` for full picture. Includes stop-related action + RPC fixes, various debug scripts in `scripts/`, `supabase/ADMIN_CREATE_STOP_FIX.sql`, a pricing assessment doc, etc.)

This MEMORY.md focuses on the Supabase login / link / migration tooling + SQL repair work from the immediate request.
