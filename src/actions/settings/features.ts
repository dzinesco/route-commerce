"use server";

import { getAdminUser } from "@/lib/admin-permissions";
import { invalidateBrandFeatureCache, type BrandFeatureKey } from "@/lib/feature-flags";
import { revalidatePath } from "next/cache";
import { svcHeaders } from "@/lib/svc-headers";

export type ToggleFeatureResult =
  | { success: true }
  | { success: false; error: string };

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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/set_brand_feature`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({
        p_brand_id: brandId,
        p_feature_key: featureKey,
        p_enabled: enabled,
      }),
    }
  );

  if (!response.ok) {
    return { success: false, error: "Failed to toggle feature" };
  }

  invalidateBrandFeatureCache(brandId);
  revalidatePath("/admin/settings/apps");
  revalidatePath("/admin");

  return { success: true };
}