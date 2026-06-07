"use server";

import { getAdminUser } from "@/lib/admin-permissions";
import { getPaymentSettings } from "@/actions/payments";
import { withTenant } from "@/db/client";
import { products } from "@/db/schema";
import { inArray } from "drizzle-orm";

function getSquareBaseUrl(accessToken: string) {
  return process.env.SQUARE_ENVIRONMENT === "production"
    ? "https://connect.squareup.com"
    : "https://connect.squareupsandbox.com";
}

async function getSquareCatalogItemVariation(
  accessToken: string,
  catalogObjectId: string
) {
  const baseUrl = getSquareBaseUrl(accessToken);
  const response = await fetch(
    `${baseUrl}/v2/catalog/object/${catalogObjectId}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "Square-Version": "2025-01-16",
      },
    }
  );
  if (!response.ok) throw new Error(`Catalog object fetch failed: ${await response.text()}`);
  return response.json();
}

async function batchUpdateSquareInventory(
  accessToken: string,
  locationId: string,
  updates: Array<{
    catalogObjectId: string;
    quantity: number;
    type: "AVAILABLE" | "ON_HAND" | "SOLD_OUT";
  }>
) {
  const baseUrl = getSquareBaseUrl(accessToken);
  const response = await fetch(
    `${baseUrl}/v2/inventory/changes/batch-create`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "Square-Version": "2025-01-16",
      },
      body: JSON.stringify({
        idempotency_key: crypto.randomUUID(),
        changes: updates.map((u) => ({
          type: "ADJUSTMENT",
          physical_count: {
            catalog_object_id: u.catalogObjectId,
            location_id: locationId,
            quantity: String(u.quantity),
            measurement_unit: { quantity_unit: u.type },
          },
          occurred_at: new Date().toISOString(),
        })),
      }),
    }
  );
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Batch inventory update failed: ${err}`);
  }
  return response.json();
}

export type SyncResult = {
  success: boolean;
  synced: number;
  errors: string[];
};

/**
 * Sync inventory from Route Commerce products TO Square.
 * Reduces Square inventory for each product sold.
 * Called after an RC order is placed or updated.
 *
 * @param brandId - brand to sync for
 * @param items - array of { productId, quantity } representing sold items
 */
export async function syncInventoryToSquare(
  brandId: string,
  items: Array<{ productId: string; quantity: number }>
): Promise<SyncResult> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, synced: 0, errors: ["Not authenticated"] };

  const settingsResult = await getPaymentSettings(brandId);
  if (!settingsResult.success || !settingsResult.settings) {
    return { success: false, synced: 0, errors: ["Could not load payment settings"] };
  }
  const settings = settingsResult.settings;

  if (
    !settings.square_access_token ||
    !settings.square_location_id ||
    !settings.square_sync_enabled ||
    !["rc_to_square", "bidirectional"].includes(settings.square_inventory_mode)
  ) {
    return { success: true, synced: 0, errors: [] }; // Not enabled, no-op
  }

  const errors: string[] = [];
  const synced = 0;

  // Build product name → quantity map
  const itemQtyMap = new Map(items.map((i) => [i.productId, i.quantity]));

  try {
    // Fetch product details from RC
    const productIds = items.map((i) => i.productId);
    const rows = await withTenant(brandId, (db) =>
      db
        .select({ id: products.id, name: products.name })
        .from(products)
        .where(inArray(products.id, productIds))
    );
    if (rows.length === 0 && productIds.length > 0) {
      return { success: false, synced: 0, errors: ["Failed to fetch products from RC"] };
    }

    // Find Square catalog items matching product names and reduce quantity
    const updates: Array<{ catalogObjectId: string; quantity: number; type: "AVAILABLE" | "ON_HAND" | "SOLD_OUT" }> = [];

    for (const product of rows) {
      const qty = itemQtyMap.get(product.id) ?? 0;
      if (qty <= 0) continue;

      // In a real implementation, we'd maintain a mapping of RC product ID → Square catalog object ID
      // For now, we skip this without the mapping (requires manual catalog linking)
      // A future improvement would store square_catalog_object_id on RC products table
      errors.push(`Product "${product.name}": inventory sync requires Square catalog object ID mapping (not yet implemented)`);
    }
  } catch (err) {
    errors.push(`Inventory sync error: ${String(err)}`);
  }

  return { success: errors.length === 0, synced, errors };
}

/**
 * Sync inventory from Square TO Route Commerce (polling).
 * Fetches Square inventory counts and updates RC product inventory.
 */
export async function syncInventoryFromSquare(brandId: string): Promise<SyncResult> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, synced: 0, errors: ["Not authenticated"] };
  if (adminUser.role === "brand_admin" && adminUser.brand_id !== brandId) {
    return { success: false, synced: 0, errors: ["Not authorized"] };
  }

  const settingsResult = await getPaymentSettings(brandId);
  if (!settingsResult.success || !settingsResult.settings) {
    return { success: false, synced: 0, errors: ["Could not load payment settings"] };
  }
  const settings = settingsResult.settings;

  if (
    !settings.square_access_token ||
    !settings.square_location_id ||
    !settings.square_sync_enabled ||
    !["square_to_rc", "bidirectional"].includes(settings.square_inventory_mode)
  ) {
    return { success: true, synced: 0, errors: [] }; // Not enabled, no-op
  }

  const errors: string[] = [];
  const synced = 0;

  try {
    // Fetch Square inventory counts for the location
    const baseUrl = getSquareBaseUrl(settings.square_access_token);
    const response = await fetch(
      `${baseUrl}/v2/inventory/${settings.square_location_id}/counts`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${settings.square_access_token}`,
          "Content-Type": "application/json",
          "Square-Version": "2025-01-16",
        },
      }
    );

    if (!response.ok) {
      return { success: false, synced: 0, errors: [`Square inventory fetch failed: ${await response.text()}`] };
    }

    const data = await response.json();

    // For each inventory count, update RC product if we have a mapping
    for (const count of data.counts ?? []) {
      // count.catalog_object_id, count.quantity, count.calculated_at
      // Would need a mapping table to update correct RC product
      // This is noted as a future enhancement
      errors.push(`Inventory item ${count.catalog_object_id}: requires Square catalog object ID mapping`);
    }
  } catch (err) {
    errors.push(`Inventory sync error: ${String(err)}`);
  }

  return { success: errors.length === 0, synced, errors };
}
