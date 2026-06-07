"use server";

import { getAdminUser } from "@/lib/admin-permissions";
import { withTenant } from "@/db/client";
import { brandSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import {
  invalidateBrandFeatureCache,
  type BrandFeatureKey,
} from "@/lib/feature-flags";

export type ToggleFeatureResult =
  | { success: true }
  | { success: false; error: string };

/**
 * Toggle an add-on feature flag for a brand. The new schema stores feature
 * flags as a JSONB blob in `brand_settings.feature_flags` — see
 * `src/lib/feature-flags.ts` for the read path. The legacy RPC
 * `set_brand_feature(p_brand_id, p_feature_key, p_enabled)` and the
 * `brand_features` table it wrote to are gone.
 */
export async function toggleBrandFeature(
  brandId: string,
  featureKey: BrandFeatureKey,
  enabled: boolean
): Promise<ToggleFeatureResult> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (!adminUser.can_manage_settings && adminUser.role !== "platform_admin") {
    return { success: false, error: "Not authorized" };
  }
  if (adminUser.role === "brand_admin" && adminUser.brand_id !== brandId) {
    return { success: false, error: "Not authorized for this brand" };
  }

  try {
    await withTenant(brandId, async (db) => {
      const existing = await db
        .select({ featureFlags: brandSettings.featureFlags })
        .from(brandSettings)
        .where(eq(brandSettings.tenantId, brandId))
        .limit(1);
      const current = (existing[0]?.featureFlags ?? {}) as Record<string, unknown>;
      const next = { ...current, [featureKey]: enabled };
      if (existing.length === 0) {
        // No row yet — bootstrap with the brand name from tenants.
        await db
          .insert(brandSettings)
          .values({ tenantId: brandId, brandName: "Brand", featureFlags: next });
      } else {
        await db
          .update(brandSettings)
          .set({ featureFlags: next, updatedAt: new Date() })
          .where(eq(brandSettings.tenantId, brandId));
      }
    });

    invalidateBrandFeatureCache(brandId);
    revalidatePath("/admin/settings/apps");
    revalidatePath("/admin");

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to toggle feature",
    };
  }
}
