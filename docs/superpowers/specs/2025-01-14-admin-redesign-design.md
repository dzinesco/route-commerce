# Admin Pages Redesign — Design Spec

**Date:** 2025-01-14
**Status:** Approved

## Overview

Unify the admin pages with a consistent design system: warm earth-tone dark sidebar, cream/ivory content area, emerald accent, monospace for data. Eliminate duplicate header/sidebar navigation — sidebar is the single nav surface.

## Design Tokens

### Colors

```css
/* Sidebar */
--sidebar-bg: #1c1917;           /* stone-900, warm dark */
--sidebar-border: #292524;      /* stone-800 */
--sidebar-text: #d6d3d1;        /* stone-300 */
--sidebar-text-muted: #78716c;  /* stone-500 */
--sidebar-text-hover: #fafaf9;  /* stone-50 */

/* Content Area */
--bg-page: #fdfaf6;             /* warm cream */
--bg-card: #ffffff;            /* white cards */
--border-subtle: #e7e5e4;       /* stone-200 */
--text-primary: #1c1917;        /* stone-900 */
--text-secondary: #57534e;      /* stone-600 */
--text-muted: #a8a29e;          /* stone-400 */

/* Accent */
--accent: #059669;              /* emerald-600 */
--accent-hover: #047857;        /* emerald-700 */
--accent-light: #d1fae5;        /* emerald-100 */
--accent-text: #065f46;         /* emerald-800 */

/* Status Colors */
--status-pending: #f59e0b;      /* amber-500 */
--status-active: #059669;       /* emerald-600 */
--status-muted: #a8a29e;       /* stone-400 */

/* Shadows */
--shadow-card: 0 1px 3px rgba(28, 25, 23, 0.06), 0 1px 2px rgba(28, 25, 23, 0.04);
--shadow-card-hover: 0 4px 6px rgba(28, 25, 23, 0.08), 0 2px 4px rgba(28, 25, 23, 0.06);
```

### Typography

```css
/* Headings: DM Sans (warm humanist) */
--font-heading: 'DM Sans', system-ui, sans-serif;

/* Body: DM Sans */
--font-body: 'DM Sans', system-ui, sans-serif;

/* Monospace: JetBrains Mono (for data tables, IDs, codes) */
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;

/* Scale */
--text-xs: 0.75rem;     /* 12px */
--text-sm: 0.875rem;    /* 14px */
--text-base: 1rem;      /* 16px */
--text-lg: 1.125rem;    /* 18px */
--text-xl: 1.25rem;     /* 20px */
--text-2xl: 1.5rem;     /* 24px */
--text-3xl: 1.875rem;   /* 30px */
--text-4xl: 2.25rem;    /* 36px */
```

### Spacing & Border Radius

```css
--radius-sm: 0.375rem;  /* 6px */
--radius-md: 0.5rem;    /* 8px */
--radius-lg: 0.75rem;   /* 12px */
--radius-xl: 1rem;       /* 16px */

--space-1: 0.25rem;     /* 4px */
--space-2: 0.5rem;       /* 8px */
--space-3: 0.75rem;      /* 12px */
--space-4: 1rem;         /* 16px */
--space-5: 1.25rem;      /* 20px */
--space-6: 1.5rem;       /* 24px */
--space-8: 2rem;         /* 32px */
--space-10: 2.5rem;      /* 40px */
--space-12: 3rem;        /* 48px */
```

### Sidebar Layout

- Width: 240px (desktop), off-canvas on mobile
- Full height, fixed position
- Logo/brand area at top
- Nav items with icons + labels
- Settings collapsible section
- User role badge + sign out at bottom
- "Back to Site" link in logo area
- Active state: emerald background tint + emerald left border + emerald dot indicator

### Content Area

- Starts at `lg:pl-60` (sidebar width) on desktop
- Mobile: full width with hamburger trigger for sidebar
- Max content width: 1280px centered
- Page header with breadcrumb (optional per page)
- Card-based layouts for data
- Generous padding (space-10 or space-12 vertical)

## Pages to Update

1. **Admin Dashboard** (`/admin/page.tsx`) — Already has good structure, minor refinements
2. **Orders** (`/admin/orders/page.tsx`) — Convert from dark zinc to warm cream + monospace table
3. **Products** (`/admin/products/page.tsx`) — Light theme, consistent header
4. **Communications** (`/admin/communications/page.tsx`) — Light theme, consistent header
5. **Settings** (`/admin/settings/page.tsx`) — Light theme, consistent header
6. **All sub-pages** — Ensure consistent header style if they have one

## Component Inventory

### Sidebar Navigation
- Logo with "Back to Site" link
- Nav items: icon + label, active state with emerald indicator
- Collapsible Settings section
- Role badge
- Sign out button

### Page Header
- Breadcrumb (optional): "Admin / Section"
- Page title: text-3xl, font-heading, bold
- Page description: text-secondary
- Action buttons (right-aligned)

### Data Table
- Monospace font for all data cells
- Subtle border between rows
- Sticky header row
- Hover state on rows
- Status badges with appropriate colors
- Action buttons in last column

### Cards
- White background
- Subtle shadow
- Rounded-xl corners
- Consistent padding

### Buttons
- Primary: emerald bg, white text
- Secondary: white bg, stone border, stone text
- Ghost: transparent, hover shows bg

### Form Inputs
- White background
- Stone border
- Focus: emerald border
- Monospace for codes/IDs

## Implementation Notes

1. Create CSS variables file at `src/styles/admin-tokens.css`
2. Import tokens in admin layout
3. Update sidebar component to use new styling
4. Update each page progressively
5. Orders table needs most work — dark theme → warm cream with monospace
6. Ensure mobile responsive behavior

## Out of Scope

- Backend logic changes
- Database schema changes
- Authentication flow changes
- Creating new pages
- Changing navigation items (already locked)