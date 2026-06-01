"use server";

import { getAdminUser } from "@/lib/admin-permissions";
import { getMockTableData } from "@/lib/mock-data";
import { svcHeaders } from "@/lib/svc-headers";

const useMockData = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true";

export type UpdateProductResult =
  | { success: true }
  | { success: false; error: string };

export async function updateProduct(
  productId: string,
  brandId: string,
  data: {
    name: string;
    description: string;
    price: number;
    type: string;
    active: boolean;
    image_url?: string | null;
    is_taxable: boolean;
    pickup_type?: string;
  }
): Promise<UpdateProductResult> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (!adminUser.can_manage_products) return { success: false, error: "Not authorized" };

  if (adminUser.role === "brand_admin" && adminUser.brand_id !== brandId) {
    return { success: false, error: "Not authorized for this brand" };
  }

  if (useMockData) {
    return { success: true };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const res = await fetch(`${supabaseUrl}/rest/v1/products?id=eq.${productId}`, {
    method: "PATCH",
    headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json", "Prefer": "return=representation" },
    body: JSON.stringify({
      name: data.name,
      description: data.description,
      price: data.price,
      type: data.type,
      active: data.active,
      image_url: data.image_url ?? null,
      is_taxable: data.is_taxable,
      pickup_type: data.pickup_type ?? "scheduled_stop",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return { success: false, error: `Failed to update product: ${err}` };
  }

  const updated = await res.json();
  if (updated.errors) {
    return { success: false, error: updated.errors[0]?.message ?? "Unknown error" };
  }

  return { success: true };
}
