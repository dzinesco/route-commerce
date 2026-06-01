"use server";

import { getAdminUser } from "@/lib/admin-permissions";
import { svcHeaders } from "@/lib/svc-headers";

export type ProductOption = {
  id: string;
  name: string;
  type: string;
  price: number;
};

export async function getProductsForSegmentPicker(
  brandId: string
): Promise<ProductOption[]> {
  const adminUser = await getAdminUser();
  if (!adminUser) return [];
  if (adminUser.role === "brand_admin" && adminUser.brand_id !== brandId) return [];

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/get_products_for_segment_picker`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({ p_brand_id: brandId }),
    }
  );

  if (!response.ok) return [];
  return (await response.json()) as ProductOption[];
}