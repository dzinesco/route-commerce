/**
 * Brand-scope helpers for multi-brand admin support.
 *
 * Resolution order (documented in
 * docs/superpowers/specs/2026-06-04-multi-brand-admin-design.md):
 *   1. URL/explicit `requested` brand id (highest priority)
 *   2. `active_brand_id` cookie (the persistent "what brand am I in right now")
 *   3. `adminUser.brand_id` (legacy single-brand fallback)
 *   4. First of `adminUser.brand_ids`
 *   5. (platform_admin only) `null` → "all brands"
 *
 * For non-platform-admins, the returned brand is validated against
 * `adminUser.brand_ids` — if `requested` or the cookie brand is not in the
 * admin's accessible brands, the resolver falls through to a brand the admin
 * does have access to (silent recovery).
 */

import "server-only";
import { cookies } from "next/headers";
import type { AdminUser } from "./admin-permissions-types";

export const ACTIVE_BRAND_COOKIE = "active_brand_id";

/**
 * Resolve the active brand id for the given admin user.
 *
 * @param adminUser - The current admin user (must already be loaded).
 * @param requested - Optional explicit brand id (e.g. from a URL param).
 *                    When set and the admin has access, wins over cookie.
 * @returns The brand id to act in, or `null` for platform_admin "all brands".
 */
export async function getActiveBrandId(
  adminUser: AdminUser,
  requested?: string | null
): Promise<string | null> {
  const cookieStore = await cookies();
  const cookieBrand = cookieStore.get(ACTIVE_BRAND_COOKIE)?.value ?? null;

  // platform_admin: requested > cookie > null (all brands)
  if (adminUser.role === "platform_admin") {
    return requested ?? cookieBrand ?? null;
  }

  // Non-platform-admin: validate that requested/cookie brands are accessible
  if (requested && adminUser.brand_ids.includes(requested)) {
    return requested;
  }
  if (cookieBrand && adminUser.brand_ids.includes(cookieBrand)) {
    return cookieBrand;
  }

  // Fall back to the legacy single brand, then first of the membership list
  return adminUser.brand_id ?? adminUser.brand_ids[0] ?? null;
}

/**
 * Set the persistent active-brand cookie. Should only be called after
 * validating the admin has access (use `assertBrandAccess`).
 */
export async function setActiveBrandCookie(brandId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_BRAND_COOKIE, brandId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

/**
 * Clear the active-brand cookie. Used when platform_admin selects
 * "All brands" (the cookie absence = "no specific brand pinned").
 */
export async function clearActiveBrandCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ACTIVE_BRAND_COOKIE);
}

/**
 * Throws if the admin user is not a platform_admin and does not have the
 * given brand in their membership list. Use this for server actions and
 * API routes that receive a brandId from URL/form/RPC return rather than
 * `getActiveBrandId`.
 */
export function assertBrandAccess(adminUser: AdminUser, brandId: string): void {
  if (adminUser.role === "platform_admin") return;
  if (!adminUser.brand_ids.includes(brandId)) {
    throw new Error("Brand access denied");
  }
}
