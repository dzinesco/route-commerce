"use server";

import { getAdminUser } from "@/lib/admin-permissions";
import { svcHeaders } from "@/lib/svc-headers";

export type ImportProductsResult =
  | { success: true; created: number; updated: number; errors: { product: string; error: string }[] }
  | { success: false; error: string };

export async function importProductsBatch(
  brandId: string,
  products: Array<{
    name: string;
    description: string;
    price: number;
    type: string;
    active: boolean;
    image_url?: string;
  }>
): Promise<ImportProductsResult> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (!adminUser.can_manage_products) return { success: false, error: "Not authorized" };

  if (adminUser.role === "brand_admin" && adminUser.brand_id !== brandId) {
    return { success: false, error: "Not authorized for this brand" };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/bulk_upsert_products`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({ p_brand_id: brandId, p_products: products }),
    }
  );

  if (!response.ok) return { success: false, error: "Import failed" };
  const data = await response.json();
  return { success: true, created: data.created, updated: data.updated, errors: data.errors ?? [] };
}