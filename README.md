# Route Commerce

A multi-tenant B2B e-commerce platform for fresh produce wholesale distribution. Brands manage products, stops, orders, and wholesale customers from a single admin dashboard.

## What It Does

Route Commerce helps produce brands run their wholesale operations:

- **Product catalogs** — Manage products with pricing, variants, and images
- **Stop/route scheduling** — Schedule pickup stops across regions with customer tracking
- **Order management** — Handle pickup and shipping orders, track fulfillment
- **Wholesale portal** — Self-service portal for wholesale customers to place orders
- **Billing** — Stripe-based subscription billing with plan tiers and add-ons
- **Communications** — Email/SMS campaigns via Harvest Reach module
- **Square sync** — Optional inventory sync with Square POS

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Database:** Supabase (Postgres + Auth + RLS)
- **Payments:** Stripe + Square
- **Email/SMS:** Resend
- **Styling:** Tailwind CSS v4

## Getting Started

### 1. Clone and install

```bash
git clone <your-repo-url>
cd route-commerce-platform
npm install
```

### 2. Set up environment variables

Create a `.env.local` file with:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Stripe
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_FARM=price_...
STRIPE_PRICE_ENTERPRISE=price_...

# Resend (email)
RESEND_API_KEY=re_...
```

### 3. Set up the database

Link your Supabase project, then push migrations:

```bash
supabase link --project-ref <your-project-ref>
npm run migrate
```

Or push a single migration:

```bash
npm run migrate:one 83
```

### 4. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The dev server auto-runs `fix-agents.js` to patch Next.js App Router agent issues.

### 5. Dev auth bypass

In development, `/login` sets a `dev_session` cookie for full platform access:

- `dev_session=platform_admin` — full access, all brands
- `dev_session=brand_admin` — brand-scoped access only

Visit `/login` as a shortcut to set the platform_admin session.

## Key Commands

```bash
npm run dev        # Start dev server
npm run build      # Production build
npm run lint       # ESLint
npm run migrate    # Push all pending migrations
npm run migrate:one 83   # Push migration 083_*.sql only
npx tsc --noEmit  # TypeScript check (no emit)
npx playwright test  # Run E2E tests
```

## Project Structure

```
src/
├── actions/          # Server actions (database writes)
├── app/
│   ├── admin/        # Admin dashboard pages
│   ├── api/          # API routes (Stripe, Resend, Square webhooks)
│   └── storefront/   # Public brand storefront pages
├── components/       # Shared React components
│   ├── admin/       # Admin-specific components
│   └── storefront/  # Storefront components
└── lib/             # Utilities, auth, feature flags, formatting
supabase/
└── migrations/      # SQL migrations (numbered sequentially)
```

## Plan Tiers

| Tier | Price | Includes |
|---|---|---|
| **Starter** | $49/mo | Products, 10 stops/mo, Orders, Basic Pickup, 1 user, 25 products |
| **Farm** | $149/mo | Everything in Starter + Wholesale Portal, Harvest Reach, unlimited stops/products, 5 users |
| **Enterprise** | Custom | Everything in Farm + AI Intelligence Pack, SMS Campaigns, Square Sync, Water Log, unlimited users |

**Add-ons (à la carte on any plan):**

- Wholesale Portal ($99/mo)
- Harvest Reach email/SMS ($79/mo)
- AI Intelligence Pack ($59/mo)
- Water Log ($39/mo)
- Square Sync ($39/mo)
- SMS Campaigns ($29/mo)

## Time Tracking

### Adding Workers
1. Go to `/admin/settings` → expand **Workers & PINs**
2. Click **+ Add Worker** — enter name, role (Worker or Time Admin), language (EN/ES)
3. PINs are auto-generated. Click **Reset PIN** next to any worker to issue a new one

### Adding Tasks
1. Go to `/admin/settings` → expand **Tasks**
2. Click **+ Add Task** — enter EN name, optional ES name, unit (hours/pieces/units), sort order
3. Tasks appear in the time clock app for workers to clock into

### Notification Alerts
1. Go to `/admin/settings` → expand **General Settings**
2. Add email addresses and/or SMS numbers under **Notification Recipients**
3. Configure daily/weekly overtime alert thresholds

## Admin Settings Page

All brand configuration lives at `/admin/settings` with five sections:

- **General** — Pay period, overtime thresholds, alert settings, notification recipients
- **Workers & PINs** — Manage workers, reset PINs, toggle active/inactive
- **Tasks** — Define tasks workers can clock into
- **Users & Permissions** — Manage admin users and role flags
- **Integrations** — Stripe, Resend, Twilio, OpenAI credentials and sync options

## Admin Modules

The admin dashboard lives at `/admin`:

- **Command Center** — Overview dashboard
- **Orders** — All orders with pickup/ship status
- **Stops** — Route/stop scheduling and management
- **Products** — Product catalog management
- **Customers** — Wholesale customer management
- **Communications** — Harvest Reach campaign manager
- **Wholesale** — Wholesale portal settings
- **Billing** — Plan and subscription management
- **Water Log** — Irrigation tracking (add-on)
- **Settings** — Brand settings, payments, apps

## Email Automations (Harvest Reach)

Automated email sequences for wholesale customer engagement.

### Abandoned Cart Recovery

3-email sequence (1hr → 24hr → 48hr) triggered when a wholesale customer adds items to cart but doesn't checkout.

**Cron schedule:** Every 6 hours via Vercel crons (`vercel.json`)

**Dashboard:** `/admin/communications/abandoned-carts`

**How it works:**
1. `detect_abandoned_wholesale_carts` RPC finds pending wholesale orders not yet enrolled
2. `enroll_abandoned_cart` RPC creates a tracking record with first email scheduled in 1 hour
3. Cron job calls `get_active_abandoned_carts` to find carts where `next_email_at <= now()`
4. `sendAbandonedCartEmail` fires the email via Resend, then updates `sequence_step`, `next_email_at`, and `status`

**Admin actions:**
- **View** — see all carts with status (Active/Recovered/Expired/Manually Closed), step, items, total
- **Close** — marks cart as manually_closed (stops further emails)
- **Resend** — resets `next_email_at` to now() and fires email immediately

### Welcome Email Sequence

4-email onboarding series triggered when a wholesale contact subscribes (email_opt_in = TRUE).

**Cron schedule:** Every 6 hours (same as abandoned cart)

**Dashboard:** `/admin/communications/welcome-sequence`

**How it works:**
1. Contact subscribes via wholesale portal → `enroll_welcome_sequence` RPC is called
2. Cron job calls `get_active_welcome_sequence` for entries where `next_email_at <= now()`
3. `sendWelcomeEmail` fires via Resend, updates step, schedules next email 24h later
4. After step 4, status → `completed`

**Admin actions:**
- **Resend** — resets entry to step 1 and fires immediately
- Unsubscribed/bounced contacts are skipped automatically

### Manual Trigger (curl)

```bash
# Abandoned cart — simulate cron
curl -X POST https://route-commerce-platform.vercel.app/api/email-automation/abandoned-cart \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json"

# Welcome sequence
curl -X POST https://route-commerce-platform.vercel.app/api/email-automation/welcome-sequence \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json"

# Check status / health
curl https://route-commerce-platform.vercel.app/api/email-automation/abandoned-cart
```

### Environment Variables Required

```bash
RESEND_API_KEY=re_...          # Resend API key for sending emails
FROM_EMAIL="Tuxedo Corn <no-reply@routecommerce.com>"  # Sender address
CRON_SECRET=...                # Bearer token to secure cron endpoints (generate a long random string)
```

### Troubleshooting

| Problem | Likely cause | Fix |
|---|---|---|
| Emails not sending | `RESEND_API_KEY` not set | Check env var in Vercel dashboard |
| 401 Unauthorized on cron | `CRON_SECRET` mismatch | Verify local `.env.local` matches Vercel env |
| Empty abandoned cart table | No pending wholesale orders | Create test order, add items, abandon checkout |
| Welcome sequence not enrolling contacts | `enroll_welcome_sequence` not called | Ensure subscription UI calls the RPC on email_opt_in = TRUE |

### Testing Locally

```bash
# Run abandoned cart with verbose output
curl -X POST http://localhost:3000/api/email-automation/abandoned-cart \
  -H "Authorization: Bearer local-dev-secret" \
  -H "Content-Type: application/json"

# Response: { ok: true, results: { "Tuxedo Corn": { sent: 0, failed: 0, skipped: 0 }, ... } }
```

Set `CRON_SECRET=local-dev-secret` in `.env.local` for local testing.

## Go-Live Checklist

Use this checklist before adding real products and doing a soft launch.

### Pre-Launch

- [ ] Set `CRON_SECRET` in Vercel project environment variables (generate with `openssl rand -hex 32`)
- [ ] Verify `RESEND_API_KEY` is set in Vercel (for email sending)
- [ ] Verify `FROM_EMAIL` is set (e.g. `"Tuxedo Corn <no-reply@routecommerce.com>"`)
- [ ] Run `npm run build` locally — must pass clean with zero TypeScript errors
- [ ] Deploy latest commit to production: `vercel --prod`
- [ ] Smoke test: visit `/admin`, `/admin/settings`, `/tuxedo` — no console errors

### Adding Your First Brand's Products

1. Go to `/admin/products` → **Add Product**
2. For each product: name, wholesale price, image, shipping type (pickup/ship/all)
3. Set `is_taxable` if Colorado sales tax applies
4. Make products **active** — inactive products don't show on storefront
5. For Tuxedo Corn: use brand slug `tuxedo`, set brand accent `green`

### Adding Pickup Stops

1. Go to `/admin/stops` → **Create Stop**
2. Fill city, state, address, date, time, cutoff date
3. Assign brand — stops show on storefront at `/{brand-slug}#stops`
4. Set `is_public: true` to display on storefront

### Verifying Wholesale Portal

1. Go to `/admin/wholesale` — confirm portal is enabled
2. Visit `/{brand-slug}/wholesale/portal` as a customer
3. Add items to cart, start checkout — confirm abandoned cart appears in `/admin/communications/abandoned-carts` within minutes

### Verifying Email Automations

```bash
# Manually trigger welcome sequence (use a real email you control)
curl -X POST https://route-commerce-platform.vercel.app/api/email-automation/welcome-sequence \
  -H "Authorization: Bearer $CRON_SECRET"

# Check Resend dashboard — should see sent emails
# Check /admin/communications/welcome-sequence — entry should show "Active"
```

### Monitoring Production

- Check Vercel dashboard → **Functions** logs for any 500 errors
- Check `/admin/communications/abandoned-carts` for recovered orders
- Vercel crons fire every 6 hours — check function invocations in dashboard

## Notes

- All database writes go through **server actions** (`src/actions/`), not the Supabase JS client directly
- Dev mode bypasses Supabase auth via `dev_session` cookie — never use this in production
- Brand-scoped data is enforced at the application layer via `p_brand_id` parameters in SECURITY DEFINER RPCs
- Display dates use `formatDate()` (MM/DD/YYYY) — never raw `toLocaleDateString()`
- Migration files are numbered sequentially — never reuse numbers