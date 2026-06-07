"use server";

import { getAdminUser } from "@/lib/admin-permissions";
import { withTenant } from "@/db/client";
import { products } from "@/db/schema";

export type ImportProductsResult =
  | { success: true; created: number; updated: number; errors: { product: string; error: string }[] }
  | { success: false; error: string };

/**
 * Bulk-import products. Replaces the legacy `bulk_upsert_products` SECURITY
 * DEFINER RPC. The new `products` schema drops the legacy `type`, `is_taxable`,
 * `pickup_type`, and `image_url` columns; we keep `name`, `description`,
 * `price_cents`, and `active`. Without an id we always INSERT (no upsert
 * key for matching — the caller can run an update path separately if
 * deduplication is needed).
 */
export async function importProductsBatch(
  brandId: string,
  productsToImport: Array<{
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

  let created = 0;
  const errors: { product: string; error: string }[] = [];

  for (const p of productsToImport) {
    const priceCents = Math.round(Number(p.price) * 100);
    if (!Number.isFinite(priceCents) || priceCents < 0) {
      errors.push({ product: p.name, error: "Invalid price" });
      continue;
    }
    try {
      await withTenant(brandId, (db) =>
        db.insert(products).values({
          tenantId: brandId,
          name: p.name,
          description: p.description ?? null,
          priceCents,
          active: p.active,
        })
      );
      created++;
    } catch (err) {
      errors.push({
        product: p.name,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { success: true, created, updated: 0, errors };
}
