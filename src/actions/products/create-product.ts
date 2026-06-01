"use server";

import { getAdminUser } from "@/lib/admin-permissions";
import { getMockTableData } from "@/lib/mock-data";
import { svcHeaders } from "@/lib/svc-headers";

const useMockData = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true";

export type CreateProductResult =
  | { success: true; id: string }
  | { success: false; error: string };

export async function createProduct(
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
): Promise<CreateProductResult> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (!adminUser.can_manage_products) return { success: false, error: "Not authorized" };

  if (adminUser.role === "brand_admin" && adminUser.brand_id !== brandId) {
    return { success: false, error: "Not authorized for this brand" };
  }

  if (useMockData) {
    const mockProducts = getMockTableData("products") as any[];
    const newId = `mock-prod-${Date.now()}`;
    const newProduct = {
      id: newId,
      name: data.name,
      description: data.description,
      price: data.price,
      type: data.type,
      is_active: data.active,
      image_url: data.image_url ?? null,
      is_taxable: data.is_taxable,
      pickup_type: data.pickup_type ?? "scheduled_stop",
      brand_id: brandId,
    };
    mockProducts.push(newProduct);
    return { success: true, id: newId };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/bulk_upsert_products`, {
    method: "POST",
    headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
    signal: AbortSignal.timeout(10000),
    body: JSON.stringify({
      p_brand_id: brandId,
      p_products: [{
        name: data.name,
        description: data.description,
        price: data.price,
        type: data.type,
        active: data.active,
        image_url: data.image_url ?? null,
        is_taxable: data.is_taxable,
        pickup_type: data.pickup_type ?? "scheduled_stop",
      }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return { success: false, error: `Failed: ${err}` };
  }

  const result = await res.json();
  if (result.errors && result.errors.length > 0) {
    return { success: false, error: result.errors[0].error };
  }

  return { success: true, id: result.created > 0 ? "created" : "updated" };
}
