"use server";

import { getAdminUser } from "@/lib/admin-permissions";
import {
  setActiveBrandCookie,
  clearActiveBrandCookie,
} from "@/lib/brand-scope";

/**
 * Set the persistent "active brand" for the current admin user.
 *
 * - `brandId === null`: "All brands" — only allowed for platform_admin.
 *   Clears the cookie (cookie absence = no specific brand pinned).
 * - `brandId` string: sets the cookie, after validating the admin has access.
 *
 * The active brand is the default the UI uses for pages that don't receive
 * an explicit `brandId` from the URL. The cookie is the source of truth —
 * the URL is only for deep-linking.
 */
export async function setActiveBrand(
  brandId: string | null
): Promise<{ success: boolean; error?: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };

  // null = "All brands" (platform_admin only)
  if (brandId === null) {
    if (adminUser.role !== "platform_admin") {
      return {
        success: false,
        error: "Only platform admins can select 'All brands'",
      };
    }
    await clearActiveBrandCookie();
    return { success: true };
  }

  if (
    adminUser.role !== "platform_admin" &&
    !adminUser.brand_ids.includes(brandId)
  ) {
    return { success: false, error: "No access to that brand" };
  }

  await setActiveBrandCookie(brandId);
  return { success: true };
}
