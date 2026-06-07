"use server";

import { and, eq } from "drizzle-orm";
import { getAdminUser } from "@/lib/admin-permissions";
import { withTenant } from "@/db/client";
import { products } from "@/db/schema";

export type ProductOption = {
  id: string;
  name: string;
  type: string;
  price: number;
};

/**
 * The legacy `get_products_for_segment_picker` RPC returned a
 * `(id, name, type, price)` denormalized view. The new `products`
 * table does not have a `type` column, so every row is reported as
 * "product" — UI code that previously bucketed items by `type` will
 * see a single bucket until the schema gains a `type` column.
 */
export async function getProductsForSegmentPicker(
  brandId: string
): Promise<ProductOption[]> {
  const adminUser = await getAdminUser();
  if (!adminUser) return [];
  if (adminUser.role === "brand_admin" && adminUser.brand_id !== brandId) return [];

  try {
    const rows = await withTenant(brandId, (db) =>
      db
        .select({
          id: products.id,
          name: products.name,
          priceCents: products.priceCents,
          active: products.active,
        })
        .from(products)
        .where(and(eq(products.tenantId, brandId), eq(products.active, true))),
    );
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      type: "product",
      price: r.priceCents / 100,
    }));
  } catch {
    return [];
  }
}
