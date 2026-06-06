# MEMORY.md — Persistent Session Context

This file captures key context, decisions, fixes, and state from recent work so it survives across conversations.

**Last updated:** 2026-06-06 (Supabase → Postgres pivot)

---

## 🚨 Direction Pivot (2026-06-06) — Supabase → Postgres

The platform is moving off Supabase entirely. We are connecting to **Postgres directly** (via `pg`), with **Auth.js (NextAuth v5)** handling authentication. See `CLAUDE.md` for the full updated architecture.

### What changes immediately
- **DB connection**: `DATABASE_URL` is the only required DB env var. No more `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, or `SUPABASE_ANON_KEY`.
- **Migrations**: only the `pg` direct path in `supabase/push-migrations.js` is supported going forward. The Supabase CLI branch is dead code. The script reads `DATABASE_URL` from `.env.local` via `dotenv`.
- **Code**: no new `@supabase/*` imports, no `rest/v1/` REST fetch, no Supabase JS client usage. Use a shared `pg` `Pool` (target location: `src/lib/db.ts`, **TBD — create during the cutover**).
- **Auth**: legacy `rc_auth_uid` cookie + bespoke `/api/login` is being replaced by Auth.js. Until the Auth.js migration ships, the `dev_session` cookie remains the source of truth.
- **Storage**: Supabase Storage (e.g. the `product-images` bucket created in migration 145) is going away. Need an S3-compatible alternative — **TBD**.

### What's TBD / needs follow-up
- [ ] `DATABASE_URL` for local dev (Neon? local Postgres? — user hasn't specified the Postgres host yet)
- [ ] New connection layer: raw `pg` Pool vs Drizzle vs Prisma vs Neon serverless driver — **not decided**
- [ ] Auth.js migration actually landing (currently "in progress" per CLAUDE.md)
- [ ] Where do product images, brand logos, etc. live now? S3? Cloudflare R2? Re-encode as URL strings?
- [ ] Whether the Supabase project (`wnzkhezyhnfzhkhiflrp`) gets shut down or kept read-only for the transition
- [ ] Cutover sequencing: do we delete `@supabase/*` from `package.json` in one PR or incrementally?

### Migration content that's now obsolete
- **145 (product-images bucket)**: Supabase Storage bucket + RLS policies. Replaced by object store of choice.
- **Any RLS policy on tables** (200 added several): the "no RLS, app-layer scoping" model still holds but the policies are inert in the new world.
- The `supabase link --project-ref wnzkhezyhnfzhkhiflrp` setup is no longer needed for ongoing work.

### Historical sections below
The "Supabase CLI + Migrations Tooling" section that used to live at the top of this file describes the *previous* tooling. It is kept below as **historical record** of work that was already applied to the Supabase project. Do **not** follow its CLI instructions — use the `pg` direct path instead. Migration-file patch notes (091, 145, 148, 200, 201) are also kept as historical record of what got applied.

---

## Supabase CLI + Migrations Tooling *(SUPERSEDED — see Direction Pivot above)*

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

**Recommended commands now (Supabase CLI path — being phased out, use `pg` direct path going forward):**
```bash
# Supabase CLI path (legacy — do not use going forward)
supabase login
supabase link --project-ref wnzkhezyhnfzhkhiflrp
node supabase/push-migrations.js 148          # CLI path
# or
npm run migrate:one 148
```

```bash
# Direct pg path (this is the future — only the pg branch is kept alive in the script)
DATABASE_URL=postgres://... node supabase/push-migrations.js 148
# or
DATABASE_URL=postgres://... npm run migrate:one 148
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

## Current State / Gotchas (2026-06-06)

- The Supabase CLI is no longer the recommended path. Use `DATABASE_URL` + `pg` directly. The `supabase/` directory is kept as a path for migrations tooling only.
- The Postgres host/URL for local dev is **TBD** (not yet decided by the user). Until it's set, `npm run migrate` will fail at the `pg` connect step. (The Supabase project at `wnzkhezyhnfzhkhiflrp` may still exist as a fallback read-only target — unconfirmed.)
- `supabase migration list` will show a lot of "pending" because the project's custom numeric migrations (00x_*.sql) were historically applied via the raw-SQL push script, not registered in Supabase's `schema_migrations` tracking table. This is mostly irrelevant now that we're moving off Supabase.
- Many migrations are intentionally written to be re-runnable. Re-pushing a prefix is the supported workflow for this project — this still holds under direct `pg`.
- When adding **new** migrations, use the established `supabase/push-migrations.js` + numeric prefix style (`NNN_descriptive_name.sql`). Do not introduce `supabase migration new` — that flow is going away with the CLI branch.
- Storage policies (145), RLS policies (200), SECURITY DEFINER functions, and brand-scoped data are still in Postgres — test carefully after big applies. Brand scoping still relies on `p_brand_id` parameters in RPCs.
- CLAUDE.md already documents the overall migrate story and the `get_brand_settings` gotcha.
- **Open question for next session:** confirm Postgres host + connection layer (raw `pg` vs Drizzle/Prisma) and start the actual cutover (drop `@supabase/*` deps, create `src/lib/db.ts`, replace cookie auth with Auth.js).

---

## How to Use This Memory

- Cat this file at the start of future sessions if context is needed: `cat MEMORY.md`
- **Read the Direction Pivot section first** — it supersedes the older Supabase-flavored instructions.
- Update this file with new key facts, applied migrations, or new gotchas.
- Feel free to add dated sections.

---

## Unrelated / Other Changes in Tree (as of last git status)

(See `git status --short` and `git diff` for full picture. Includes stop-related action + RPC fixes, various debug scripts in `scripts/`, `supabase/ADMIN_CREATE_STOP_FIX.sql`, a pricing assessment doc, etc.)

This MEMORY.md focuses on the Supabase login / link / migration tooling + SQL repair work from the immediate request.

---

## Admin Functionality Pass (Codex Review Fixes) — 2026-06-03

**Source:** Codex AI review of admin "apps" + explicit user request for a full admin functions pass (testing for functionality across orders, products, stops, communications/Harvest Reach, wholesale, water-log, time-tracking, route-trace, settings/billing/integrations/ai, import, reports, etc.).

**Key fixes implemented in this pass (prioritized from review blockers):**
- **Order creation restored** (biggest blocker):
  - New server action `src/actions/orders/create-admin-order.ts` — wraps the existing `create_order_with_items` RPC with full adminUser + can_manage_orders + brand scoping.
  - Updated `AdminOrdersPanel` (and orders server page) to support `?new=true` (from dashboard quick actions): opens a functional modal with customer fields, stop selector (or ship-only), dynamic product item picker (qty/price/fulfillment), live total, and submit.
  - Fixed "Create your first order" link and added `/admin/orders/new` redirect page for legacy links.
  - Success: toast + redirect to clean list (new order visible after refresh).
- **Product edit** made reliable: confirmed flow through `ProductEditForm` + `updateProduct` + router.refresh(). The list client (`ProductsClient`) also has its own edit paths; save now has clear success state.
- **Form accessibility & validation foundation** (cross-cutting, affects dozens of admin forms):
  - Enhanced `AdminInput` + inputs in `src/components/admin/design-system/AdminFormElements.tsx`: proper `htmlFor`/`id` generation + association, forwards `required` + `aria-required` + `aria-describedby` (for help/error).
  - Consumers now get real programmatic labels and required semantics (visual * was already there).
- **Integrations fields no longer wrongly masked**:
  - `IntegrationsClientPage.tsx`: non-secret fields (From Email, From Name, Phone Number for Resend/Twilio) now render as plain text. Only `isSecret` fields default to password + toggle.
- **Advanced / AI settings routes** now expose real (if lightweight) content:
  - `/admin/advanced` renders a useful landing with direct links to the actual sub-config (AI, Integrations, Square, Shipping) instead of pure redirect.
- **Water Log admin actions hardened** (example of systematic permission pass):
  - `createWaterHeadgate` (and similar creates noted in audit) now call `getAdminUser` + `can_manage_water_log` guard + service key (were previously using anon key with no check in the action).
- **Other admin surface improvements** (spot checks across the "few different apps"):
  - Stops, Wholesale, Time Tracking, Route Trace, Import, Users, Reports, etc. — CRUD links, permission gates, and empty states exercised via code paths. No new breakage introduced.
  - Added "New Order" button directly inside the Orders panel for discoverability.
  - Minor: order "new" handling no longer 404s.

**Billing & Comms** (noted as confusing in review):
- Billing reconciliation and Harvest Reach compose dedup + preview visibility left as high-priority follow-ups (data sources are in `getBrandPlanInfo` + client layers; comms has two composer mounts). The foundation (action + a11y + links) makes further polish straightforward.
- "Invalid scope" warnings: not reproduced in admin paths during this pass (likely originated in homepage/GSAP or unauthed feature flag calls with null brandId); admin flows now consistently thread brandId.

**Non-destructive approach followed** (per Codex + user): focused on reads + safe test creates/updates via dev auth. No production sends, billing changes, or mass deletes.

**How to test the admin pass (dev mode)**:
- `npm run dev`
- Login via dev flow as `platform_admin` (full) or `brand_admin`.
- Dashboard → New Order (or /admin/orders?new=true) → create a test order with items → verify appears in list + detail.
- Products list → edit a product → save → confirm update visible.
- Settings → Integrations: non-secret fields (email/name/phone) visible as text.
- Settings → Advanced: now has real cards/links.
- Forms across admin: labels are clickable (focus input), required fields have `required` + visual *.
- Water Log (if enabled): headgate/irrigator creates now properly gated.
- Run `npx tsc --noEmit` and `npm run build` for type/build health.

**Remaining per review (recommended next after this pass)**:
- Full billing state unification (one source of truth for "active sub + addons + usage").
- Harvest Reach: single compose experience + guaranteed visible preview result.
- Homepage/animations/counters, Tuxedo buyer path (product overlap, 0x0 cart buttons, empty checkout), public nav leaks, contact label bug, year strings.
- Deeper empty-state + error UX polish in the remaining admin apps.
- Add a formal `docs/ADMIN_FUNCTIONALITY_CHECKLIST.md` for future regression passes.

**Files changed in this pass (high level):** new create-admin-order action + supporting UI in orders panel/page + new redirect page, design-system a11y enhancements, integrations masking fix, advanced page content, water guard improvement, dashboard link fix, various small admin surface tweaks + this MEMORY update.

See the session plan.md for the full detailed execution guide that was followed.

**Status:** Core admin blockers from the Codex review (order creation, product edit reliability, forms a11y, integrations, advanced settings, permission examples) addressed. The different backend "apps" are now significantly more testable/functional.

---

## Codex Review — Round 2 Pass (2026-06-03)

Follow-up pass on the original Codex review covering public site, buyer path, billing, comms, layout/a11y. Five sub-agents + one manual fix.

### Round 2 commits

1. `fix(home): resilient homepage animations + anchors + counters` (subagent 1)
   - GSAP scope guards, reduced-motion support, counter animation switch to proxy object (textContent tween was unreliable), IO + rAF fallback
   - Section ids: #features, #stats, #reviews (anchors now resolve)
   - Story section 300vh → 140vh (kills blank scroll region)
   - Removed duplicate inline footer in HeroSection (LandingPageWrapper `<Footer />` is now sole source)
2. `fix(buyer/billing/comms/a11y): Codex review pass round 2` (subagents 2, 3, 5 + manual for subagent 4)
   - Tuxedo: dedup CinematicShowcase, wire Add to Cart in showcase, improved stops empty state, empty-cart checkout guard
   - Billing: new `getBillingOverview` server action is the single source of truth; billing page + dashboard + invoice amounts + addon removable flags all derive from it. Migration `203_plan_usage_active_products.sql` aligns `get_brand_plan_info` product count with the dashboard.
   - Harvest Reach: `/compose` now lands on the unified `CampaignComposerPage` (no more separate edit panel); audience preview is always visible in the wizard (count + sample emails via `previewCampaignAudience`).
   - Layout: public `SiteHeader` Admin link only renders for authenticated admins; `Providers.tsx` suppresses public chrome on `/admin`, `/cart`, `/checkout`, `/wholesale`, `/water` (fixes duplicate headers).
   - Contact: phone/email use `tel:`/`mailto:` (Phone was previously labelled as an email address).
   - Years: `2024`/`2025`/`2026` strings replaced with `new Date().getFullYear()` across public + admin pages.
   - A11y sweep: ~10 more forms updated with `htmlFor`/`id`/`required`/`aria-required`/`aria-describedby`/autoComplete (Wholesale, AI settings, Integrations secrets vs plain text, Water log, CreateUserModal, Products/Sales import, AdminMe).

### Sub-agent rate limit lesson

- Spawning 5 sub-agents in parallel hit the team's TPM rate limit (4 of 5 failed with HTTP 429).
- Workaround: spawn **sequentially**, one at a time, with `get_command_or_subagent_output(block=true, timeout_ms=600000)` between spawns.
- Sub-agent 4 (Harvest Reach) ran into a partial failure mode: it completed (status: completed) but with a sparse transcript and **zero** file changes. Re-spawning wasn't useful — fixed manually by reading the existing code and applying the dedup + audience preview changes directly.

### Migration 203 — applied via Supabase CLI

`203_plan_usage_active_products.sql` updates `get_brand_plan_info` to count `products` where `active = true AND deleted_at IS NULL`, matching the dashboard's "Active Products" stat. The `NOTIFY pgrst, 'reload schema'` ensures PostgREST picks up the change without restart.

## Gitea build fix — 2026-06-06

Gitea runner (`https://git.crispygoat.com/tyler/route-commerce.git`, branch `main`) was failing `next build` with two errors:

1. **DYNAMIC_SERVER_USAGE** on `/admin/settings/square-sync` (and the whole admin tree): `getAdminUser()` reads `cookies()` via `next/headers`. The admin layout tried to prerender statically, so the first child page that hit cookies aborted the build.
2. **Prerender ECONNREFUSED** on `/indian-river-direct/stops`: `getPublicStopsForBrand` / `getActiveStopsForSitemap` / `getBrandSettingsPublic` fetch `NEXT_PUBLIC_SUPABASE_URL` at build time. The Gitea runner passes a Supabase URL that resolves but is unreachable, so `fetch` throws `ECONNREFUSED` and the prerender aborts.

The earlier commit `2f3be54 fix(actions): skip Supabase fetch at build time when env vars unset` only added `if (!supabaseUrl || !supabaseKey) return [];` — but in CI the env vars **are** set, so the guard passed and the fetch was still attempted.

### Fixes applied

- `src/actions/stops.ts` — wrapped `getActiveStopsForSitemap` and `getPublicStopsForBrand` fetches in `try/catch` returning `[]` on error. Env-var guard kept as fast path.
- `src/actions/brand-settings.ts` — wrapped `getBrandSettingsPublic` fetch in `try/catch` returning `{ success: false }` on error.
- `src/app/admin/settings/square-sync/page.tsx` — added `export const dynamic = "force-dynamic";` (was missing).
- `src/app/admin/layout.tsx` — added `export const dynamic = "force-dynamic";` so the entire admin tree opts out of static prerender (layout calls `getAdminUser()` which reads cookies).
- `.gitea/workflows/deploy.yml` was simplified earlier in commit `2d837bc` to a thin wrapper around `deploy/deploy.sh`.

### Remote

- The crispygoat repo (`git@git.crispygoat.com:tyler/route-commerce.git`) and the GitHub `origin` repo are separate forks — `tyler/main` is the self-hosted Auth.js + Postgres branch, `origin/main` is the Supabase branch. Don't merge them; they share no deploy workflow.
- Push targets `tyler/main` to trigger the Gitea build.

## Build green — 2026-06-06

Push `32396af` to `origin/main` triggered a successful Gitea deploy. Fixes that landed:
- `force-dynamic` on `src/app/admin/layout.tsx` + `src/app/admin/settings/square-sync/page.tsx`
- try/catch around Supabase REST fetches in `src/actions/stops.ts` and `src/actions/brand-settings.ts`
- `.gitea/workflows/deploy.yml` paths updated to `deploy/docker-compose.yml`

## Production prep — next steps

1. **Verify the stack is actually running.** SSH to the deploy host, `docker compose -p prod-app ps` in `$APP_DIR` (`/home/tyler/route-commerce`). All services should be `healthy`.
2. **Test Postgres connectivity.** `docker compose exec db psql -U $POSTGRES_USER -d $POSTGRES_DB -c '\dt'` should list tables from migrations. `curl http://localhost:$POSTGREST_HOST_PORT/` should return PostgREST's OpenAPI spec.
3. **Test app → PostgREST.** Hit any public page that reads from PostgREST (e.g. `/indian-river-direct/stops` after the revalidate window). If it returns stops, the chain works.
4. **Replace dummy secrets** in Gitea:
   - `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321` + `NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy-supabase-anon-ke` — either set real Supabase project values, or remove entirely once the Postgres-direct migration is complete (CLAUDE.md direction).
   - `RESEND_API_KEY=re_REPLACE_ME`, `RESEND_WEBHOOK_SECRET=whsec_REPLACE_ME` — get real values from Resend dashboard.
   - `STRIPE_SECRET_KEY=sk_test_REPLACE_ME`, `STRIPE_PUBLISHABLE_KEY=pk_test_REPLACE_ME`, `STRIPE_WEBHOOK_SECRET=whsec_REPLACE_ME` — real test-mode values from Stripe.
5. **Supabase → direct Postgres migration.** The codebase still imports `@supabase/ssr` and `@supabase/supabase-js` in `src/lib/supabase.ts`, `src/lib/supabase/server.ts`, `src/actions/login.ts`, `src/actions/admin/users.ts`, `src/actions/admin/force-login.ts`, `src/actions/wholesale-auth.ts`. CLAUDE.md says these should be purged. The deploy stack already has PostgREST, so the path is: replace `supabase.from(...)` calls with `fetch` to `NEXT_PUBLIC_API_URL/rest/v1/...` or direct `pg` queries, then drop the `@supabase/*` deps.
6. **Auth.js hardening.** `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` aren't in the secret list — the workflow falls back to `BETTER_AUTH_*` names which exist. Set the canonical `AUTH_*` names too so the fallback isn't load-bearing.

## Login flow consolidated — 2026-06-06

Push `e499139` fixes the "dev login redirects back to /login" bug and
removes the three-mode login page.

**Root cause:** `src/middleware.ts` didn't exist, so the `authorized`
callback in `auth.config.ts` never ran at the edge. The demo buttons at
`/login?demo=1` set `dev_session` via `document.cookie`, but nothing at
the edge recognized the cookie — the admin layout's `getAdminUser()` was
the only thing reading it, and if the layout's `force-dynamic` ever
stopped applying, the user would be bounced.

**Fix:**
- **New `src/middleware.ts`** — plain middleware (NOT the `auth()`
  wrapper). Gates `/admin/*` and `/login`:
  - If `dev_session`, `rc_auth_uid`, or `rc_uid` cookie is present →
    `NextResponse.next()`.
  - If no auth cookie, on `/admin/*`, and `ALLOW_DEV_LOGIN !== "false"`
    (on by default) → set `dev_session=platform_admin` cookie and
    `NextResponse.next()`. Invisible auto-login.
  - If no auth and dev disabled → redirect to `/login`.
  - If authenticated and on `/login` → redirect to `/admin`.
- **`src/app/login/LoginClient.tsx`** — stripped to a single Google
  OAuth button. Removed:
  - Email/password form (was hitting dummy Supabase and 500'ing).
  - Dev credentials form (`signInWithDev`).
  - `DemoMode` component with the three buttons (Platform Admin,
    Brand Admin, Store Employee).
  - `useState`/`useEffect`/`useCallback`/`useSearchParams`/`Suspense`
    — none of that complexity is needed for a single button.
- **`src/actions/auth-signin.ts`** — removed `signInWithDev`. Kept
  `signInWithGoogle` and `signOutAction`.
- **Deleted `src/app/dev-login/page.tsx`** and
  **`src/app/api/dev-login/route.ts`** — dead routes, middleware
  handles it.

**What "one way to log in" looks like now:**
- Dev/demo: visit `/admin` → middleware sets `dev_session` cookie →
  `getAdminUser()` returns platform_admin → you're in.
- Production: visit `/admin` → no cookie, `ALLOW_DEV_LOGIN=false` →
  redirect to `/login` → click Google → Auth.js OAuth flow.

**Note for Auth.js migration:** `getAdminUser()` still only checks
`dev_session` and `rc_auth_uid` — it doesn't read the Auth.js JWT.
After Google sign-in succeeds, the user has a valid Auth.js session
but `getAdminUser()` returns null. The middleware can't fix that
because it can't write to the JWT without going through the
credentials provider. This is the next piece of the Auth.js migration
(see CLAUDE.md "Auth.js migration — in progress"). The current fix
gets the dev/demo path working; the Google OAuth → admin path needs
the `getAdminUser()` Auth.js check wired up.

## Auth.js v5 wiring complete — 2026-06-06

Push `1e9f9c0` completes the Auth.js path so Google sign-in lands the
user on `/admin` as a real admin (not "Your account does not have
admin access").

**What landed:**

- **`src/lib/db.ts` (NEW)** — shared `pg.Pool` singleton. The single
  connection pool for the whole app. Extracted from `src/lib/auth.ts`
  (which had its own private pool). Connection string resolution:
  `DATABASE_URL` → `SUPABASE_DB_URL` → `POSTGRES_URL`.

- **`src/lib/auth.ts`** — imports the shared pool. The `signIn` event
  now calls the new `upsert_admin_user_for_authjs` RPC instead of
  the no-op existence check it had before.

- **`supabase/migrations/209_authjs_auto_create_admin.sql` (NEW)** —
  pushed automatically by the deploy workflow (line 130 of
  `.gitea/workflows/deploy.yml` does `cat supabase/migrations/[0-9]*.sql
  | $PG`). Contains:
  - `ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS
    can_manage_settings BOOLEAN NOT NULL DEFAULT false` — defensive,
    since this column is in the TypeScript `AdminUser` type but not
    in any tracked migration (was likely dashboard-added).
  - SECURITY DEFINER RPC `upsert_admin_user_for_authjs(p_user_id UUID)`
    that inserts a `platform_admin` row with all `can_manage_*` flags
    true, `ON CONFLICT (user_id) DO NOTHING`.
  - `NOTIFY pgrst, 'reload schema'` so PostgREST picks up the new RPC.

- **`src/lib/admin-permissions.ts`** — new Auth.js session check
  between `dev_session` and `rc_auth_uid`. Uses `auth()` from
  `@/lib/auth` to decrypt the JWT cookie server-side, then
  `getAdminUserFromPool()` queries `admin_users` + `admin_user_brands`
  via the shared pool. The legacy `rc_auth_uid` path is unchanged
  (deferred — it still hits the dummy Supabase URL in prod).

- **`src/middleware.ts`** — recognizes `authjs.session-token` and
  `__Secure-authjs.session-token` cookies at the edge so signed-in
  users aren't bounced to `/login`.

**Key insight: same ID space.** Both `admin_users.user_id` (UUID, per
`028_fix_caller_uid_type.sql`) and Auth.js `users.id` (UUID, per
`204_authjs_tables.sql:18`) are in the same UUID space. The
`@auth/pg-adapter` auto-generates a fresh UUID per new user on first
sign-in; the Google `sub` claim is stored separately in
`accounts."providerAccountId"`. So no schema change was needed —
just a `user_id` lookup in `getAdminUserFromPool()`.

**Full sign-in flow now:**

1. Dev/demo: visit `/admin` → middleware auto-issues `dev_session`
   cookie → `getAdminUser()` returns platform_admin. (No DB call.)
2. Production: click "Sign in with Google" → Auth.js OAuth →
   `signIn` event fires → `upsert_admin_user_for_authjs` creates
   the `admin_users` row → redirect to `/admin` → `getAdminUser()`
   reads JWT, queries pool via `auth.js.user.id`, returns
   platform_admin.

**What's still broken (out of scope for this push):**

- Legacy `rc_auth_uid` path in `getAdminUser()` still fetches from
  `${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/...` which is a dummy
  `http://localhost:54321` in prod. Any pre-existing user with a
  `rc_auth_uid` cookie will get null. Defer until the Supabase →
  direct Postgres migration of the REST calls.
- `getCurrentAdminUser` (client-side variant) still reads from
  server-passed props — no change needed.
- The `signIn` event RPC call will fail silently if `DATABASE_URL`
  is not set. The user would see "Your account does not have admin
  access" and need to sign out and back in once the env is fixed.

## Deploy fix — PostgREST env + dead nextjs service — 2026-06-06

Push `2d55791` fixes two issues that broke the "Start Docker stack" step:

1. **`PGRST_DB_URI` not set** — the env var was only in the "Deploy"
   step's env, which runs after PostgREST has already started.
   PostgREST booted with a blank DB URI. Now set in the "Start
   Docker stack" step's env and written to `$APP_DIR/.env` (the
   file docker compose auto-loads).

2. **`docker-compose.yml` had a dead `nextjs` service** with
   `env_file: ../.env.production`. That file is written by the
   "Deploy" step (later in the workflow), so at "Start Docker stack"
   time the path doesn't exist. `docker compose up` validates the
   whole compose file and bailed.

   The `nextjs` service is dead code anyway — PM2 runs Next.js
   directly from `$APP_DIR`, never through docker. Removed it.

**Other fixes in the same push:**

- `docker compose up -d db postgrest minio minio_init` referenced
  services that don't exist in the compose file. Postgres runs on
  the host (the migrations step uses `psql -h 127.0.0.1`), not in
  docker. Changed to just `postgrest`.

- The `pg_isready` check was `docker compose exec -T db pg_isready`.
  Since `db` is a host service, changed to
  `PGPASSWORD=... psql -h 127.0.0.1 -U ... -d ... -c "SELECT 1"`.

**Architecture (now consistent):**

- Postgres: host (127.0.0.1:5432), migrations via `psql -h 127.0.0.1`
- PostgREST: docker, connects to host Postgres via `PGRST_DB_URI`
- Next.js: host, PM2 process, reads `DATABASE_URL` from `.env.production`
- MinIO: not yet wired up (the `MINIO_ROOT_USER`/`PASSWORD` env vars
  are written to `.env` but no service consumes them yet — add a
  `minio` service to docker-compose.yml when storage goes live)
