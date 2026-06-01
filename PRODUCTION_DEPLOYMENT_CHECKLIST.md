# Route Commerce — Production Deployment Checklist

**Platform Version:** 1.6
**Last Updated:** 2026-05-13
**Environment:** Next.js 16 (App Router) · Supabase · Stripe · Square · Resend · FedEx

---

## 1. Migration Order

Apply migrations in number order. All numbered `001`–`092` are required.

```bash
# Push all migrations (sequential)
npm run migrate:one 001
npm run migrate:one 002
# ... through ...
npm run migrate:one 092

# Or push all at once via Supabase CLI
supabase db push
```

**Key migrations (last 15):**

| # | File | Purpose |
|---|------|---------|
| 078 | `wholesale_deposit_guard.sql` | Adds `amount`, `payment_method` to `wholesale_deposits` |
| 079 | `resend_analytics.sql` | Adds Resend webhook endpoint + analytics tables |
| 080 | `communication_segments.sql` | Adds `communication_segments` table |
| 081 | `stop_blast_campaign.sql` | Adds `stop_blast_campaign` RPC |
| 082 | `brand_name_in_campaign_email.sql` | Adds `brand_name` column to `communication_campaigns` |
| 083 | `shipping_settings.sql` | Adds `shipping_settings` table |
| 084 | `shipments.sql` | Adds `shipments` table for FedEx tracking |
| 085 | `brand_settings.sql` | Adds `brand_settings` table (core) |
| 086 | `brand_settings_email_integration.sql` | Adds email/webhook fields to `brand_settings` |
| 087 | `brand_logos_bucket.sql` | Adds `brand-logos` storage bucket |
| 088 | `brand_features.sql` | Adds `brand_features` table + RPCs for add-on system |
| 089 | `ai_providers_custom_integrations.sql` | Adds AI provider credentials storage |
| 090 | `storefront_settings.sql` | Adds storefront customization fields + `get_brand_settings_by_slug` RPC |
| 091 | `091_brand_plan_tier.sql` | Adds `plan_tier`, limits, `stripe_customer_id`, `get_brand_plan_info` RPC |
| 092 | `092_stripe_subscriptions.sql` | Adds `stripe_subscription_id/status/current_period_end`, `set_brand_subscription`, `get_brand_subscription` RPCs |

> **Note:** Migration 092 adds Stripe subscription tracking. Migration 091 adds plan tier billing. Apply both before deploying billing changes.

---

## 2. Required Environment Variables

Copy `.env.local.example` to `.env.local` and fill in all values.

### Core Platform

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL (e.g., `https://xxx.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key (safe to expose in browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key — **never expose in browser**, server-side only |
| `SUPABASE_PAT` | Yes | Supabase Personal Access Token for migrations CLI |

### Payments

| Variable | Required | Description |
|---|---|---|
| `STRIPE_SECRET_KEY` | Yes (if using Stripe) | Stripe secret key (`sk_live_...` or `sk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | Yes (if using Stripe webhooks) | Stripe webhook signing secret (`whsec_...`) — from Stripe CLI or dashboard |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Yes (if using Stripe) | Stripe publishable key (`pk_live_...` or `pk_test_...`) |

**Stripe Price IDs** (create in Stripe Dashboard → Products → add Price):

| Variable | Product |
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

For annual pricing, create separate annual prices (e.g., $441/yr for Starter = $49×12×0.75) and set `STRIPE_PRICE_STARTER_ANNUAL`, `STRIPE_PRICE_FARM_ANNUAL`, `STRIPE_PRICE_ENTERPRISE_ANNUAL`.

| Variable | Product |
|---|---|
| `STRIPE_PRICE_STARTER_ANNUAL` | Annual Starter ($441/yr) |
| `STRIPE_PRICE_FARM_ANNUAL` | Annual Farm ($1,341/yr) |
| `STRIPE_PRICE_ENTERPRISE_ANNUAL` | Annual Enterprise ($3,591/yr) |
| `STRIPE_PRICE_HARVEST_REACH_ANNUAL` | Annual Harvest Reach ($711/yr) |
| `STRIPE_PRICE_WHOLESALE_PORTAL_ANNUAL` | Annual Wholesale Portal ($891/yr) |
| `STRIPE_PRICE_WATER_LOG_ANNUAL` | Annual Water Log ($351/yr) |
| `STRIPE_PRICE_AI_TOOLS_ANNUAL` | Annual AI Intelligence ($531/yr) |
| `STRIPE_PRICE_SQUARE_SYNC_ANNUAL` | Annual Square Sync ($351/yr) |
| `STRIPE_PRICE_SMS_CAMPAIGNS_ANNUAL` | Annual SMS Campaigns ($261/yr) |

| Variable | Required | Description |
|---|---|---|
| `SQUARE_ACCESS_TOKEN` | Yes (if using Square) | Square access token from Square Developer Dashboard |
| `SQUARE_APPLICATION_ID` | Yes (if using Square) | Square application ID |
| `SQUARE_LOCATION_ID` | Yes (if using Square) | Square location ID for inventory sync |
| `SQUARE_WEBHOOK_SIGNATURE_KEY` | Yes (if using Square webhooks) | Square webhook signature key |

### Email (Resend)

| Variable | Required | Description |
|---|---|---|
| `RESEND_API_KEY` | Yes (if using email) | Resend API key (`re_...`) |
| `RESEND_WEBHOOK_SECRET` | Yes (if using Resend webhooks) | Resend webhook signing secret |

### Shipping (FedEx)

| Variable | Required | Description |
|---|---|---|
| `FEDEX_API_KEY` | Yes (if using FedEx) | FedEx API key from FedEx Developer Portal |
| `FEDEX_API_SECRET` | Yes (if using FedEx) | FedEx API secret |
| `FEDEX_ACCOUNT_NUMBER` | Yes (if using FedEx) | FedEx account number |
| `FEDEX_METER_NUMBER` | Yes (if using FedEx) | FedEx meter number |

### AI

| Variable | Required | Description |
|---|---|
| `OPENAI_API_KEY` | Recommended | OpenAI API key (`sk-...`) — default AI provider for AI Intelligence Pack add-on |

**AI Provider Setup** (`/admin/settings/integrations`):

Route Commerce supports multiple AI providers via the Integrations settings page:

| Provider | Auth Method |
|---|---|
| OpenAI | API key (`OPENAI_API_KEY` env var or per-brand settings) |
| Anthropic | API key (set via `/admin/settings/integrations` AI Provider panel) |
| Google Gemini | API key |
| xAI (Grok) | API key |
| Custom / OAI-compatible | API key + base URL |

All AI tools (Campaign Writer, Pricing Advisor, Demand Forecasting, Route Optimizer, Stop Blast Advisor) respect the provider chosen in `/admin/settings/integrations`. The `getAIClient()` function in `src/actions/integrations/ai-providers.ts` handles provider instantiation dynamically.

### Feature Flags (Optional)

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_ENABLED_ADDONS` | No | Comma-separated list of add-on keys enabled for all brands (e.g., `harvest_reach,wholesale_portal`). Overrides per-brand `brand_features` table for white-label/self-hosted deployments. |

---

## 3. Webhook Setup

### Stripe

1. Go to **Stripe Dashboard → Developers → Webhooks**
2. Add endpoint: `https://yourdomain.com/api/stripe/webhook`
3. Select events:
   - `checkout.session.completed` — saves subscription, triggers feature sync
   - `customer.subscription.updated` — syncs plan tier + add-on features on changes
   - `customer.subscription.deleted` — clears subscription, disables all add-ons
   - `invoice.payment_succeeded` — updates next billing date
   - `invoice.payment_failed` — marks subscription `past_due`, sends admin notification
4. Copy the **Webhook Secret** (`whsec_...`) to `STRIPE_WEBHOOK_SECRET`

### Resend

1. Go to **Resend Dashboard → Webhooks**
2. Add endpoint: `https://yourdomain.com/api/resend/webhook`
3. Select events: `email.delivered`, `email.open`, `email.click`, `email.bounce`, `email.complaint`
4. Copy the webhook secret to `RESEND_WEBHOOK_SECRET`

### Square (optional)

1. Go to **Square Developer Dashboard → Webhooks**
2. Add subscription: `https://yourdomain.com/api/square/webhook`
3. Select events: `inventory.count.updated`, `order.created`, `payment.completed`
4. Copy the signature key to `SQUARE_WEBHOOK_SIGNATURE_KEY`

### FedEx (optional)

1. FedEx does not use outbound webhooks — track shipments via **FedEx Track API** polling or webhook subscription via FedEx Freight/LTL services

---

## 4. Vercel Cron Jobs

For scheduled tasks (stop reminders, campaign sends), add to `vercel.json` or configure in **Vercel Dashboard → Project → Cron Jobs**:

```json
{
  "cron": [
    {
      "path": "/api/cron/send-stop-reminders",
      "schedule": "0 8 * * *"
    },
    {
      "path": "/api/cron/process-water-log-reminders",
      "schedule": "0 6 * * *"
    }
  ]
}
```

**Note:** Stop reminder emails are triggered by a Supabase time-based trigger (`send_stop_reminder_email`). Verify the trigger is active:
```sql
SELECT * FROM pg_publication_tables WHERE tablename = 'stops';
```
If not, recreate: `ALTER PUBLICATION supabase_realtime PUBLISH INSERT, UPDATE ON TABLE stops;`

---

## 5. Feature Flag Enablement (Post-Deploy)

After deployment, enable add-ons per brand via the admin UI or Supabase SQL:

```sql
-- Enable Harvest Reach for a brand
SELECT set_brand_feature('your-brand-id', 'harvest_reach', true);

-- Enable Wholesale Portal
SELECT set_brand_feature('your-brand-id', 'wholesale_portal', true);

-- Enable Water Log (Tuxedo example)
SELECT set_brand_feature('64294306-5f42-463d-a5e8-2ad6c81a96de', 'water_log', true);

-- Enable AI Intelligence
SELECT set_brand_feature('your-brand-id', 'ai_tools', true);

-- Enable Square Sync
SELECT set_brand_feature('your-brand-id', 'square_sync', true);
```

Or use the admin UI at **`/admin/settings/apps`** (after logging in as `platform_admin` or `brand_admin` with settings access).

---

## 6. Post-Deploy Verification Checklist

Run through these after a successful deploy:

### Core Platform
- [ ] `/admin` loads with correct nav and section cards
- [ ] Can create/edit/archive a stop in `/admin/stops`
- [ ] Can create/edit a product in `/admin/products`
- [ ] Cart works — add item, view cart, checkout
- [ ] Payment completes successfully (test with Stripe test mode)

### Public Storefronts
- [ ] `/pricing` — public pricing page loads, monthly/annual toggle works, comparison table shows/hides
- [ ] `/tuxedo` loads without platform SiteHeader/SiteFooter (brand header/footer only)
- [ ] `/indian-river-direct` loads without platform SiteHeader/SiteFooter
- [ ] "Admin" link visible in brand footer when logged in as admin
- [ ] Stops display: tabbed view works, "This Week" default, "Full Season" pagination works
- [ ] Schedule PDF download works (`/api/tuxedo/schedule-pdf`, `/api/indian-river-direct/schedule-pdf`)
- [ ] Wholesale portal banner shows/hides based on `wholesale_enabled` setting
- [ ] Zip code search works on IRD homepage

### Add-ons
- [ ] `/admin/communications` loads (Harvest Reach — requires enablement)
- [ ] `/admin/wholesale` loads (Wholesale Portal — requires enablement)
- [ ] `/admin/settings/ai` loads (AI Tools — requires enablement + API key)
- [ ] `/admin/settings/square-sync` loads (Square Sync — requires enablement + Square credentials)
- [ ] `/admin/water-log` loads for authorized brand (Water Log — requires enablement)

### Admin Settings
- [ ] `/admin/settings` — all sections visible including "Add-ons"
- [ ] `/admin/settings/brand` — can save hero tagline, about headline, feature toggles
- [ ] `/admin/settings/apps` — can enable/disable add-on features
- [ ] `/admin/settings/billing` — shows plan tier, subscription status badge, next billing date, Stripe portal button
- [ ] `/admin/settings/integrations` — AI provider configuration (OpenAI/Anthropic/Google/xAI/custom)
- [ ] After toggling an add-on: dashboard card updates badge from "Add-on" to "Enabled"

### Billing
- [ ] Stripe webhook receives `checkout.session.completed` and saves subscription
- [ ] `/admin/settings/billing` shows correct plan tier and add-on status
- [ ] Subscription status badge shows `active` / `past_due` / `canceled`
- [ ] Next billing date displays correctly (from `stripe_current_period_end`)
- [ ] "Manage in Stripe Portal" button opens Stripe Customer Portal
- [ ] Stripe Customer Portal shows correct plan + add-ons
- [ ] Invoice history table shows mock invoice rows (ready for real Stripe data)
- [ ] Monthly/annual toggle recalculates displayed prices on billing page
- [ ] Add-on enable/disable triggers Stripe checkout / cancellation

### Auth & Permissions
- [ ] Login with platform admin — full access to all brands
- [ ] Login with brand admin — access limited to assigned brand
- [ ] Login with store employee — restricted to pickup and wholesale only
- [ ] `dev_session=platform_admin` cookie works for local development bypass

### Reports
- [ ] `/admin/reports` — all tabs load (Overview, Orders by Stop, Sales by Product, Fulfillment, Pickup Status, Contact Growth, Campaigns)
- [ ] Date range selector works
- [ ] CSV export works for each report

---

## 7. Rollback Plan

### Immediate Rollback (Vercel)
```bash
# Rollback to previous deployment in Vercel Dashboard
# Project → Deployments → find last good deployment → "Promote to Production"
```
Vercel keeps 10 recent deployments. For critical regressions, promote the previous deployment.

### Database Rollback
```bash
# Revert last migration via Supabase
supabase db reset --backup-id <backup-before-migration>

# Or manually revert (example for migration 090)
psql $DATABASE_URL -c "ALTER TABLE brand_settings DROP COLUMN IF EXISTS schedule_pdf_notes;"
```
> **Important:** Only use `supabase db reset` on staging. In production, manually revert individual migrations to avoid data loss.

### Environment Variable Rollback
Environment variables are version-controlled in Vercel. Restore a previous version in **Vercel Dashboard → Project → Environment Variables → History**.

---

## 8. Known Limitations & Future Work

### Known Issues
- **`dev_session` auth**: The `dev_session` cookie bypasses real Supabase auth. In production, ensure no `dev_session` cookie exists for regular users. The auth bypass only works when `NODE_ENV !== "production"`.
- **Water Log visible to all brand admins**: Currently Tuxedo-only by brand ID check. If another brand admin needs access, the check needs to be made configurable.
- **Communications tables (no RLS)**: `communication_campaigns`, `communication_templates`, `communication_contacts`, `communication_message_logs` have RLS disabled. All data access is through SECURITY DEFINER RPCs. Do not expose these tables via direct Supabase queries.
- **`event_id` not populated in message logs**: `send_campaign` and `send_stop_blast` do not set `event_id`. The Resend webhook looks up logs by `customer_email + subject` instead. This is a known limitation — if Resend events are delayed, the lookup may fail to match.
- **Square sync is one-directional**: Products import from Square → Route Commerce, but product edits in Route Commerce do not push back to Square.
- **SMS opt-in defaults to `FALSE`**: `communication_contacts.sms_opt_in` defaults to `false`. Users must explicitly opt in for SMS campaigns.
- **`brand_id: null` for platform admins**: `getAdminUser()` returns `brand_id: null` for `platform_admin` role. Always pass explicit `brandId` to server action functions.
- **Square webhook signature mismatch**: The Square webhook handler uses `crypto.createHmac("sha256", signatureKey)` but Square sends the signature as base64-encoded. Verify signature encoding matches Square's documentation before enabling Square webhooks in production.
- **Stripe webhook reliability**: Stripe webhook delivery is not guaranteed to be in-order or immediate. The webhook handler is idempotent — it can safely receive duplicate events. Consider implementing a webhook event log table to track processed event IDs for deduplication.
- **`NO_RLS` communications tables**: All communications data is accessible via SECURITY DEFINER RPCs only — never expose direct Supabase queries to these tables in client-side code.

### Future Work (Non-Blocking)
- **Cursor-based pagination**: Replace offset-based pagination (`page * limit`) with cursor-based pagination for large datasets (orders, contacts)
- **Webhook retry queue**: Failed webhooks (Resend, Stripe) are not currently retried — implement a dead-letter queue or retry mechanism
- **Import Center**: AI-powered import UI (`/admin/import`) was designed but not fully implemented
- **Multi-brand support in public storefront**: Currently hardcoded for Tuxedo and IRD — a generic `/[brandSlug]` route would support all brands
- **AI features in reports**: `ReportsDashboard` has an "Explain" button for AI-powered explanations but it requires OpenAI key + working API proxy
- **Square inventory mapping**: `syncInventoryToSquare` and `syncInventoryFromSquare` require a `square_catalog_object_id` column on products to map RC products to Square catalog items — not yet implemented
- **Webhook event deduplication**: Add a `stripe_events_processed` table or similar to track processed Stripe event IDs and prevent duplicate processing

---

## 9. Contacts & On-Call

| Role | Contact |
|------|---------|
| Platform Admin | Set via Supabase Auth dashboard |
| Kyle Martinez | Primary contact — Route Commerce owner |
| Supabase Support | supabase.com/support |
| Vercel Support | vercel.com/support |

For Vercel production incidents: **vercel.com/deployments** → find deployment → "Support" button.

For Supabase production incidents: **supabase.com/dashboard** → project → "Support" tab.