# Environment Setup

This guide documents every environment variable the platform uses, what each one does, where to get it, and any gotchas.

Copy `.env.example` → `.env.local` and fill in the values.

---

## Public Variables

These are safe to commit and can be used in client bundles. Prefix with `NEXT_PUBLIC_`.

### `NEXT_PUBLIC_SUPABASE_URL`
Your Supabase project URL.
- **Where to get:** Supabase Dashboard → Project Settings → API → Project URL
- **Example:** `https://abc123.supabase.co`

### `NEXT_PUBLIC_SUPABASE_ANON_KEY`
Supabase anonymous (anon) key — safe for client-side use.
- **Where to get:** Supabase Dashboard → Project Settings → API → anon key

### `NEXT_PUBLIC_BASE_URL`
The base URL of your deployment. Used for OAuth redirects and webhook URLs.
- **Local:** `http://localhost:3000`
- **Production:** `https://yourdomain.com`

### `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
Stripe publishable key for Stripe.js in the client.
- **Where to get:** Stripe Dashboard → Developers → API Keys → Publishable key
- **Format:** `pk_live_...` or `pk_test_...`

### `NEXT_PUBLIC_SINGLE_BRAND`
Set to a brand slug to hide other brand routes in single-brand mode.
- **Example:** `tuxedo`
- **Default:** empty (multi-brand mode)

---

## Server-Only Variables

**Never prefix with `NEXT_PUBLIC_`**. These must only be accessed in Server Components, Server Actions, or API Routes.

### Supabase

#### `SUPABASE_SERVICE_ROLE_KEY`
Full service role key — grants DB admin access bypassing RLS.
- **Where to get:** Supabase Dashboard → Project Settings → API → service_role key
- **⚠️ Critical:** Never expose this to the client. Used only in server-side code.

### Stripe

#### `STRIPE_SECRET_KEY`
Stripe secret key for backend API calls (creating sessions, webhooks, etc.).
- **Where to get:** Stripe Dashboard → Developers → API Keys → Secret key
- **Format:** `sk_live_...` or `sk_test_...`

#### `STRIPE_WEBHOOK_SECRET`
Signing secret for Stripe webhook payloads.
- **Where to get:** Stripe Dashboard → Developers → Webhooks → select endpoint → Signing secret
- **Format:** `whsec_...`

#### Stripe Price IDs

Create these as recurring prices in your Stripe Dashboard first. Each maps to a plan tier or add-on.

| Variable | What it is | Stripe Dashboard |
|---|---|---|
| `STRIPE_PRICE_STARTER` | $49/mo Starter plan | Create a Product → Price at $49/mo |
| `STRIPE_PRICE_FARM` | $149/mo Farm plan | Create a Product → Price at $149/mo |
| `STRIPE_PRICE_ENTERPRISE` | $399/mo Enterprise plan | Create a Product → Price at $399/mo |
| `STRIPE_PRICE_HARVEST_REACH` | $79/mo Harvest Reach add-on | Create a Product → Price at $79/mo recurring |
| `STRIPE_PRICE_WHOLESALE_PORTAL` | $99/mo Wholesale Portal add-on | Create a Product → Price at $99/mo recurring |
| `STRIPE_PRICE_WATER_LOG` | $39/mo Water Log add-on | Create a Product → Price at $39/mo recurring |
| `STRIPE_PRICE_AI_TOOLS` | $59/mo AI Intelligence add-on | Create a Product → Price at $59/mo recurring |
| `STRIPE_PRICE_SQUARE_SYNC` | $39/mo Square Sync add-on | Create a Product → Price at $39/mo recurring |
| `STRIPE_PRICE_SMS_CAMPAIGNS` | $29/mo SMS Campaigns add-on | Create a Product → Price at $29/mo recurring |

**Note:** Annual pricing requires separate annual prices (e.g., $441/yr for Starter = $49 × 12 × 0.75). Use different price IDs and pass `annual=true` to checkout actions.

### Email (Resend)

#### `RESEND_API_KEY`
API key for sending transactional email via Resend.
- **Where to get:** [Resend.com](https://resend.com) → API Keys → Create API key
- **Format:** `re_...`

#### `RESEND_WEBHOOK_SECRET`
Signing secret for Resend webhook payloads.
- **Where to get:** Resend Dashboard → Webhooks → select endpoint → Signing secret
- **Format:** `whsec_...`

### AI

#### `OPENAI_API_KEY`
OpenAI API key for AI features (AI Intelligence Pack add-on).
- **Where to get:** [OpenAI Platform](https://platform.openai.com) → API Keys → Create secret key
- **Format:** `sk-...`

#### `OPENAI_ORG_ID`
OpenAI organization ID (optional — for workspace-level usage tracking).
- **Where to get:** OpenAI Platform → Settings → Organization ID
- **Format:** `org-...`

### Square

#### `SQUARE_APP_SECRET`
Square app secret for Square API authentication.
- **Where to get:** Square Developer Dashboard → Your App → Credentials → Application Secret
- **Format:** `sq0...`

#### `SQUARE_ENVIRONMENT`
Controls whether to use Square sandbox or production.
- **Values:** `sandbox` (default for dev) or `production`
- **⚠️ Note:** Production credentials and sandbox credentials are separate. Make sure this matches which credentials you're using.

---

## Webhook Setup

### Stripe
**Dashboard:** Stripe Dashboard → Developers → Webhooks → Add endpoint

- **URL:** `https://yourdomain.com/api/stripe/webhook`
- **Events to listen for:**
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`

### Resend
**Dashboard:** Resend → Webhooks → Add webhook

- **URL:** `https://yourdomain.com/api/resend/webhook`
- **Events:** `email_delivered`, `email_bounced`, `email_complained`

---

## Local vs Production

| Variable | Local (`.env.local`) | Production (hosting dashboard) |
|---|---|---|
| `NEXT_PUBLIC_BASE_URL` | `http://localhost:3000` | `https://yourdomain.com` |
| `STRIPE_SECRET_KEY` | `sk_test_...` | `sk_live_...` |
| `STRIPE_PUBLISHABLE_KEY` | `pk_test_...` | `pk_live_...` |
| `SQUARE_ENVIRONMENT` | `sandbox` | `production` |

---

## Gotchas

- **Wrong Stripe key type:** Using `sk_live_` in development or `sk_test_` in production will silently fail. Always match key type to environment.
- **Stripe price IDs drift:** If you create new prices in Stripe Dashboard but forget to update `.env.local`, billing will fail. Keep them in sync.
- **SQUARE_ENVIRONMENT mismatch:** Production Square credentials won't work with `sandbox`. Match it to your app secret type.
- **SUPABASE_SERVICE_ROLE_KEY in client:** If you ever see `SUPABASE_SERVICE_ROLE_KEY` in a browser bundle, it's a critical security incident. The key was exposed server-side. Rotate it immediately in Supabase Dashboard.
- **OPENAI_API_KEY for AI features:** AI features won't work without this. The AI Intelligence Pack add-on requires a valid OpenAI key.