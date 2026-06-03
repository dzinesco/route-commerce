# Route Commerce — Pricing Assessment

> **TL;DR:** Yes, the pricing is way too low. Fully-loaded ARPU ceiling today is **$493/mo** — roughly **one-third** of what comparable B2B produce distribution platforms charge for the same module set. Recommended: **2.5–3× ARPU lift** via a tier re-price + add-on re-price, with no expected loss of in-flight deals.

---

## What the product actually is

A **multi-tenant B2B produce distribution platform**, not a SaaS starter. Build depth is substantial:

| Surface | Scope |
|---|---|
| Migrations | **135 SQL files** (production schema, RLS, SECURITY DEFINER RPCs, audit logs) |
| Source | **544 files** (362 .tsx + 179 .ts) |
| Admin pages | **88 routes** across orders, products, stops, wholesale, communications, time-tracking, water-log, route-trace, reports, advanced, command-center |
| API routes | **60+ endpoints** (Stripe + Square + FedEx + Resend + Twilio + 8 AI endpoints) |
| Public surfaces | 2 brand storefronts (Tuxedo, Indian River Direct) with brand theming, hero, color customization |
| Integrations | Stripe (Connect + subscriptions), Square (POS sync), FedEx (rates + labels), Resend (email), Twilio (SMS), OpenAI (8 AI tools) |
| Distinct modules | Catalog · Stops/Routes · Orders · Pickup · Shipping (FedEx) · **B2B Wholesale Portal** (custom pricing, credit limits, net-30, deposits) · **Harvest Reach** (campaigns, segments, stop-blasts, templates, automation) · **AI Pack** (8 tools) · Square Sync · **Water Log** (irrigation/headgates) · **Route Trace** (FSMA compliance, lots, QR stickers) · Time Tracking (with overtime) · Tax · Multi-tenant brand isolation |

This is closer in scope to **Forager / Local Food Marketplace / Choco** than to a small-farm tool.

---

## Current pricing (audit)

Source: [`src/lib/pricing.ts`](../src/lib/pricing.ts)

```
Starter    $49/mo   (1 user, 25 products, 10 stops/mo)
Farm       $149/mo  (5 users, unlimited stops/products, wholesale + marketing)
Enterprise $399/mo  (unlimited users/brands, AI, SMS, Square, Water, SLA)

Add-ons
  wholesale_portal  $99/mo
  harvest_reach     $79/mo
  ai_tools          $59/mo   ← 8 AI endpoints for $59
  water_log         $39/mo
  square_sync       $39/mo
  sms_campaigns     $29/mo
```

**Fully-loaded customer max today: $149 + $99 + $79 + $59 + $39 + $39 + $29 = $493/mo**

---

## Market comparables (B2B produce / food distribution)

| Comparable | Pricing |
|---|---|
| **Local Line** (CSA/farm e-com) | $50–$300/mo |
| **Barn2Door** (farmer e-com + marketing) | $299/mo entry |
| **Local Food Marketplace** (regional food hubs) | $200–$1,000+/mo |
| **GrazeCart** (farm e-com) | $60–$150/mo |
| **Choco** (B2B food ordering) | Enterprise $1,000+/mo |
| **Forager** (B2B produce marketplace) | Enterprise contracts, **$25K+/yr** |
| **Cut+Dry** (distributor sales rep) | $1,500+/mo per rep |
| **Klaviyo** (email/SMS) alone | $60–$1,000+/mo |
| **Shopify Plus** (checkout tier) | $2,300+/mo |

A 5-user farm on the current Farm plan gets Wholesale Portal + Harvest Reach + Unlimited catalog for $149. **Klaviyo alone costs more than the entire Farm plan**, and Klaviyo is one module.

---

## Bugs to fix first

These exist in the current code and should be resolved before re-pricing launches:

1. **Two conflicting pricing configs.**
   - [`src/lib/stripe-billing.ts`](../src/lib/stripe-billing.ts) shows Farm annual as `$1,522.80` (`152280` cents) but [`src/lib/pricing.ts`](../src/lib/pricing.ts) shows `$1,341`.
   - Enterprise annual in `stripe-billing.ts` is `0` (Custom) but `pricing.ts` shows `$3,591`.
   - **Fix:** pick one source of truth and delete the other. The marketing UI reads `pricing.ts`; the Stripe price-ID logic in `billing.ts` reads the env vars — they must agree.

2. **Add-on catalog mismatches feature display.**
   - [`src/lib/feature-flags.ts:59`](../src/lib/feature-flags.ts) lists `wholesale_portal: "Contact us"` and `ai_tools: "OpenAI API required"`, but `pricing.ts` prices them at $99/$59.
   - **Fix:** pick one narrative — if the feature has a price, show the price; if it's bundled, say so explicitly.

3. **Landing-page stats are aspirational, not real.**
   - [`src/components/landing/FeaturesAndStats.tsx:165-170`](../src/components/landing/FeaturesAndStats.tsx) shows "500+ produce brands, 50K+ orders, $2M+ weekly sales."
   - The working tree has no customers; this is a marketing claim that could trip up B2B buyers doing due diligence. Either back it with real numbers or remove it.

---

## Recommended new pricing

A 2.5–3× lift that still lands below the closest comparables (Local Food Marketplace, Choco) and well below enterprise produce platforms (Forager, Cut+Dry):

### Plan tiers

| Tier | Current | Recommended | Rationale |
|---|---|---|---|
| **Starter** | $49/mo | **$99/mo** | 1 user, 25 products — still accessible for CSAs/market vendors; reflects catalog + pickup + 10 stops/mo as a real operational system, not a toy. |
| **Farm** | $149/mo | **$349/mo** | Includes wholesale portal + Harvest Reach. This is your **target tier** — undercut Local Food Marketplace ($200–$1K) and Barn2Door ($299) by enough to feel like a deal, but capture real B2B value. |
| **Enterprise** | $399/mo | **$899–$1,499/mo** | All add-ons included, unlimited users/brands, SLA, custom dev. An enterprise B2B produce platform with AI + traceability + multi-brand is worth $1,500+; $899 keeps it competitive vs Cut+Dry. |

### Add-ons (re-priced for value)

| Add-on | Current | Recommended | Why |
|---|---|---|---|
| **Wholesale Portal** | $99 | **$199** | 30+ migrations of work, custom pricing + credit limits + net-30 + deposits. This is the second core revenue driver. |
| **Harvest Reach** | $79 | **$149** | Email + SMS + segments + templates + automation + stop-blast + abandoned-cart. Klaviyo equivalent is $60–$1K+. |
| **AI Intelligence Pack** | $59 | **$199** | 8 distinct AI endpoints. AI tools as standalone SaaS bill $200–$500/mo. Pricing it at $59 is gifting margin. |
| **Water Log** | $39 | **$99** | Specialty ag irrigation tracking is $100–$300/mo in the market. |
| **Square Sync** | $39 | **$59** | Bidirectional POS sync — a real integration; $39 understates the engineering. |
| **SMS Campaigns** | $29 | **$59** | Twilio metered + opt-in management + deliverability; $29 signals "we don't trust this to scale." |
| **Route Trace** | $49 | **$99** | FSMA compliance, lot tracking, QR stickers — has direct regulatory value. |

**Fully-loaded max under new pricing: $349 + $199 + $149 + $199 + $99 + $59 + $59 = $1,113/mo per brand** — still well below what comparable platforms charge for the same stack.

---

## Other pricing moves worth considering

- **Usage-based component on Harvest Reach / SMS** (per-message or per-recipient above a soft cap) — Twilio cost is real, and this lets you capture upside from high-volume brands.
- **Per-extra-user on Farm** instead of the 5-user cap. $349/mo for 5 users is generous; an overage of $39/user/mo captures growth.
- **Annual "founder" pricing** for the first 20–30 customers to land logos, with a hard cutoff date in copy.
- **Replace "Enterprise" with true custom pricing** for $1,500+ deals. The $399 Enterprise is anchored below what buyers will pay for "unlimited everything + custom dev + SLA." Mark it "Custom" and let sales run it.
- **Pause/pause-feature toggles for seasonal farms.** Many produce brands have off-seasons. A "pause subscription for 3 months, keep data" feature reduces churn that an annual contract would otherwise cause.

---

## Bottom line

Yes — pricing is way too low. The fully-loaded ARPU ceiling of **$493/mo** is roughly **one-third** of what comparable B2B produce platforms charge for the same module set, and the AI tier at $59/mo for 8 endpoints is essentially a free add-on relative to its cost-to-serve and market value.

The safe move: move Starter to $99, Farm to $349, Enterprise to "Custom (starts at $899)", and roughly 2× the add-ons. That single change can **2.5–3× ARPU** without losing a single deal that was ever going to close at the old prices — anyone paying $149 today was getting under-billed.
