"use server";

import { getAdminUser } from "@/lib/admin-permissions";
import { getMockTableData } from "@/lib/mock-data";
import { withTenant } from "@/db/client";
import { products } from "@/db/schema";
import { and, eq } from "drizzle-orm";

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

  // The new schema has `price_cents` (integer cents) and no `type`,
  // `is_taxable`, `pickup_type`, or `image_url` column. `type` /
  // `is_taxable` / `pickup_type` are dropped for the SaaS rebuild;
  // `image_url` lives in `product_images`.
  const priceCents = Math.round(Number(data.price) * 100);
  if (!Number.isFinite(priceCents) || priceCents < 0) {
    return { success: false, error: "Invalid price" };
  }

  try {
    await withTenant(brandId, (db) =>
      db
        .update(products)
        .set({
          name: data.name,
          description: data.description ?? null,
          priceCents,
          active: data.active,
          updatedAt: new Date(),
        })
        .where(and(eq(products.id, productId), eq(products.tenantId, brandId)))
    );
    return { success: true };
  } catch (err) {
    return { success: false, error: `Failed to update product: ${err instanceof Error ? err.message : String(err)}` };
  }
}
