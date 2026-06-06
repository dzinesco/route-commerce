# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Route Commerce is a multi-tenant B2B e-commerce platform for fresh produce wholesale distribution. Brands sell to customers who pick up at scheduled stops or receive shipments. The platform includes admin dashboards for order management, stop/route scheduling, product catalogs, payment processing (Stripe + Square), and a communications module ("Harvest Reach") for email/SMS campaigns.

Tech stack: Next.js 16 (App Router) · **Postgres** (direct — Supabase is being removed) · Auth.js (NextAuth v5, in-progress migration from bespoke cookie auth) · Stripe · Square · Resend (email) · Tailwind CSS v4

> **Direction:** Supabase is being removed in favor of a direct Postgres connection. The `supabase/` directory is kept as a path for migrations tooling only (no Supabase platform/CLI/auth). Until the Auth.js migration ships, auth still flows through the `dev_session` / `rc_auth_uid` cookies — see the Authentication section. New DB code should connect to Postgres directly (via `pg` or the chosen driver — see Database section) and **must not** import from `@supabase/*` or call Supabase REST.

---

## Commands

```bash
npm run dev          # Start dev server (runs fix-agents.js first to patch Next.js App Router agent issues)
npm run build        # Production build
npm run lint          # ESLint
npm run migrate:one   # Push a migration (pass digits only, e.g. `npm run migrate:one 83` runs 083_*.sql)
npx tsc --noEmit     # TypeScript check (no emit)
npx playwright test  # Run E2E tests (Playwright)
```

> The migrate script (`supabase/push-migrations.js`) now only uses the direct `pg` path — the Supabase CLI branch is legacy. It reads `DATABASE_URL` from `.env.local` via `dotenv`. `pg` is already in devDependencies.
> If a migration fails with "cannot change return type", the function signature changed — drop and recreate it first.

**Recent migration work is documented in `MEMORY.md`** (Supabase login + link process, updates to `push-migrations.js` for modern CLI, specific SQL patches made to 091/145/148/200/201 so they would apply cleanly, and which migrations were pushed in the session). Cat `MEMORY.md` for details.

E2E tests live in `tests/` and run via Playwright. Specs include `tests/smoke.spec.ts` and `tests/login/login-flow.spec.ts`. **Note: `playwright.config.ts` defaults `baseURL` to production** (`https://route-commerce-platform.vercel.app`); override with `PLAYWRIGHT_URL=http://localhost:3000` for local runs, or pass `--config` with a local config.

---

## Architecture

### Authentication & Authorization

**Auth.js v5 (NextAuth)** is the active auth system. Config lives in `src/lib/auth.ts`, with the route handler at `src/app/api/auth/[...nextauth]/route.ts`. The login page (`src/app/login/LoginClient.tsx`) renders a "Continue with Google" button alongside the email/password form, both backed by Auth.js providers. Server-side code reads the session via `await auth()` from `@/lib/auth`; client code that needs to sign out can call the `signOutAction` server action from `@/actions/auth-actions`.

**Providers (see `src/lib/auth.ts`):**
- **Google OAuth** — primary sign-in. Active when `AUTH_GOOGLE_ID` + `AUTH_GOOGLE_SECRET` are set. Users auto-provision as `platform_admin` if their Google `sub` is UUID-shaped (rare) — for Google sign-ins, `admin_users` rows must be provisioned manually by an existing admin until the `email`-based provisioning flow lands.
- **Email/password (Supabase-backed)** — wraps the existing `auth/v1/token?grant_type=password` flow. This is transitional; once Supabase auth is fully removed, this provider goes away.

**Demo / dev mode** still works through a `dev_session` cookie:
- `dev_session=platform_admin` — full access, all brands
- `dev_session=brand_admin` — full access to assigned brand only
- `dev_session=store_employee` — limited access (orders, pickup, wholesale only)
- The login page renders "Demo Mode" buttons that set this cookie client-side; the middleware also auto-issues `dev_session=platform_admin` for the `/admin` demo flow when Supabase isn't configured.

**Single source of truth for the current admin user:** `getAdminUser()` in `src/lib/admin-permissions.ts`. It reads `dev_session` first, then the Auth.js session via `auth()` from `@/lib/auth`. The Supabase `admin_users` lookup still uses `rest/v1/admin_users?user_id=eq.<uid>` — when the `pg` pool at `src/lib/db.ts` lands, that lookup should switch to a direct `SELECT`. **Never import `admin-permissions.ts` into Client Components** — use the `getCurrentAdminUser` server action from `@/actions/admin-user` instead.

The middleware (`src/middleware.ts`) uses Auth.js v5's `auth()` wrapper. It guards `/admin/*` and `/login`, preserves the `dev_session` bypass, and adds baseline security headers.

The `AdminUser` type lives in `src/lib/admin-permissions-types.ts` and is shared across server/client boundary.

#### Migration status

- ✅ Auth.js v5 installed (`next-auth@beta`, currently `5.0.0-beta.31`)
- ✅ `src/lib/auth.ts` + `src/app/api/auth/[...nextauth]/route.ts` in place
- ✅ Google + Credentials (Supabase-backed) providers configured
- ✅ `getAdminUser()` reads from `auth()` session
- ✅ Middleware uses `auth()` wrapper
- ✅ Old `/api/login`, `/api/logout`, `/api/auth/uid`, `/api/set-auth-cookie` removed
- ⏳ Add `email` column to `admin_users` and provision Google users by email (TODO)
- ⏳ Switch the `admin_users` lookup in `getAdminUser()` to direct `pg` (TODO — needs `src/lib/db.ts`)
- ⏳ Remove the email/password (Supabase) provider when Supabase auth is fully cut over (TODO)
- ⏳ The `rc_auth_uid` cookie is no longer the source of truth, but `actions/admin/users.ts` still reads it for backward compat with pre-existing sessions — the `DEV_FORCE_UID` constant and its branches are now dead code (the `/api/force-admin` route that set it was deleted) and should be removed in a follow-up

### Server Actions Pattern

All database writes go through server actions in `src/actions/`. These:
1. Call `getAdminUser()` to verify auth
2. Check role/permission flags (`can_manage_orders`, etc.)
3. Call Supabase REST APIs (not the Supabase client directly in server actions) to trigger SECURITY DEFINER RPCs
4. Return typed results (`{ success: true, ... } | { success: false, error: string }`)

Server actions are "use server" files that export async functions. Client components import and call them directly.

### Database (Postgres, direct)

The app connects to **Postgres directly** — no Supabase platform, JS client, or REST gateway. Server actions use the `pg` driver (or whatever the chosen connection layer is) to call `SECURITY DEFINER` PL/pgSQL functions. Storage of files (product images, etc.) is moving to an S3-compatible object store; until that's wired up, image references can stay as URLs.

#### Connection

- `DATABASE_URL` in `.env.local` (and hosting dashboard) is the only required DB env var.
- A single shared `pg` `Pool` is exported from `src/lib/db.ts` (TBD — to be created/confirmed during the migration). Server actions and API routes import it and call `pool.query(...)` against RPC names.
- No `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` / `@supabase/*` imports — these are being purged from the codebase.

#### SECURITY DEFINER RPCs + Brand Scoping

The app uses **PostgreSQL SECURITY DEFINER functions** for all data access. These run with the function owner's privileges and bypass any future RLS. This means:

- Brand isolation must be enforced at the **application layer** (in server actions), not in database policies
- Every RPC that touches brand-scoped data accepts a `p_brand_id UUID` parameter and filters by it
- The pattern in server actions: `effectiveBrandId = brandId ?? adminUser.brand_id ?? null` — use explicitly passed `brandId` when available (from page server components), falling back to the admin's assigned brand

**Critical consequence**: When `getAdminUser()` returns `brand_id: null` (e.g., dev_session platform_admin or certain dev auth states), `p_brand_id` passed to RPCs will be null. The RPCs handle this by returning all brands' data for platform_admin scope.

### Brand ID Threading

Pages under `/admin/` are server components that resolve `brandId` from `getAdminUser()` and pass it as a prop to client components. **Always thread `brandId` through the entire component tree** — never use hardcoded `BRAND_ID` constants in client components that accept a `brandId` prop. The pattern:

```tsx
// admin/orders/page.tsx (server component)
const adminUser = await getAdminUser();
const effectiveBrandId = adminUser.brand_id ?? undefined; // platform_admin gets all brands
return <OrdersPanel brandId={effectiveBrandId} />;

// OrdersPanel.tsx (client component) — use brandId prop, not constants
```

### Public Storefront Architecture

Brand storefronts (`/tuxedo/*`, `/indian-river-direct/*`) are isolated from the platform shell. The root `layout.tsx` detects brand routes via `usePathname()` and suppresses `SiteHeader`/`SiteFooter` for those paths. Brand pages use `StorefrontHeader`/`StorefrontFooter` directly.

Brand settings (hero tagline, about headline, feature toggles, etc.) are stored in `brand_settings` and fetched publicly via `getBrandSettingsPublic(brandSlug)` server action (no auth required). The `get_brand_settings_by_slug` RPC merges `brand_settings` + `wholesale_settings.wholesale_enabled` in one call.

The `StorefrontHeader` and `StorefrontFooter` components accept:
```typescript
StorefrontHeader: { brandName, brandSlug, logoUrl?, showWholesaleLink?, isAdmin? }
StorefrontFooter: { brandName, brandSlug, logoUrl?, customFooterText?, contactEmail?, contactPhone?, isAdmin? }
```

### Feature Flags + Add-ons

Add-on features are managed via the `brand_features` table and `src/lib/feature-flags.ts`. The `ADDON_CATALOG` defines all available add-ons. Check `isFeatureEnabled(brandId, key)` in server components. Toggle via `toggleBrandFeature(brandId, key, enabled)` in `src/actions/settings/features.ts`. The `/admin/settings/apps` page provides a UI for enabling/disabling add-ons per brand.

### Billing + Plan Tiers

Each brand has a `plan_tier` in the `brands` table: `starter` | `farm` | `enterprise`. Plan limits (max_users, max_stops_monthly, max_products) are also stored on the brand. Usage is computed live from actual table counts via `get_brand_plan_info` RPC.

| Tier | Price | Includes |
|---|---|---|
| **Starter** | $49/mo | Products, Stops (10/mo), Orders, Basic Pickup, 1 user, 25 products |
| **Farm** | $149/mo | Everything in Starter + Wholesale Portal, Harvest Reach, unlimited stops/products, 5 users, priority support |
| **Enterprise** | Custom | Everything in Farm + AI Intelligence Pack, SMS Campaigns, Square Sync, Water Log, unlimited users, unlimited brands, custom development, dedicated SLA |

Add-ons are available à la carte on any plan: `wholesale_portal` ($99/mo), `harvest_reach` ($79/mo), `ai_tools` ($59/mo), `water_log` ($39/mo), `square_sync` ($39/mo), `sms_campaigns` ($29/mo).

Billing page: `/admin/settings/billing` — shows plan tier, usage stats, enabled add-ons, Stripe Customer Portal link (if `stripe_customer_id` set), and platform invoice history.

### Stripe Billing Integration

Real Stripe subscription management is integrated via:
- **`src/actions/billing/stripe-checkout.ts`** — `createStripeCheckoutSession`, `createPlanUpgradeCheckout`, `createAddonCheckoutSession`, `cancelAddonSubscription`
- **`src/app/api/stripe/webhook/route.ts`** — handles `checkout.session.completed`, `customer.subscription.updated/deleted`, `invoice.payment_succeeded/failed`

When a subscription checkout completes, the webhook automatically:
1. Saves `stripe_subscription_id`, `stripe_subscription_status`, and `stripe_current_period_end` to the brand via `set_brand_subscription` RPC
2. Enables the corresponding feature flag via `set_brand_feature` for add-ons
3. Updates plan tier via `update_brand_plan_tier` for plan changes

#### Required Stripe Credentials

**Environment variables** (`.env.local` for local, hosting dashboard for production):

| Variable | Format | Where to get |
|---|---|---|
| `STRIPE_SECRET_KEY` | `sk_live_...` or `sk_test_...` | Stripe Dashboard → Developers → API Keys → Secret key |
| `STRIPE_PUBLISHABLE_KEY` | `pk_live_...` or `pk_test_...` | Same page — used for Stripe.js in client components |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | Stripe Dashboard → Developers → Webhooks → select endpoint → Signing secret |

**Stripe Price IDs** (create products/prices in Stripe Dashboard first):

| Variable | Product to create in Stripe |
|---|---|
| `STRIPE_PRICE_STARTER` | Recurring $49/mo — Starter plan |
| `STRIPE_PRICE_FARM` | Recurring $149/mo — Farm plan |
| `STRIPE_PRICE_ENTERPRISE` | Recurring $399/mo — Enterprise plan |
| `STRIPE_PRICE_HARVEST_REACH` | Recurring $79/mo — Harvest Reach add-on |
| `STRIPE_PRICE_WHOLESALE_PORTAL` | Recurring $99/mo — Wholesale Portal add-on |
| `STRIPE_PRICE_WATER_LOG` | Recurring $39/mo — Water Log add-on |
| `STRIPE_PRICE_AI_TOOLS` | Recurring $59/mo — AI Intelligence add-on |
| `STRIPE_PRICE_SQUARE_SYNC` | Recurring $39/mo — Square Sync add-on |
| `STRIPE_PRICE_SMS_CAMPAIGNS` | Recurring $29/mo — SMS Campaigns add-on |

For annual pricing, create separate annual prices in Stripe (e.g., $441/yr for Starter = $49/mo * 12 * 0.75) and use different price IDs. Pass `annual=true` to `createStripeCheckoutSession` to select the annual price key.

**Webhook setup** (Stripe Dashboard → Developers → Webhooks → Add endpoint):
- URL: `https://yourdomain.com/api/stripe/webhook`
- Events to listen for: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`

**UI Payments settings** (`/admin/settings/payments`):
- The `stripe_customer_id` on the brand record is set when the brand connects Stripe via the Payments settings UI (OAuth flow or manual key entry). Once set, billing checkout sessions can be created for that brand.

### Adding a New Brand

1. **Create brand record** in `brands` table:
   ```sql
   INSERT INTO brands (id, name, slug, plan_tier, max_users, max_stops_monthly, max_products)
   VALUES (gen_random_uuid(), 'Sunrise Farms', 'sunrise-farms', 'starter', 2, 20, 50);
   ```

2. **Initialize wholesale_settings** (required for portal):
   ```sql
   INSERT INTO wholesale_settings (brand_id, require_approval, wholesale_enabled)
   VALUES ('<brand-uuid>', true, true);
   ```

3. **Add-ons are always opt-in** — enable specific features via `brand_features` table or `/admin/settings/apps` UI.

4. **Create public storefront** — duplicate `/app/tuxedo/` → `/app/sunrise-farms/`, update brand constants and slug.

5. **Set Stripe customer ID** (for billing portal) — set `stripe_customer_id` column on the brand via Payments settings or API once Stripe is connected.

### Multi-Tenant Data Model

- **brands** — each brand has its own products, stops, wholesale settings, communication contacts
- **orders** — belong to a brand (via `brand_id`), may belong to a stop (via `stop_id`) or be shipping-only
- **order_items** — each item has `fulfillment: 'pickup' | 'ship'`
- **stops** — belong to a brand, have address, datetime, status
- **customers** (communication_contacts) — belong to a brand, track email/sms opt-in separately

### Communications Module ("Harvest Reach")

The communications system (`/admin/communications`) uses a separate set of tables that are **NOT protected by RLS** — they rely entirely on the SECURITY DEFINER RPCs + application-layer brand scoping. Key tables: `communication_campaigns`, `communication_templates`, `communication_contacts`, `communication_message_logs`. (The "no RLS" framing carries over from the Supabase era; on raw Postgres this just means no row-level policies — scoping is still enforced by RPC + app layer.)

`send_campaign` / `send_stop_blast` RPCs insert into `communication_message_logs` but do NOT populate `event_id`. The Resend webhook (`src/app/api/resend/webhook/route.ts`) must therefore look up logs by `customer_email + subject + created_at` (7-day window), not by `event_id`.

**Scheduled automations** (declared in `vercel.json`):
- `POST /api/email-automation/abandoned-cart` — every 6h, fires abandoned-cart sequence emails
- `POST /api/email-automation/welcome-sequence` — every 6h, fires welcome onboarding sequence
- `POST /api/cron/send-scheduled` — daily 09:00, sends scheduled campaigns
- `POST /api/wholesale/notifications/{send,dispatch,pickup-reminder}` — wholesale lifecycle
- `POST /api/square/process-queue` — every 2 min, drains Square sync queue

These endpoints are also reachable via curl for manual triggering; the email-automation routes accept `Authorization: Bearer $CRON_SECRET`.

### Payments

- **Stripe** — primary payment processor; `src/actions/payments.ts` and `src/app/api/stripe/` handle checkout, webhooks, refunds
- **Square** — optional sync for inventory/products; `src/actions/square-*.ts` and `src/app/api/square/`
- Wholesale deposits use a separate `wholesale_deposits` table with `payment_method: 'stripe' | 'square'`

### Water Log

Separate from orders/stops — tracks irrigation/water usage per brand. `src/actions/water-log/` and `src/app/admin/water-log/`. Uses its own `water_logs` table.

---

## Key Conventions

- All DB access goes through a shared `pg` `Pool` (see Database section). Server actions call SECURITY DEFINER RPCs via `pool.query('SELECT * FROM fn_name($1, $2)', [...])`. Do not introduce `@supabase/*` imports or REST fetch to `*/rest/v1/`.
- `gen_random_uuid()` used in migrations for primary keys
- Migrations use `CREATE OR REPLACE FUNCTION` for idempotency — never `DROP` then `CREATE`
- Status enums stored as TEXT — no PostgreSQL ENUM type
- Timestamps use `TIMESTAMPTZ` for timezone awareness
- Address fields on orders table are minimal (`customer_address` TEXT) — full structured address (postal_code, state, country) may not exist; check before assuming FedEx-ready address format
- Migration files: numbered sequentially (e.g., `083_*.sql`), never reuse numbers
- All display dates use `formatDate()` from `src/lib/format-date.ts` (MM/DD/YYYY US locale) — never use raw `toLocaleDateString()` in components

---

## Important File Locations

| Concern | Location |
|---|---|
| Admin auth + permissions | `src/lib/admin-permissions.ts`, `src/lib/admin-permissions-types.ts` |
| Middleware (route protection) | `src/middleware.ts` |
| Server actions | `src/actions/*.ts` (one file per domain; also grouped into `src/actions/{admin,ai,billing,communications,harvest-reach,integrations,orders,products,settings,shipping,stops,water-log,platform,route-trace,time-tracking,email-automation}/`) |
| Admin pages | `src/app/admin/[module]/page.tsx` |
| Admin client components | `src/components/admin/*.tsx` |
| Migrations | `supabase/migrations/` (kept for now; will likely move to `db/migrations/` in a later pass) |
| Postgres pool / driver | `src/lib/db.ts` (TBD — create during the Supabase removal pass) |
| Email templates | `src/lib/email-templates.ts` |
| Date formatting | `src/lib/format-date.ts` |
| Feature flags | `src/lib/feature-flags.ts` |
| Square sync settings UI | `src/app/admin/settings/square-sync/` |
| Wholesale portal | `src/app/wholesale/`, `src/actions/wholesale*.ts` |
| Billing + plan actions | `src/actions/billing/stripe-portal.ts` |
| Add-on settings UI | `src/app/admin/settings/apps/` |
| Billing page | `src/app/admin/settings/billing/` |
| Brand storefront header/footer | `src/components/storefront/StorefrontHeader.tsx`, `src/components/storefront/StorefrontFooter.tsx` |
| Paginated stops (public) | `src/components/storefront/PaginatedStops.tsx` |

---

## Gotchas

- **Dev mode `brand_id: null`**: `getAdminUser()` returns `brand_id: null` for platform_admin dev sessions. Always pass explicit `brandId` to server action functions that accept it — don't rely on `adminUser.brand_id` alone.
- **Communications = no RLS**: The communications tables (campaigns, templates, contacts, message_logs) have no row-level policies. All brand scoping must be enforced in server actions.
- **Supabase residue in the wild**: `grep -r "@supabase" src/` will still find imports during the transition. Do not add new ones; if you're touching a file that imports from Supabase, replace the call with the equivalent `pg`-pool call before merging.
- **Webhook event_id**: `log_communication_messages` never populates `event_id`, so the Resend webhook uses `customer_email + subject` lookup instead.
- **Mixed fulfillment orders**: An order can have both pickup and ship items. `get_shipping_orders` RPC returns orders with at least one `fulfillment = 'ship'` item.
- **SMS opt-in defaults**: `communication_contacts.sms_opt_in` defaults to `FALSE` (opt-out by default). `email_opt_in` defaults to `TRUE`. Always check `sms_opt_in` specifically for SMS sends, not `email_opt_in`.