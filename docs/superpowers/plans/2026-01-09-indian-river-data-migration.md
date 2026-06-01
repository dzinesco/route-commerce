# Indian River Direct Data Migration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update the app's mock data and Indian River Direct storefront to match the scraped data from indianriverdirect.com - products, brand story, team, seasonal schedules, and pickup-only model.

**Architecture:** Maintain existing file structure. Update mock-data.ts with real products and brand info. Update IRD storefront pages with authentic content from the source site. No structural changes.

**Tech Stack:** Next.js, TypeScript, Tailwind CSS (existing)

---

## Data Summary from Scrape

### Products
| Product | Price | Type | Notes |
|---------|-------|------|-------|
| Peaches - 2026 Pre-Order | $55.00 | Pre-order | 25 lb box, Titan Farms SC, June-Aug |
| Pecans | $13.00 | Pickup Only | 1 lb bag, Ellis Brothers GA |
| Blueberries | TBA | Pickup Only | July only |

### Brand Identity
- **Established:** Since 1985
- **Locations:** 
  - Office: 135 North 2nd Street, Fort Pierce, FL 34950
  - Grove: 23298 Orange Avenue, Fort Pierce, FL
- **Acquired:** Fort B Groves (direct source)
- **Key Differentiator:** Farm-to-table direct model
- **Products Source:** Titan Farms (peaches SC), Ellis Brothers (pecans GA)

### Seasonal Calendar
- **Peaches:** June 12 - August 2, 2026
- **Blueberries:** July only
- **Citrus:** Winter season

### Team
- Dan (Owner)
- Angela (Office Manager/Customer Support)
- Mariah (Digital Marketing/Customer Support)
- Kenny, Exzavier, Jaime, Ponce (Drivers/Sales)

---

## Task 1: Update Mock Data

**Files:**
- Modify: `route_commerce-main/src/lib/mock-data.ts`

- [ ] **Step 1: Update brand info**

Replace lines 4-7 with:
```typescript
export const mockBrands = [
  { id: "brand-tuxedo", name: "Tuxedo Corn", slug: "tuxedo", accent_color: "#22c55e" },
  { id: "brand-ird", name: "Indian River Direct", slug: "indian-river-direct", accent_color: "#f97316" },
];
```

Add brand settings after line 93:
```typescript
export const mockBrandSettingsIRD = {
  brand_name: "Indian River Direct",
  founded: "Since 1985",
  office_address: "135 North 2nd Street, Fort Pierce, FL 34950",
  grove_address: "23298 Orange Avenue, Fort Pierce, FL",
  description: "Family-owned and operated, bringing fresh fruit from our groves to your neighborhood since 1985.",
  phone: "(772) 465-1234",
};
```

- [ ] **Step 2: Update IRD products**

Replace the IRD products in mockProducts (lines 16-21) with:
```typescript
  // Indian River Direct products (based on indianriverdirect.com)
  { id: "prod-ird-peach-1", name: "Peaches - 2026 Pre-Order", price: 55.00, description: "25 lb box of Freestone Peaches from Titan Farms, South Carolina. Hand-picked at peak ripeness, available June-August 2026. Generally 40-60 peaches per box.", type: "peaches", image_url: "https://cdn.shopify.com/s/files/1/0506/2908/3294/files/Untitleddesign.png", shipping_type: "pickup", brand_id: "brand-ird", is_active: true, pickup_type: "scheduled_stop", seasonal: true, season_start: "June", season_end: "August" },
  { id: "prod-ird-pecans", name: "Pecans", price: 13.00, description: "1 lb bag of premium pecans from Ellis Brothers Pecans, Georgia. Rich, buttery flavor - perfect for baking, snacking, or recipes.", type: "nuts", image_url: "https://cdn.shopify.com/s/files/1/0506/2908/3294/files/Pecans---INDIANRIVER-42.jpg", shipping_type: "pickup", brand_id: "brand-ird", is_active: true, pickup_type: "scheduled_stop" },
  { id: "prod-ird-blueberries", name: "Blueberries", price: 0, description: "Fresh blueberries available in July. Price TBA.", type: "berries", image_url: null, shipping_type: "pickup", brand_id: "brand-ird", is_active: true, pickup_type: "scheduled_stop", seasonal: true, season_start: "July", season_end: "July", price_tba: true },
```

- [ ] **Step 3: Add seasonal/weather stops pattern**

Add a note about seasonal stops structure (append after line 34):
```typescript
// IRD stops are seasonal - peaches in summer, citrus in winter
// Schedule PDFs available at: https://indianriverdirect.com/pages/store-locator
```

- [ ] **Step 4: Remove old citrus products**

Remove the old citrus products (prod-ird-1 through prod-ird-5) since the site structure is different.

---

## Task 2: Update Indian River Direct Homepage

**Files:**
- Modify: `route_commerce-main/src/app/indian-river-direct/page.tsx`

- [ ] **Step 1: Read current file**

```bash
cat route_commerce-main/src/app/indian-river-direct/page.tsx
```

- [ ] **Step 2: Update hero section with Peach Farm Direct branding**

The site shows two brands: "Peach Farm Direct" (summer) and "Indian River Direct" (citrus/winter). Update hero to reflect this.

- [ ] **Step 3: Add News Board section**

Add seasonal announcements from the scraped site:
```
The 2026 Peach Schedule is now Available online. Pre-order is also open, but not required. Walk up customers are welcome.
Peach Season begins June 12th through Aug 2nd.
```

- [ ] **Step 4: Add "Since 1985" badge and brand story**

Update the about section with:
- "Since 1985" badge
- Family-owned messaging
- Direct farm-to-table promise

- [ ] **Step 5: Add testimonials from the site**

Include the 3 testimonials from the homepage:
1. Linda Hurlbut - about grapefruit quality
2. Phil Myers - about tangerines and Red Navels
3. Bill Prue - about Orrie Tangerines

- [ ] **Step 6: Add newsletter signup section**

Match the "Sign up for savings and tour updates" section from the scraped site.

---

## Task 3: Update Indian River Direct Layout

**Files:**
- Modify: `route_commerce-main/src/app/indian-river-direct/layout.tsx`

- [ ] **Step 1: Update metadata**

```typescript
export const metadata: Metadata = {
  title: "Indian River Direct | Peach & Citrus Truckload",
  description: "Fresh peaches and citrus delivered straight from our groves to truckload sales in your neighborhood. Family-owned since 1985.",
};
```

---

## Task 4: Create Store Locator Page

**Files:**
- Create: `route_commerce-main/src/app/indian-river-direct/stores/page.tsx`

- [ ] **Step 1: Create page matching scraped site's store-locator**

```typescript
// Route: /indian-river-direct/stores
// Shows: Links to schedule PDFs and seasonal pickup locations
// Content from indianriverdirect.com/pages/store-locator

export default function StoreLocatorPage() {
  return (
    // Hero section with "Keep up to date with Indian River Direct & The Peach Farm Direct"
    // Links to OH-IN-KY-WV and WI-IL schedule PDFs
    // Pickup-only notice for pecans
    // Newsletter signup
  );
}
```

---

## Task 5: Update Brand Config

**Files:**
- Modify: `route_commerce-main/src/config/brands.ts`

- [ ] **Step 1: Add IRD brand configuration**

```typescript
// Add IRD brand config
export const brandConfigIRD = {
  name: "Indian River Direct",
  tagline: "Farm-Direct to Your Neighborhood",
  founded: 1985,
  accent_color: "#f97316", // Orange for citrus
  secondary_color: "#ea580c",
  features: {
    preorder: true,
    pickupOnly: true,
    seasonal: true,
  },
  seasonal: {
    peaches: { start: "June", end: "August" },
    blueberries: { start: "July", end: "July" },
    citrus: { start: "November", end: "April" },
  },
};
```

---

## Task 6: Update Admin Product Management

**Files:**
- Modify: `route_commerce-main/src/app/admin/products/page.tsx`

- [ ] **Step 1: Add product type filtering**

Filter products by:
- `preorder` - peaches need pre-order
- `pickup_only` - pecans and blueberries
- `seasonal` - shows season dates

- [ ] **Step 2: Add price TBA support**

Handle products where price is $0 with "Price TBA" display.

---

## Verification

- [ ] Run: `npm run dev` and navigate to `/indian-river-direct`
- [ ] Verify products show correct prices and descriptions
- [ ] Verify seasonal badges appear on peaches
- [ ] Verify "Price TBA" shows for blueberries
- [ ] Verify pickup-only notice for pecans

---

## Notes

1. **Seasonal Nature:** The IRD site is highly seasonal - peaches in summer, citrus in winter. The app needs to handle products being unavailable/out of season.

2. **Pickup Model:** Unlike Tuxedo's dual shipping/pickup, IRD uses pickup-only with scheduled truck stops.

3. **Schedule PDFs:** The site links to PDF schedules for each region - this could be integrated into the stops system.

4. **Brand Identity:** The "Peach Farm Direct" summer branding and "Indian River Direct" winter branding should be represented in the UI.

---

**Plan saved:** `docs/superpowers/plans/2026-01-09-indian-river-data-migration.md`

**Two execution options:**

1. **Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

2. **Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**