"use server";

import { getAdminUser } from "@/lib/admin-permissions";
import { getMockTableData } from "@/lib/mock-data";
import { withTenant } from "@/db/client";
import { products } from "@/db/schema";

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

  // The new schema stores products with `price_cents` (integer) and no `type`,
  // `is_taxable`, `pickup_type`, or `image_url` column. `image_url` is now
  // attached via the `product_images` table; `type` / `is_taxable` / `pickup_type`
  // aren't part of the SaaS schema and are dropped. `active` and `description`
  // exist as `active` and `description` columns.
  const priceCents = Math.round(Number(data.price) * 100);
  if (!Number.isFinite(priceCents) || priceCents < 0) {
    return { success: false, error: "Invalid price" };
  }

  try {
    const inserted = await withTenant(brandId, async (db) => {
      const [row] = await db
        .insert(products)
        .values({
          tenantId: brandId,
          name: data.name,
          description: data.description ?? null,
          priceCents,
          active: data.active,
        })
        .returning({ id: products.id });
      return row;
    });
    if (!inserted) return { success: false, error: "Insert returned no row" };
    return { success: true, id: inserted.id };
  } catch (err) {
    return { success: false, error: `Failed: ${err instanceof Error ? err.message : String(err)}` };
  }
}
