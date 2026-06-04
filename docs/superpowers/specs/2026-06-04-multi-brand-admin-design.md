# Multi-Brand Admin Support

**Date:** 2026-06-04
**Status:** Draft → Approved
**Author:** Grok (brainstorming session)
**Migration file:** `supabase/migrations/204_multi_brand_admin.sql`
**Follow-up migration (out of scope):** `220_drop_legacy_brand_id.sql`

## Problem

`admin_users.brand_id` is a single `UUID | null`. The platform supports a `platform_admin` role (no brand) and a `brand_admin` role (one brand). There is no representation for an admin who legitimately needs access to 2+ specific brands — e.g., a parent company operating multiple storefronts with shared operations staff.

The current `effectiveBrandId = brandId ?? adminUser.brand_id ?? null` pattern silently does the wrong thing for multi-brand use cases:

- Data model can't represent "Jane is admin for Brand A AND Brand B" — would require two `admin_users` rows (and the auth-user→admin-user join gets messy).
- No central validation that an admin is acting in a brand they actually have access to.
- No persistent "current brand" context — every page re-derives it from scratch.
- No per-brand permission overrides possible (locks in flexibility for the future).

This spec addresses multi-brand tenants / franchises: same staff managing multiple brands under a parent org, where brands are separate for storefront/billing but share operations.

## Goals

- An admin can be associated with multiple brands via a junction table.
- A persistent "active brand" is stored in a cookie, switchable via UI, and used as the default when no explicit brand is requested.
- A new `multi_brand_admin` role makes the relationship explicit in the data and the UI.
- `platform_admin` continues to work unchanged (gets all brands implicitly).
- Existing single-brand `brand_admin`, `store_employee`, and `staff` users continue to work with zero behavior change.
- Server actions get a single, central place to resolve and validate the active brand.

## Non-Goals (YAGNI)

- Per-(admin, brand) permission overrides. The user explicitly chose "same perms across all brands."
- Brand-group / parent-org concept. The junction table makes this possible later, but it's not built now.
- "Last accessed brand" auto-redirect. The cookie is the source of truth; no extra logic.
- UI for managing `admin_user_brands` rows. Use Supabase Studio or a follow-up admin UI PR.
- Dropping the legacy `admin_users.brand_id` column. A follow-up migration `220_drop_legacy_brand_id.sql` will do this after we verify nothing reads it. Out of scope for this spec.

## Approach: Junction Table + Backwards-Compat `brand_id`

Selected from among three options:

| Option | Why not |
|---|---|
| A. Junction + keep `brand_id` (selected) | — |
| B. Junction only, drop `brand_id` | High migration risk; every server action reference must change. |
| C. `brand_ids UUID[]` on `admin_users` | No FK, awkward reverse lookups, locks out per-brand metadata. |

A is the lowest-risk additive path that solves the problem.

## Data Model

### New table: `admin_user_brands`

```sql
CREATE TABLE admin_user_brands (
  admin_user_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  brand_id      UUID NOT NULL REFERENCES brands(id)     ON DELETE CASCADE,
  added_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  added_by      UUID REFERENCES admin_users(id),
  PRIMARY KEY (admin_user_id, brand_id)
);
CREATE INDEX admin_user_brands_brand_id_idx ON admin_user_brands(brand_id);
```

- Composite PK enforces uniqueness.
- Index on `brand_id` makes "which admins are in Brand X?" queries fast.
- `added_at` / `added_by` for audit trail.
- `ON DELETE CASCADE` for both FKs — deleting an admin or brand cleans up the junction.

### New role: `multi_brand_admin`

Added to the `role` CHECK constraint. Functionally equivalent to `brand_admin` permission-wise — same `can_manage_*` flags apply. The role label disambiguates intent in the UI ("this person manages 3 brands" vs "this person manages 1 brand") and in audit logs.

### Updated `AdminUser` type

```ts
// src/lib/admin-permissions-types.ts
export type AdminUser = {
  // ... existing fields
  brand_id: string | null;    // active brand (one of brand_ids, or null for platform_admin)
  brand_ids: string[];        // all brands this admin can act in
  role: "platform_admin" | "brand_admin" | "multi_brand_admin" | "store_employee" | "staff";
};
```

### Membership rules

| Role | `brand_id` (active) | `brand_ids` (membership) |
|---|---|---|
| `platform_admin` | `null` (or cookie-selected brand) | Implicitly all brands; `brand_ids` populated by `listBrandsForAdmin` querying the `brands` table |
| `multi_brand_admin` | First/selected brand | 2+ brands from `admin_user_brands` |
| `brand_admin` | Their single brand | `[that one brand]` |
| `store_employee` | Their single brand | `[that one brand]` |
| `staff` | Their single brand | `[that one brand]` |

For `platform_admin`, the application layer short-circuits brand-access checks (`if (adminUser.role === "platform_admin") return ...`). The `brand_ids` field is only used by `listBrandsForAdmin` to render the dropdown options; it is not used for permission gating for `platform_admin`.

### `getAdminUser()` resolution order

1. If `dev_session` cookie set → return dev admin. For `platform_admin` dev: `brand_id: null, brand_ids: []` (resolved against `brands` table by `listBrandsForAdmin`). For `store_employee` dev: `brand_id: <first-real-brand-id>, brand_ids: [<that-id>]` — fetched from the `brands` table so dev store_employee can browse a real brand's data. (If no brands exist, dev store_employee sees `<AdminAccessDenied />` — known limitation.)
2. If `NEXT_PUBLIC_USE_MOCK_DATA=true` → same as `platform_admin` dev.
3. Real auth → load `admin_users` row, then JOIN `admin_user_brands` to populate `brand_ids`.
4. Set `brand_id` from (in order): `active_brand_id` cookie (if in `brand_ids` for non-platform-admin, or always for platform-admin) → `admin_users.brand_id` (if in `brand_ids`) → first of `brand_ids`.

## Server Action Patterns

### New file: `src/lib/brand-scope.ts`

```ts
import { cookies } from "next/headers";
import type { AdminUser } from "./admin-permissions-types";

const ACTIVE_BRAND_COOKIE = "active_brand_id";

export async function getActiveBrandId(
  adminUser: AdminUser,
  requested?: string | null
): Promise<string | null> {
  // Cookie is the source of truth for "what brand am I acting in right now"
  // for everyone — including platform_admin (who can pin a specific brand
  // or fall back to null = "all brands").
  const cookieStore = await cookies();
  const cookieBrand = cookieStore.get(ACTIVE_BRAND_COOKIE)?.value ?? null;

  if (adminUser.role === "platform_admin") {
    // requested > cookie > null (all brands)
    return requested ?? cookieBrand ?? null;
  }

  // Non-platform-admin: requested (if in brand_ids) > cookie (if in brand_ids) > adminUser.brand_id
  if (requested) {
    return adminUser.brand_ids.includes(requested) ? requested : null;
  }
  if (cookieBrand && adminUser.brand_ids.includes(cookieBrand)) {
    return cookieBrand;
  }
  return adminUser.brand_id;
}

export async function setActiveBrandCookie(brandId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_BRAND_COOKIE, brandId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

export async function clearActiveBrandCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ACTIVE_BRAND_COOKIE);
}

export function assertBrandAccess(adminUser: AdminUser, brandId: string): void {
  if (adminUser.role === "platform_admin") return;
  if (!adminUser.brand_ids.includes(brandId)) {
    throw new Error("Brand access denied");
  }
}
```

### Server action: set active brand

```ts
// src/actions/admin/set-active-brand.ts
"use server";
import { getAdminUser } from "@/lib/admin-permissions";
import { setActiveBrandCookie, clearActiveBrandCookie } from "@/lib/brand-scope";

export async function setActiveBrand(brandId: string | null): Promise<{ success: boolean; error?: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };

  // null = "All brands" (platform_admin only)
  if (brandId === null) {
    if (adminUser.role !== "platform_admin") {
      return { success: false, error: "Only platform admins can select 'All brands'" };
    }
    await clearActiveBrandCookie();
    return { success: true };
  }

  if (adminUser.role !== "platform_admin" && !adminUser.brand_ids.includes(brandId)) {
    return { success: false, error: "No access to that brand" };
  }
  await setActiveBrandCookie(brandId);
  return { success: true };
}
```

### New server function: list brands for admin

```ts
// src/actions/brands.ts
import { getAdminUser } from "@/lib/admin-permissions";
import { svcHeaders } from "@/lib/svc-headers";

export async function listBrandsForAdmin(): Promise<
  { id: string; name: string; slug: string; logo_url: string | null }[]
> {
  const adminUser = await getAdminUser();
  if (!adminUser) return [];

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (adminUser.role === "platform_admin") {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/brands?select=id,name,slug,logo_url&order=name`,
      { headers: svcHeaders(serviceKey) }
    );
    return res.ok ? await res.json() : [];
  }

  if (adminUser.brand_ids.length === 0) return [];

  const filter = `id=in.(${adminUser.brand_ids.map((id) => `"${id}"`).join(",")})`;
  const res = await fetch(
    `${supabaseUrl}/rest/v1/brands?${filter}&select=id,name,slug,logo_url&order=name`,
    { headers: svcHeaders(serviceKey) }
  );
  return res.ok ? await res.json() : [];
}
```

### Server action migration pattern

```ts
// Before:
const effectiveBrandId = brandId ?? adminUser.brand_id ?? null;

// After:
import { getActiveBrandId } from "@/lib/brand-scope";

const activeBrandId = await getActiveBrandId(adminUser, brandId);
if (!activeBrandId && adminUser.role !== "platform_admin") {
  return { success: false, error: "Brand access required" };
}
const effectiveBrandId = activeBrandId;
```

This is a mechanical one-line swap in ~30 server actions identified by the grep:

- `src/actions/wholesale.ts` (multiple)
- `src/actions/products.ts`
- `src/actions/communications/templates.ts`
- `src/actions/communications/campaigns.ts`
- `src/actions/orders/create-admin-order.ts`
- `src/actions/stops.ts`
- `src/actions/analytics.ts`
- `src/actions/square-sync-ui.ts`
- `src/actions/shipping.ts`
- `src/actions/payments.ts`
- `src/actions/ai-import.ts`
- `src/actions/wholesale-register.ts`

### Page server component pattern

```ts
// Before (src/app/admin/orders/page.tsx):
const effectiveBrandId = brandIdParam ?? adminUser.brand_id ?? "";

// After:
import { getActiveBrandId } from "@/lib/brand-scope";

export default async function AdminOrdersPage() {
  const adminUser = await getAdminUser();
  if (!adminUser) return <AdminAccessDenied />;

  const activeBrandId = await getActiveBrandId(adminUser, brandIdParam);

  if (!activeBrandId && adminUser.role !== "platform_admin") {
    return <AdminAccessDenied />;
  }

  // ... rest of the page
}
```

This applies to every page under `src/app/admin/` — including the existing `/admin/taxes/[brandId]` and `/admin/settings/billing/[brandId]` which already do brand param resolution.

## UI Components

### Brand selector

**Location:** `src/components/admin/AdminHeader.tsx` (the top bar already rendered on every `/admin/*` page).

**Behavior:** A dropdown showing:
- Brand logo + name (current active brand)
- Chevron
- "All brands" option at the top (only for `platform_admin`)
- List of accessible brands (`adminUser.brand_ids`)
- Small badge "Multi-brand manager" next to the user's name when `role === "multi_brand_admin"`

**Visibility matrix:**

| Admin | Show dropdown? | Options |
|---|---|---|
| `platform_admin` | Yes | "All brands" + list of all brands |
| `multi_brand_admin` (2+ brands) | Yes | List of their brands |
| `brand_admin` / `store_employee` / `staff` (1 brand) | No | — |
| `platform_admin` (dev_session) | Yes | "All brands" + list of all brands (same UX as production) |

**On select:**

```ts
// src/components/admin/BrandSelector.tsx (client component)
"use client";
async function handleSelect(brandId: string | null) {
  await setActiveBrand(brandId); // null = "All brands"
  router.refresh();
}
```

`router.refresh()` re-runs server components and re-reads the cookie, so all data on the current page reloads in the new brand context. The URL is **not** changed — the cookie is the source of truth for "what brand am I acting in right now."

### URL-level brand params

Keep URL-level brand as-is — URLs are shareable links. The resolution order for the `brandId` param passed to `getActiveBrandId` is:

1. URL `brandId` param (if present)
2. `active_brand_id` cookie
3. `adminUser.brand_id` (legacy single brand)
4. First of `adminUser.brand_ids`
5. (platform_admin only) `null` → "all brands"

## Migration: `supabase/migrations/204_multi_brand_admin.sql`

```sql
-- 1. Add multi_brand_admin to role CHECK constraint
ALTER TABLE admin_users DROP CONSTRAINT IF EXISTS admin_users_role_check;
ALTER TABLE admin_users ADD CONSTRAINT admin_users_role_check
  CHECK (role IN ('platform_admin', 'brand_admin', 'multi_brand_admin', 'store_employee', 'staff'));

-- 2. Create junction table
CREATE TABLE admin_user_brands (
  admin_user_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  brand_id      UUID NOT NULL REFERENCES brands(id)     ON DELETE CASCADE,
  added_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  added_by      UUID REFERENCES admin_users(id),
  PRIMARY KEY (admin_user_id, brand_id)
);
CREATE INDEX admin_user_brands_brand_id_idx ON admin_user_brands(brand_id);

-- 3. Backfill from existing brand_id (single-brand admins)
INSERT INTO admin_user_brands (admin_user_id, brand_id)
SELECT id, brand_id FROM admin_users
WHERE brand_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- 4. Promote anyone with > 1 brand to multi_brand_admin
UPDATE admin_users
SET role = 'multi_brand_admin'
WHERE role = 'brand_admin'
  AND id IN (
    SELECT admin_user_id FROM admin_user_brands
    GROUP BY admin_user_id HAVING COUNT(*) > 1
  );

-- 5. New RPCs for adding/removing brand access
CREATE OR REPLACE FUNCTION add_admin_user_brand(
  p_admin_user_id UUID, p_brand_id UUID, p_added_by UUID
) RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  INSERT INTO admin_user_brands (admin_user_id, brand_id, added_by)
  VALUES (p_admin_user_id, p_brand_id, p_added_by)
  ON CONFLICT DO NOTHING;
  UPDATE admin_users SET role = 'multi_brand_admin'
  WHERE id = p_admin_user_id
    AND role = 'brand_admin'
    AND (SELECT COUNT(*) FROM admin_user_brands WHERE admin_user_id = p_admin_user_id) > 1;
$$;

CREATE OR REPLACE FUNCTION remove_admin_user_brand(
  p_admin_user_id UUID, p_brand_id UUID
) RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  DELETE FROM admin_user_brands
  WHERE admin_user_id = p_admin_user_id AND brand_id = p_brand_id;
  UPDATE admin_users SET role = 'brand_admin'
  WHERE id = p_admin_user_id
    AND role = 'multi_brand_admin'
    AND (SELECT COUNT(*) FROM admin_user_brands WHERE admin_user_id = p_admin_user_id) = 1;
$$;
```

The `admin_users.brand_id` column is **kept** for backwards compat. A follow-up migration drops it after we verify nothing reads it.

## Error Handling & Security Boundaries

### Three failure modes

1. **Requested brand not in `brand_ids`** (e.g., URL param has a brand the admin doesn't have):
   - `getActiveBrandId()` returns `null`
   - Server action returns `{ success: false, error: "Brand access required" }`
   - Page renders `<AdminAccessDenied />` with: "You don't have access to that brand. [Switch to a brand you have access to]"

2. **Cookie brand no longer in `brand_ids`** (admin's access was revoked while cookie was still set):
   - `getActiveBrandId()` falls through to `adminUser.brand_id`, then first of `brand_ids`
   - Silent recovery — no error, no UI flash
   - The dropped brand just disappears from the dropdown next page load

3. **Platform admin acting on a brand they don't own:**
   - Platform admin: `brand_ids = ["*"]` (sentinel) — RPCs treat as "all brands"
   - Server action: never blocks platform admin from any brand
   - This is intentional — platform admin = superuser

### Validation placement (defense in depth)

- Server action: `getActiveBrandId(adminUser, requested)` validates.
- Server action: `assertBrandAccess(adminUser, brandIdFromUrl)` validates (separate, for cases where the brandId comes from URL/form/RPC return rather than `getActiveBrandId`).
- RPC: still trusts `p_brand_id` (SECURITY DEFINER) — application layer is the gate, matching the existing architecture.

### Audit logging (additive)

- `admin_user_brands.added_by` column tracks who added an admin to a brand.
- Audit log entry on add/remove: out of scope for v1; documented for follow-up.

## Testing

### Unit tests (`vitest` — new dev dependency)

- `src/lib/brand-scope.test.ts`:
  - `resolveActiveBrandId(platformAdmin, "X")` → `"X"`
  - `resolveActiveBrandId(brandAdmin, "X")` where X is their brand → `"X"`
  - `resolveActiveBrandId(brandAdmin, "Y")` where Y is not their brand → `null`
  - `getActiveBrandId(multiBrandAdmin)` with cookie set to valid brand → that brand
  - `getActiveBrandId(multiBrandAdmin)` with cookie set to revoked brand → first of `brand_ids`
  - `assertBrandAccess(...)` throws for non-platform-admin with invalid brand
  - `setActiveBrand(null)` rejected for non-platform-admin
  - `setActiveBrand("X")` rejected for admin without X in `brand_ids`

### Integration tests (Playwright — already in repo)

- `tests/admin/multi-brand.spec.ts`:
  - As `multi_brand_admin`, dropdown shows 2+ brands
  - Click brand B → URL stays, cookie updates, page data refreshes to brand B
  - Direct-navigate to `/admin/orders?brand=<other-brand>` for a brand admin returns access denied
  - As `platform_admin`, "All brands" option is present and works
  - As `brand_admin` with 1 brand, no dropdown is shown

### Migration smoke test (manual, documented in MEMORY.md)

- Before migration: 5 brand_admins exist, each with 1 brand
- After migration: 5 rows in `admin_user_brands`, all `role = 'brand_admin'`
- Create a 6th admin with 2 brands via `add_admin_user_brand` → `role = 'multi_brand_admin'`, 2 rows in junction
- Remove one of their brands via `remove_admin_user_brand` → `role` demotes to `brand_admin`, 1 row in junction

## Out of Scope (v1)

- Per-(admin, brand) permission overrides
- Brand-group / parent-org concept
- "Last accessed brand" auto-redirect
- UI for managing `admin_user_brands` rows (Supabase Studio works for now)
- Dropping the legacy `admin_users.brand_id` column (follow-up `220_*` migration)
- Audit log entries for add/remove (junction's `added_by` column is the seed)

## Implementation Order

1. Migration `204_multi_brand_admin.sql` applied
2. `src/lib/brand-scope.ts` + unit tests (TDD)
3. `AdminUser` type updated; `getAdminUser()` returns `brand_ids`
4. `setActiveBrand` server action + tests
5. `listBrandsForAdmin` server function + tests
6. BrandSelector UI component
7. Wire BrandSelector into AdminHeader
8. Server action migration (~30 actions) — mechanical one-line swap each
9. Page server component migration (~10+ pages) — same pattern
10. Playwright integration tests
11. Manual smoke test of the migration on dev DB
