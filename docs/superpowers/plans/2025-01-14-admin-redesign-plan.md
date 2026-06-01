# Admin Pages Redesign Implementation Plan

**Goal:** Unify admin pages with warm earth-tone dark sidebar, cream content, emerald accent, monospace data tables.

**Architecture:** Create shared CSS design tokens, update sidebar with warm dark theme, then update each content page to use consistent styling.

**Tech Stack:** Next.js, Tailwind CSS, React

---

## Task 1: Create CSS Design Tokens

**Files:**
- Create: `src/styles/admin-tokens.css`

- [ ] **Step 1: Create CSS tokens file**

```css
/* Admin Design Tokens */
:root {
  /* Sidebar - Warm Earth Tones */
  --sidebar-bg: #1c1917;
  --sidebar-border: #292524;
  --sidebar-text: #d6d3d1;
  --sidebar-text-muted: #78716c;
  --sidebar-text-hover: #fafaf9;
  --sidebar-active-bg: rgba(5, 150, 105, 0.1);
  --sidebar-active-border: #059669;

  /* Content Area - Warm Cream */
  --bg-page: #fdfaf6;
  --bg-card: #ffffff;
  --border-subtle: #e7e5e4;
  --text-primary: #1c1917;
  --text-secondary: #57534e;
  --text-muted: #a8a29e;

  /* Accent - Emerald */
  --accent: #059669;
  --accent-hover: #047857;
  --accent-light: #d1fae5;
  --accent-text: #065f46;

  /* Status */
  --status-pending: #f59e0b;
  --status-active: #059669;
  --status-muted: #a8a29e;

  /* Shadows */
  --shadow-card: 0 1px 3px rgba(28, 25, 23, 0.06), 0 1px 2px rgba(28, 25, 23, 0.04);
  --shadow-card-hover: 0 4px 6px rgba(28, 25, 23, 0.08), 0 2px 4px rgba(28, 25, 23, 0.06);

  /* Typography */
  --font-heading: 'DM Sans', system-ui, sans-serif;
  --font-body: 'DM Sans', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;

  /* Spacing */
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.25rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-10: 2.5rem;
  --space-12: 3rem;

  /* Border Radius */
  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;
}
```

- [ ] **Step 2: Add to global CSS or import in layout**

Check `src/app/globals.css` and add import at top:
```css
@import './styles/admin-tokens.css';
```

Run: `ls src/app/globals.css`
Expected: File exists

- [ ] **Step 3: Commit**

```bash
git add src/styles/admin-tokens.css src/app/globals.css
git commit -m "feat: add admin CSS design tokens"
```

---

## Task 2: Update AdminSidebar Component

**Files:**
- Modify: `src/components/admin/AdminSidebar.tsx`

- [ ] **Step 1: Read current sidebar**

Run: `cat src/components/admin/AdminSidebar.tsx | head -120`

- [ ] **Step 2: Update sidebar styling for warm earth tones**

Replace the sidebar className from:
```css
bg-white border-r border-stone-200
```
To:
```css
bg-stone-900 border-r border-stone-800
```

Update text colors from stone-600/stone-950 to warm equivalents:
- inactive text: stone-300 → sidebar-text
- active text: emerald-700 → emerald-400
- hover: stone-50 → sidebar-text-hover

Update active state background from `bg-emerald-50` to `bg-emerald-900/20`

Update role badge background from `bg-stone-50` to `bg-stone-800`

Update sign out button hover from `bg-stone-50` to `bg-stone-800`

- [ ] **Step 3: Add Back to Site link**

In the logo row, after the admin logo link, add:
```tsx
<a
  href="/"
  className="ml-4 text-xs text-stone-500 hover:text-stone-300 transition-colors"
>
  ← Back to Site
</a>
```

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/AdminSidebar.tsx
git commit -m "style: update sidebar to warm earth tones with Back to Site link"
```

---

## Task 3: Update Admin Layout Background

**Files:**
- Modify: `src/app/admin/layout.tsx`

- [ ] **Step 1: Update background class**

Change from:
```tsx
<div className="min-h-screen bg-stone-100 lg:pl-60">
```
To:
```tsx
<div className="min-h-screen bg-[var(--bg-page)] lg:pl-60">
```

- [ ] **Step 2: Also update the access denied div**

Same change for the access denied div.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/layout.tsx
git commit -m "style: update admin layout to use warm cream background"
```

---

## Task 4: Update Dashboard Page

**Files:**
- Modify: `src/app/admin/page.tsx`

- [ ] **Step 1: Update page background**

Change `bg-stone-100` to `bg-transparent` (inherits from layout)

- [ ] **Step 2: Update section headers**

Change `text-stone-500` (muted labels) to `var(--text-muted)`
Change `text-stone-950` to `var(--text-primary)`
Change `text-stone-600` to `var(--text-secondary)`

- [ ] **Step 3: Update cards to use white bg**

Cards already use `card` class which should be white with shadow. Verify this works with the warm cream background.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/page.tsx
git commit -m "style: update dashboard page styling"
```

---

## Task 5: Update Orders Page

**Files:**
- Modify: `src/app/admin/orders/page.tsx`
- Modify: `src/components/admin/AdminOrdersPanel.tsx`

- [ ] **Step 1: Remove dark wrapper from orders panel**

In AdminOrdersPanel, remove the dark wrapper:
```tsx
// Remove: <div className="min-h-screen bg-zinc-950">
// Just return the inner content, let layout handle bg
```

- [ ] **Step 2: Update table to warm cream theme**

Replace all `bg-zinc-900`, `bg-zinc-950`, `border-zinc-800`, `text-zinc-*` with warm equivalents:
- `bg-zinc-900` → `bg-white`
- `bg-zinc-950` → `bg-stone-50`
- `border-zinc-800` → `border-stone-200`
- `text-zinc-100` → `text-stone-900`
- `text-zinc-200` → `text-stone-700`
- `text-zinc-400` → `text-stone-500`
- `text-zinc-500` → `text-stone-400`

- [ ] **Step 3: Add monospace to data cells**

Add `font-mono` to order ID, phone numbers, dates, amounts.

- [ ] **Step 4: Update status badges**

Replace `bg-emerald-950/60 text-emerald-400 border-emerald-800/50` with:
```tsx
bg-emerald-100 text-emerald-700 border border-emerald-200
```

Same for amber and purple status badges.

- [ ] **Step 5: Update filter bar**

Change from dark filter buttons to light theme:
```tsx
<div className="flex gap-1 rounded-lg border border-stone-200 bg-white p-1">
  <button className={statusFilter === f ? "bg-emerald-100 text-emerald-700 border border-emerald-200" : "text-stone-500 hover:text-stone-700 hover:bg-stone-50"}>
```

- [ ] **Step 6: Update search/select inputs**

Change `bg-zinc-900` to `bg-white`, `border-zinc-800` to `border-stone-200`, `text-zinc-100` to `text-stone-900`

- [ ] **Step 7: Update orders page wrapper**

In orders/page.tsx, the main already has `bg-stone-100 px-6 py-10`. Change to `bg-transparent px-6 py-10`.

- [ ] **Step 8: Commit**

```bash
git add src/components/admin/AdminOrdersPanel.tsx src/app/admin/orders/page.tsx
git commit -m "style: convert orders table from dark to warm cream theme"
```

---

## Task 6: Update Products Page

**Files:**
- Modify: `src/app/admin/products/page.tsx`

- [ ] **Step 1: Change background**

From `bg-stone-100` to `bg-transparent`

- [ ] **Step 2: Update button**

Change `bg-blue-600 hover:bg-blue-500` to `bg-emerald-600 hover:bg-emerald-500` for Add Product button.

- [ ] **Step 3: Verify card styling**

The table wrapper already uses `rounded-2xl bg-white shadow-xl`. This should work with cream bg.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/products/page.tsx
git commit -m "style: update products page to match admin theme"
```

---

## Task 7: Update Communications Page

**Files:**
- Modify: `src/app/admin/communications/page.tsx`

- [ ] **Step 1: Change background**

From `bg-stone-100` to `bg-transparent`

- [ ] **Step 2: Commit**

```bash
git add src/app/admin/communications/page.tsx
git commit -m "style: update communications page to match admin theme"
```

---

## Task 8: Update Settings Page

**Files:**
- Modify: `src/app/admin/settings/page.tsx`

- [ ] **Step 1: Change background**

From `bg-stone-100` to `bg-transparent`

- [ ] **Step 2: Commit**

```bash
git add src/app/admin/settings/page.tsx
git commit -m "style: update settings page to match admin theme"
```

---

## Task 9: Add Google Fonts to Layout

**Files:**
- Modify: `src/app/layout.tsx` (root layout, not admin layout)

- [ ] **Step 1: Add font links**

In the `<head>` section, add:
```tsx
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
```

- [ ] **Step 2: Apply to body/html**

Add `style={{ fontFamily: 'var(--font-body)' }}` to the body or html tag.

- [ ] **Step 3: Commit**

```bash
git add src/app/layout.tsx
git commit -m "style: add DM Sans and JetBrains Mono fonts"
```

---

## Task 10: Test and Verify

- [ ] **Step 1: Start dev server**

Run: `npm run dev`
Expected: Dev server starts on port 3000

- [ ] **Step 2: Check admin dashboard**

Open: http://localhost:3000/admin
Expected: Warm cream background, dark earth-tone sidebar with emerald accent, Back to Site link visible

- [ ] **Step 3: Check orders page**

Navigate to Orders
Expected: Light cream table with monospace data, warm status badges

- [ ] **Step 4: Check products page**

Navigate to Products
Expected: Consistent styling, emerald Add Product button

- [ ] **Step 5: Mobile test**

Resize browser to mobile width
Expected: Sidebar hidden, hamburger visible, tap reveals sidebar overlay

- [ ] **Step 6: Final commit if all good**

```bash
git add -A && git commit -m "style: complete admin redesign - warm earth sidebar, cream content, emerald accent"
```

---

## Spec Coverage Check

- [x] Warm earth-tone sidebar with Back to Site
- [x] Cream/ivory content background
- [x] Emerald accent for active states
- [x] Monospace for data tables
- [x] Single nav surface (no duplicate headers)
- [x] All pages unified
- [x] Mobile responsive sidebar