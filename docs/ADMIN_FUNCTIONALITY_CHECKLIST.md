# Admin Functionality Checklist

Use this for manual regression passes after changes (dev mode + dev auth).

## Roles to Test
- platform_admin (full access, all brands)
- brand_admin (scoped to assigned brand)
- store_employee (limited: pickup, wholesale only)

Auth via existing dev flow (`/login` sets dev_session cookie) or `/admin/test-auth`, `/admin/debug-auth`.

## Core Apps

### Orders
- [ ] Dashboard "New Order" and "Create your first order" open usable create flow (`?new=true` modal or /new)
- [ ] Create order: customer name/email/phone, stop (or ship-only), add multiple items (qty/price/fulfillment mix), totals, submit → appears in list + detail page
- [ ] List: filters, search, bulk pickup mark, pagination, status tabs
- [ ] Detail: view items/totals/payment, edit form, pickup action, refunds
- [ ] Permissions: brand_admin sees only own brand; employee redirected
- [ ] Empty states and toasts work

### Products
- [ ] List (active only, brand scoped)
- [ ] New product form (/products/new) → creates and appears in list
- [ ] Edit product (/products/[id]): change name/price/type/active/image/pickup_type/taxable → saves, list + detail update (router.refresh or state)
- [ ] Delete (if present)
- [ ] Import
- [ ] Image upload + remove

### Stops / Tours
- [ ] List
- [ ] New stop (/stops/new)
- [ ] Edit stop
- [ ] Publish / status changes
- [ ] Used in order create picker

### Communications (Harvest Reach)
- [ ] Main page tabs: campaigns, contacts, segments, templates, compose, logs, analytics, settings, abandoned carts, welcome sequence
- [ ] Single coherent compose experience (no confusing duplication between /compose and main "compose" tab)
- [ ] Audience preview (stop/segment/custom rules) shows visible count + sample customers
- [ ] Create/edit/save draft campaign, preview, send (test lists only)
- [ ] Contacts CRUD + import + export + opt out
- [ ] Segments builder + preview
- [ ] Templates
- [ ] Abandoned cart + welcome automation flows (preview/send/resend)
- [ ] Feature gated when add-on disabled

### Settings
- **Billing**
  - [ ] Consistent view: plan tier + price (annual/monthly toggle), "active subscription" state clear, usage numbers (products/stops/users) match dashboard, enabled add-ons list with correct remove capability, recent invoices match displayed amounts
  - [ ] No contradictory "No active subscription" + active add-ons + invoices
  - [ ] Upgrade, add-on checkout, portal buttons, Stripe connect if applicable
- **Integrations**
  - [ ] Resend/Twilio/Stripe/etc. forms: non-secret fields (email, name, phone) visible as text; secrets masked + toggle
  - [ ] Test connection buttons (safe)
- **AI / Advanced**
  - [ ] Real content or proper sections (not pure redirects); links to providers, preferences, feature flags
- **Other**: brand, apps (feature toggles), payments, shipping, square-sync, users

### Wholesale
- [ ] Dashboard stats, customers list + create/edit, products (custom pricing), orders (fulfill, deposits, notifications)
- **Portal** (employee or approved buyer): register, login, browse with custom pricing, cart, checkout

### Water Log
- [ ] Admin: headgates, irrigators/users (create with pin reset), entries, settings, alerts
- [ ] Field/pin flows (separate water/ login)
- [ ] Permission: can_manage_water_log or platform for TUXEDO brand

### Time Tracking
- [ ] Admin: workers (create/pin reset), tasks, logs, summary, settings, overtime notifications
- [ ] Field clock in/out with pin
- [ ] Reports/export

### Route Trace
- [ ] Lots CRUD, QR/sticker gen, lookup, hauling board, supply chain trace, stats, inventory by crop
- [ ] Feature gated

### Import Center + AI Import
- [ ] Upload/parse for products/orders/contacts/stops
- [ ] AI column mapping (if enabled)
- [ ] Execution (safe on test data)

### Other Admin
- [ ] Users (platform): CRUD
- [ ] Reports / Analytics / Command Center: load data, exports
- [ ] Pickup (driver): lookup, QR, mark complete
- [ ] Shipping: orders, FedEx rates/labels, tracking
- [ ] Taxes: calc + reports
- [ ] Dashboard: quick actions, usage vs limits, recent orders, plan badge, addon cards
- [ ] Layout: no dupe headers/footers inside admin shell; sidebar correct per role

## Cross-Cutting
- [ ] All forms use improved AdminInput: clickable labels (htmlFor), real `required` + `aria-required`, error/help described
- [ ] No repeated "Invalid scope" or missing target console warnings in admin
- [ ] Brand scoping works (platform sees selector/all; brand_admin filtered)
- [ ] Feature add-on gating (Harvest Reach, Wholesale, AI, Water, Time, Route Trace, SMS)
- [ ] Toasts, loading skeletons, empty states, error messages consistent
- [ ] Responsive (desktop primary)
- [ ] Dev auth + test brands used; no live prod mutations in routine testing

## Public / Storefront (secondary but part of full review)
- [ ] Homepage: anchors (#features etc.) work, impact counters animate (not stuck at 0), no long blank regions, no GSAP target/scope errors
- [ ] Tuxedo (and IRD): product sections no visual overlap, Add to Cart buttons visible/sized and functional, stops show real upcoming or clear "none" state, cart blocks checkout when empty, full buyer path (browse → add → cart → checkout → success)
- [ ] Contact: Phone labeled/typed correctly (not email)
- [ ] Public pages: no stray "ADMIN" nav link when not logged in as admin
- [ ] Years: consistent (dynamic preferred)
- [ ] No dupe SiteHeader + StorefrontHeader

## Verification Tips
- Use `npm run dev`
- Dev session cookies or test-auth pages
- Browser devtools: Elements for a11y (labels, aria, required), Console for warnings, Network for action calls
- Multiple roles + brands
- After changes: `npx tsc --noEmit`, `npm run build` (or at least lint)
- Update this checklist and MEMORY.md with results

Run this checklist after any admin or storefront changes. Prioritize the Codex blockers first.
