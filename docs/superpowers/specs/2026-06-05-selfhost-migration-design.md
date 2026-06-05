# Supabase → Self-Hosted Migration — Design Spec

**Date:** 2026-06-05
**Status:** Approved
**Author:** Brainstorm session with user
**Target branch:** `selfhost/migrate` (to be created)
**Source branches:** `crispygoat/self-hosted-postgres` (6 commits) + `crispygoat/feat/better-auth` (1 commit, contains a detailed `plan.md`)

## Overview

Move Route Commerce off Supabase's hosted platform onto a self-hosted stack while preserving all data and behavior. Replace Supabase Auth with `better-auth`, Supabase Storage with MinIO, and Supabase's hosted Postgres with a plain Postgres instance fronted by PostgREST (the same protocol `supabase-js` and `@supabase/ssr` already speak). Consolidate two diverging branches that have been tackling different layers of this migration independently.

## Goals

1. **No data loss.** Full schema + data dump from the live Supabase project, restored on the new self-hosted Postgres.
2. **No band-aids.** Real self-hosted replacement, not runtime patches that paper over Supabase.
3. **App behavior unchanged.** All 137 SECURITY DEFINER RPCs, server actions, and client flows keep working with minimal code change.
4. **Single coherent path.** Merge the two in-flight branches into one, eliminate the divergence.
5. **Local + remote parity.** `docker compose up` works on the dev box and on the prod server (route.crispygoat.com).

## Non-Goals

- Replacing `supabase-js` / `@supabase/ssr` libraries. They speak PostgREST; we keep using them.
- Rewriting the 185 SECURITY DEFINER functions. They stay as-is; brand scoping is already in the function bodies / app layer.
- Changing the Stripe, Resend, Square, or any other non-Supabase integrations.
- Performance tuning of the new stack (separate follow-up).
- Adopting realtime (not used in current code) or Supabase Edge Functions (not used).

## Constraints

- **App must keep building** (`npx tsc --noEmit && npm run build`) without Supabase env vars.
- **Mock mode still works** for `NEXT_PUBLIC_USE_MOCK_DATA=true` deployments (demos, Netlify previews).
- **Dev mode bypass** (`dev_session=platform_admin` cookie) must continue to function for local testing.
- **No new external service dependencies** unless explicitly approved (i.e., we are not introducing Vercel Postgres, Neon, etc. — the stack is self-hosted).
- **Migration is reversible**: the Supabase project remains live until cutover is verified.

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│  Next.js app (Node, port 3100 via PM2)                                │
│                                                                       │
│  ┌────────────┐  ┌────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ supabase-js│  │ better-auth│  │ S3 SDK       │  │ middleware   │  │
│  │ → PostgREST│  │ (in-proc)  │  │ → MinIO      │  │ → /login     │  │
│  └─────┬──────┘  └──────┬─────┘  └──────┬───────┘  └──────────────┘  │
│        │ anon key       │ uses pg.Pool   │ MinIO creds                 │
└────────┼────────────────┼────────────────┼────────────────────────────┘
         │                │                │
         ▼                ▼                ▼
  ┌────────────┐    ┌────────────┐    ┌────────────┐
  │ PostgREST  │    │  Postgres  │    │   MinIO    │
  │  (port     │───▶│ (port 5432)│    │ (port 9000)│
  │   3001)    │    │            │    │  (S3 API)  │
  └────────────┘    └────────────┘    └────────────┘
```

Single Docker Compose stack on the prod server: `db` (Postgres 16) + `postgrest` + `minio` + `minio_init` (one-shot) + app under PM2.

## Branch & Merge Strategy

1. Create new branch `selfhost/migrate` from `main` (commit `9374e63`).
2. Cherry-pick the 6 commits from `crispygoat/self-hosted-postgres`:
   - `367a562` Add self-hosted Postgres docker-compose
   - `e8f2d76` Fix workflow: use actual secrets, fix env file writing
   - `beac3e4` Load .env.production from server before build
   - `fddb917` Use npm install instead of npm ci (no lockfile)
   - `8ad8dbb` Remove npm cache from workflow (local runner)
   - `988310f` Add Gitea Actions deploy workflow
3. Cherry-pick the 1 commit from `crispygoat/feat/better-auth`:
   - `456b5b1` Add MinIO storage + replace Supabase Storage with S3 SDK
4. Resolve conflicts (expected in `.env.example`, `.gitea/workflows/deploy.yml`, `docker-compose.yml`).
5. Apply the spec's Phase A migration patches on top.
6. Add the `MinIO` + `minio_init` services to `docker-compose.yml` (the better-auth branch only has app code; it relies on the self-hosted branch's infra setup, but neither has the MinIO service in compose).
7. Update `src/lib/supabase.ts` line 8: change `!supabaseUrl.includes("supabase.co")` to drop that condition so the real client is used against local PostgREST (currently this triggers mock mode whenever URL is non-Supabase).
8. Update Gitea deploy workflow to bring up the Docker stack on the prod server before starting the app.

## Env Vars (consolidated)

```bash
# ── App ──
NODE_ENV=production
NEXT_PUBLIC_BASE_URL=https://route.crispygoat.com
PORT=3100

# ── Postgres (self-hosted) ──
POSTGRES_USER=routecommerce
POSTGRES_PASSWORD=<strong-pw>
POSTGRES_DB=route_commerce
DATABASE_URL=postgresql://routecommerce:<pw>@db:5432/route_commerce?schema=public

# ── PostgREST ──
PGRST_SERVER_PORT=3001
PGRST_DB_URI=postgresql://routecommerce:<pw>@db:5432/route_commerce
PGRST_DB_ANON_ROLE=anon
PGRST_JWT_SECRET=<random>          # not used for auth; required by PostgREST

# ── better-auth ──
BETTER_AUTH_SECRET=<random>
BETTER_AUTH_URL=https://route.crispygoat.com
NEXT_PUBLIC_BETTER_AUTH_URL=https://route.crispygoat.com

# ── MinIO ──
MINIO_ROOT_USER=routecommerce
MINIO_ROOT_PASSWORD=<strong-pw>
NEXT_PUBLIC_STORAGE_BASE_URL=https://route.crispygoat.com/storage
STORAGE_ENDPOINT=http://minio:9000
STORAGE_REGION=us-east-1
STORAGE_ACCESS_KEY=routecommerce
STORAGE_SECRET_KEY=<strong-pw>
STORAGE_BUCKET_PREFIX=

# ── Supabase env vars (legacy, kept for supabase-js client) ──
# These now point at the local PostgREST instead of Supabase.
NEXT_PUBLIC_SUPABASE_URL=http://postgrest:3001   # in Docker network; localhost:3001 from host
NEXT_PUBLIC_SUPABASE_ANON_KEY=<random>          # PostgREST accepts any string; matches old pattern

# ── Removed ──
# SUPABASE_SERVICE_ROLE_KEY — no longer needed; better-auth uses pg.Pool directly with the routecommerce role

# ── Unchanged ──
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
STRIPE_PUBLISHABLE_KEY=pk_live_...
RESEND_API_KEY=...
RESEND_WEBHOOK_SECRET=...
OPENAI_API_KEY=...
MINIMAX_API_KEY=...
MINIMAX_BASE_URL=...
FROM_EMAIL=...
```

## Data Flow

### Auth

1. `/login` posts email + password to `authClient.signIn.email()` (better-auth/react).
2. better-auth validates against the `user` table in Postgres via `pg.Pool`, sets the `rc_session_token` cookie via `nextCookies()` plugin.
3. `src/middleware.ts` checks for `rc_session_token` (or `dev_session` for testing); unauthed requests redirect to `/login`.
4. `getAdminUser()` in `src/lib/admin-permissions.ts` calls `auth.api.getSession({ headers })` then `pg.Pool.query("SELECT * FROM admin_users WHERE user_id = $1")` to resolve the `AdminUser` with role + permission flags.
5. Server actions check `can_manage_*` flags as today.

### Database (RPC + table access)

1. Server action calls `supabase.rpc('foo', { p_brand_id })` using the supabase-js client from `src/lib/supabase.ts` (base URL = local PostgREST, anon key header).
2. PostgREST receives `POST /rest/v1/rpc/foo`, looks up the SECURITY DEFINER function in `pg_catalog`, executes it.
3. The function runs with the function owner's privileges (RLS is disabled, so it returns all rows; brand scoping is in the function body / `p_brand_id` filter).
4. Result returns as JSON through PostgREST to the app.

### Storage

1. Admin uploads a product image through the admin UI.
2. Server action `uploadProductImage` reads the file as `Buffer`, calls `uploadFile({ bucket, key, body, contentType })` from `src/lib/storage.ts`.
3. `uploadFile` sends a `PutObjectCommand` to MinIO via `@aws-sdk/client-s3` (path-style, forcePathStyle for MinIO compatibility).
4. MinIO stores the object; the action saves the public URL `${NEXT_PUBLIC_STORAGE_BASE_URL}/${bucket}/${key}` to the `products.image_url` column.
5. MinIO bucket policy is set to `anonymous download` by the `minio_init` one-shot service, so public reads work without presigned URLs.

## File Changes (summary)

### New files

| Path | Source | Purpose |
|---|---|---|
| `docker-compose.yml` | `self-hosted-postgres` branch | Postgres + PostgREST + MinIO + minio_init services |
| `.env.example` | both branches (merged) | Consolidated env vars |
| `.gitea/workflows/deploy.yml` | `self-hosted-postgres` branch | Updated to bring up Docker stack on prod |
| `supabase/captured_schema.sql` | NEW | Output of `pg_dump --schema-and-data` from Supabase |
| `src/lib/auth.ts` | `feat/better-auth` branch | better-auth config (Kysely + pg.Pool) |
| `src/lib/auth-client.ts` | `feat/better-auth` branch | better-auth/react client |
| `src/lib/storage.ts` | `feat/better-auth` branch | S3 client + upload/delete/publicUrl helpers + bucket constants |
| `src/app/api/auth/[...all]/route.ts` | `feat/better-auth` branch | better-auth catch-all route |
| `supabase/migrations/000_preflight_supabase_compat.sql` | `feat/better-auth` branch | Stub `auth` schema + `anon`/`authenticated`/`service_role` roles |
| `supabase/migrations/200_better_auth_tables.sql` | `feat/better-auth` branch | better-auth's `user`/`session`/`account`/`verification` tables |

### Deleted files

| Path | Source | Reason |
|---|---|---|
| `supabase/migrations/BUNDLE_018_042.sql` | deleted in `feat/better-auth` | Concatenated duplicate of 018-042; explicit migrations apply in order |
| `supabase/migrations/XXX_*.sql` (4 files) | deleted in `feat/better-auth` | Drafts using XXX convention |
| `supabase/migrations/087_brand_logos_bucket.sql` | deleted in `feat/better-auth` | Supabase Storage replaced by MinIO |
| `supabase/migrations/099_contact_imports_bucket.sql` | deleted in `feat/better-auth` | Supabase Storage replaced by MinIO |
| `supabase/migrations/145_create_product_images_bucket.sql` | deleted in `feat/better-auth` | Supabase Storage replaced by MinIO |
| `src/lib/supabase/server.ts` | deleted in `feat/better-auth` | Replaced by better-auth catch-all route |

### Modified files

| Path | Change |
|---|---|
| `src/lib/supabase.ts` line 8 | Drop `!supabaseUrl.includes("supabase.co")` from `useMockData` check (only `NEXT_PUBLIC_USE_MOCK_DATA === "true"` should trigger mock) |
| `src/lib/admin-permissions.ts` | Use better-auth session + `pg.Pool` instead of `rc_auth_uid` cookie + Supabase REST |
| `src/middleware.ts` | Check for `rc_session_token` (better-auth) instead of `rc_auth_uid` |
| `src/actions/login.ts` | Use `authClient.signIn.email()` instead of `supabase.auth.signInWithPassword` |
| `src/actions/wholesale-auth.ts` | Use better-auth email sign-in |
| `src/actions/admin/force-login.ts` | Use `pg.Pool` for upsert (no Supabase) |
| `src/actions/brand-settings.ts` | Replace 8 Supabase fetch PUTs with `uploadFile()` |
| `src/actions/products/upload-image.ts` | Replace 3 Supabase calls with `uploadFile()` |
| `src/actions/communications/import-contacts.ts` | Replace PUT + LIST with S3 SDK |
| `src/app/api/water-photo-upload/route.ts` | Replace Supabase with `uploadFile()` |
| `src/lib/email-service.ts` | Use `publicUrl(BUCKETS.X, key)` for 4 hardcoded Supabase URLs |
| `src/components/admin/AdminHeader.tsx` | Use better-auth session |
| `src/components/admin/AdminSidebar.tsx` | Use better-auth session |
| `src/app/admin/me/AdminMeClient.tsx` | Use better-auth `authClient` for password change |
| `src/app/logout/page.tsx` | Use better-auth `authClient.signOut()` |
| `src/app/reset-password/page.tsx` | Use better-auth `authClient.changePassword()` |
| `src/components/storefront/TuxedoVideoHero.tsx` | Use `publicUrl()` for hardcoded Supabase URL |
| `src/components/time-tracking/TimeTrackingFieldClient.tsx` | Use `publicUrl()` |
| `src/app/tuxedo/about/page.tsx` | Use `publicUrl()` |
| `src/app/indian-river-direct/stops/page.tsx` | Use `publicUrl()` |
| `supabase/migrations/006_water_log_rpcs_fixed.sql` | Patch: `STATIC` → `STABLE` (6 occurrences) |
| `supabase/migrations/099_harvest_reach_segmentation.sql` | Patch: quote `time` column references |
| `supabase/migrations/135_email_automation_rpcs.sql` | Patch: reorder `enroll_abandoned_cart` params or add default to `p_next_email_at` |
| `package.json` | Add `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, `better-auth`, `kysely`, `pg` |

## Error Handling

| Failure | Behavior |
|---|---|
| `pg_dump` from Supabase fails | Retry once, then halt and surface the error. Do not proceed with a partial dump. |
| Migration apply fails | Continue through all 137, collect failures in a log file, document them as a follow-up commit. |
| better-auth session invalid / expired | `getAdminUser()` returns `null`; pages redirect to `/login` via middleware. |
| PostgREST down | supabase-js calls throw; server actions return `{ success: false, error: "Database unavailable" }`. |
| MinIO down | Upload returns 500; UI shows "Upload failed, please retry." |
| `auth.uid()` returns NULL inside SECURITY DEFINER function | Per plan.md Phase D Option 1: `ALTER TABLE … DISABLE ROW LEVEL SECURITY` on all `public.*` tables after `pg_dump` apply. Functions still execute with owner privileges; brand scoping happens at the function-body / app layer. |
| RLS policies left over from `pg_dump` | Same as above: `DISABLE ROW LEVEL SECURITY` removes the block. |

## RLS Strategy (Phase D detail)

The 185 SECURITY DEFINER functions reference `auth.uid()`. The preflight stubs it to read `current_setting('request.jwt.claim.sub')`. In production this would be set by PostgREST from the JWT. Without it, `auth.uid()` returns NULL.

**Decision: Disable RLS on all `public.*` tables.**

```sql
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE 'ALTER TABLE public.' || quote_ident(r.tablename) || ' DISABLE ROW LEVEL SECURITY';
  END LOOP;
END $$;
```

This is consistent with the existing "brand scoping in server actions" pattern documented in CLAUDE.md. The app already threads `effectiveBrandId = brandId ?? adminUser.brand_id ?? null` to every RPC. SECURITY DEFINER functions still execute with the function owner's privileges; RLS doesn't block them when disabled. The alternative (wiring PostgREST JWT → `request.jwt.claim.sub`) is more complex and not justified by current usage.

## Testing

End-to-end verification sequence (per plan.md Phase E, expanded):

1. **DB schema + data apply cleanly.**
   - Run `pg_dump --schema-and-data --no-owner --no-privileges --schema=public --exclude-schema=auth --exclude-schema=storage "postgresql://postgres:<pw>@db.wnzkhezyhnfzhkhiflrp.supabase.co:5432/postgres" -f supabase/captured_schema.sql` from the user's Mac (direct PG blocked from this dev box per MEMORY.md).
   - `docker compose up -d db postgrest minio minio_init`.
   - Apply preflight, captured schema, then all 137 migrations. Document any remaining failures.
   - Apply RLS disable block.
2. **PostgREST smoke.**
   - `curl http://127.0.0.1:3001/brands?limit=1 -H "apikey: <anon>"` → 200.
   - `curl -X POST http://127.0.0.1:3001/rpc/get_public_stops_for_brand -H "Content-Type: application/json" -d '{"p_slug":"indian-river-direct"}'` → 200 with non-empty array.
3. **MinIO buckets public.**
   - `mc alias set local http://127.0.0.1:9000 <user> <pass>`.
   - `mc ls local/` shows all 5 buckets.
   - `curl -I http://127.0.0.1:9000/brand-logos/test.png` → 200 or 404, never 403.
4. **App build.**
   - `npx tsc --noEmit && npm run build` with the new env vars. Goal: no Supabase URL parse errors, no `auth.uid()` undefined, no missing bucket errors.
5. **Auth round-trip.**
   - `POST /api/auth/sign-up/email` with test email/password → 200, user created in `user` table.
   - `POST /api/auth/sign-in/email` → 200, `rc_session_token` cookie set.
   - Hit `/admin` with the cookie → 200, not redirect to `/login`.
6. **Storage round-trip.**
   - Start dev server (`npm run dev`).
   - Sign in via better-auth.
   - Upload a product image via admin UI → verify it lands in MinIO (`mc ls local/product-images/`).
   - Visit `/indian-river-direct/products/[slug]` → image renders with the MinIO URL.
7. **Data fidelity spot check.**
   - Pick 3 known data points (a specific brand, an order, a contact) and verify they match what's in the live Supabase.
8. **Playwright E2E.**
   - Update env in `playwright.config.ts` (or `.env.test`).
   - `npx playwright test` passes.

## Risks

| Risk | Mitigation |
|---|---|
| Migration apply order | `pg_dump` puts everything in dependency order; applying it first resolves most cross-references. Apply preflight first to stub `auth`, then captured schema, then migrations in numeric order. |
| The 4 patched migrations are load-bearing | 006 (water-log RPCs) is critical for `/admin/water-log`; 099 (harvest reach segmentation) is critical for `/admin/communications`; 135 (email automation) is critical for abandoned cart + welcome sequence. If patches don't work, those features break. Document as follow-ups. |
| `pg_dump` includes conflicting `auth.uid()` body | The preflight creates the stub. If `pg_dump` redefines it, apply `pg_dump` first, then re-apply preflight (CREATE OR REPLACE FUNCTION handles re-definition). |
| Existing user-uploaded images unreachable in new stack | User will re-upload brand logos and product images. The Tuxedo video + Olathe logos (referenced in `email-service.ts` and `tuxedo/about/page.tsx`) need to be copied over manually to MinIO before the cutover. |
| PostgREST connection pool | PostgREST opens ~10 connections. Default Postgres `max_connections=100` is fine. |
| `dev_session` cookie and `rc_session_token` cookie coexist | Both checked in middleware. Dev mode bypass stays functional for local testing. |
| Mock mode regression | The `useMockData` check in `src/lib/supabase.ts` line 8 currently triggers on `!supabaseUrl.includes("supabase.co")` — this would falsely trigger against `http://localhost:3001`. Fix: drop the `.includes("supabase.co")` condition; rely on `NEXT_PUBLIC_USE_MOCK_DATA` flag only. |
| Two branches had different `.env.example` | Conflict during cherry-pick. Resolution: use the union with comments labeling each section's source. |

## Implementation Phases (overview; full detail in the merged `plan.md` + new task list)

1. **Phase 0 — Merge** — Create `selfhost/migrate`, cherry-pick both branches, resolve conflicts, fix `useMockData` check, update Gitea deploy workflow.
2. **Phase A — Capture base schema** — `pg_dump` from Supabase (user's Mac), restore to local Postgres, apply preflight + captured schema + 137 migrations + RLS disable.
3. **Phase B — MinIO** — Add MinIO + minio_init services to docker-compose, install AWS SDK, configure bucket policy.
4. **Phase C — Verify end-to-end** — Run the test sequence above. Fix any issues.
5. **Phase D — Cutover** — Update the prod server's env, run the same migration on the prod Postgres, restart services, verify with smoke tests. Supabase project stays live for rollback until prod has been verified for 24h.

## Open Questions

- **Bucket name `videos` for the Tuxedo hero** — currently in `TuxedoVideoHero.tsx` as a hardcoded Supabase URL. The new `src/lib/storage.ts` has `BUCKETS.VIDEOS = "videos"`. Need to manually copy the Tuxedo hero video file to MinIO before cutover.
- **Storage URL routing** — `NEXT_PUBLIC_STORAGE_BASE_URL` is `https://route.crispygoat.com/storage`. The deploy workflow needs a reverse proxy (Caddy or nginx) in front of MinIO on the prod server, OR MinIO port 9000 must be exposed via the existing domain. Decide: add Caddy to docker-compose, or use path-based routing in the existing reverse proxy.
- **Better-auth session table cleanup** — better-auth manages its own `session` table. Existing Supabase auth users will need to re-register (no password migration) OR a one-time SQL `INSERT INTO "user" SELECT … FROM auth.users` to seed better-auth users. Decide based on how many active users exist.

## Out of Scope (explicit)

- Migrating user passwords from `auth.users` to `user.password` (better-auth). Will be handled as a one-time "reset your password" email blast in a follow-up.
- Performance tuning, indexing strategy, or connection pooling beyond defaults.
- Replacing `@supabase/ssr` (already deleted in better-auth branch) or `supabase-js` (kept for PostgREST compatibility).
- Migrating Supabase Realtime subscriptions (none in current code).
- Migrating Supabase Edge Functions (none exist).
- Changing RLS to be useful instead of disabled (current pattern: brand scoping in app + SECURITY DEFINER).

## Acceptance Criteria

- [ ] `selfhost/migrate` branch builds cleanly (`npx tsc --noEmit && npm run build`).
- [ ] `docker compose up` on the dev box starts Postgres + PostgREST + MinIO and all 137 migrations apply.
- [ ] All 4 patched migrations apply without errors.
- [ ] `supabase-js` calls against `http://localhost:3001` return the same shape as before against Supabase.
- [ ] better-auth sign-up + sign-in round-trip works in the browser.
- [ ] Product image upload via admin UI lands in MinIO and renders on the storefront.
- [ ] Existing data (brands, products, orders, contacts) from the live Supabase dump appears in local Postgres.
- [ ] Mock mode still works when `NEXT_PUBLIC_USE_MOCK_DATA=true`.
- [ ] Dev mode bypass (`dev_session=platform_admin` cookie) still works.
- [ ] Gitea deploy workflow brings up the Docker stack on the prod server, applies migrations, and restarts the app.
- [ ] Supabase project remains live and unchanged until prod is verified for 24h post-cutover.
