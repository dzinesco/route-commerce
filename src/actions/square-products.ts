"use server";

import { getAdminUser } from "@/lib/admin-permissions";
import { getPaymentSettings } from "@/actions/payments";
import { SquareClient, SquareEnvironment, type BaseClientOptions } from "square";
import { svcHeaders } from "@/lib/svc-headers";

export type SquareCatalogItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  type: string;
  imageUrl?: string;
};

function getSquareClient(accessToken: string) {
  const env = process.env.SQUARE_ENVIRONMENT === "production"
    ? SquareEnvironment.Production
    : SquareEnvironment.Sandbox;

  const config: BaseClientOptions = {
    token: accessToken,
    environment: env,
  };
  return new SquareClient(config);
}

function getSquareBaseUrl(accessToken: string) {
  const env = process.env.SQUARE_ENVIRONMENT === "production"
    ? "https://connect.squareup.com"
    : "https://connect.squareupsandbox.com";
  return env;
}

async function fetchSquareCatalog(accessToken: string, cursor?: string) {
  const baseUrl = getSquareBaseUrl(accessToken);
  const response = await fetch(
    `${baseUrl}/v2/catalog/list`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "Square-Version": "2025-01-16",
      },
      body: JSON.stringify({
        types: ["ITEM"],
        ...(cursor ? { cursor } : {}),
      }),
    }
  );
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Square catalog list failed: ${err}`);
  }
  return response.json();
}

async function upsertSquareCatalogItem(
  accessToken: string,
  item: {
    name: string;
    description: string;
    price: number;
    imageUrl?: string;
  },
  existingItemId?: string
) {
  const baseUrl = getSquareBaseUrl(accessToken);
  const body: Record<string, unknown> = {
    idempotency_key: crypto.randomUUID(),
    item: {
      name: item.name,
      description: item.description,
      variations: [
        {
          name: "Default",
          pricing_type: "FIXED_PRICING",
          price_money: {
            amount: BigInt(Math.round(item.price * 100)),
            currency: "USD",
          },
        },
      ],
    },
  };

  if (existingItemId) {
    body.item = { ...body.item as object, id: existingItemId };
  }

  const response = await fetch(`${baseUrl}/v2/catalog/object`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Square-Version": "2025-01-16",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Square upsert failed: ${err}`);
  }
  return response.json();
}

export type SyncResult = {
  success: boolean;
  synced: number;
  errors: string[];
};

export async function syncProductsToSquare(brandId: string): Promise<SyncResult> {
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

  if (!settings.square_access_token) {
    return { success: false, synced: 0, errors: ["Square not connected"] };
  }

  const client = getSquareClient(settings.square_access_token);
  const errors: string[] = [];
  let synced = 0;

  try {
    // Fetch wholesale products via RPC (avoids rc_product_id bug in direct query)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const rpcRes = await fetch(
      `${supabaseUrl}/rest/v1/rpc/get_wholesale_products`,
      {
        method: "POST",
            headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
            body: JSON.stringify({ p_brand_id: brandId }),
      }
    );

    if (!rpcRes.ok) {
      const errText = await rpcRes.text();
      return { success: false, synced: 0, errors: [`Failed to fetch wholesale products: ${errText}`] };
    }

    const products: Array<{
      id: string;
      name: string;
      description: string | null;
      availability: string;
      unit_type: string;
      price_tiers: Array<{ price: number; min_qty: number; max_qty: number | null }>;
      hp_sku: string | null;
      hp_item_id: string | null;
      default_pickup_location: string | null;
    }> = await rpcRes.json();

    // Filter to available products only
    const availableProducts = products.filter((p) => p.availability === "available");
    if (availableProducts.length === 0) {
      return { success: true, synced: 0, errors: ["No available products to sync"] };
    }

    // Build map of existing Square catalog items by hp_item_id (primary) and name (fallback)
    const existingByItemId = new Map<string, string>();
    const existingByName = new Map<string, string>();
    let cursor: string | undefined;
    do {
      const catalogData = await fetchSquareCatalog(settings.square_access_token, cursor);
      for (const obj of catalogData.objects ?? []) {
        if (obj.type === "ITEM" && obj.item?.name) {
          existingByName.set(obj.item.name, obj.id);
          // Store item by its catalog object ID (used for upserts)
          if (obj.id) existingByItemId.set(obj.id, obj.id);
        }
      }
      cursor = catalogData.cursor;
    } while (cursor);

    // Upsert each available wholesale product into Square
    for (const product of availableProducts) {
      try {
        // Primary: match by hp_item_id (Square catalog object ID we stored previously)
        // Secondary: match by exact name if hp_item_id not set
        let existingId = product.hp_item_id
          ? existingByItemId.get(product.hp_item_id) ?? undefined
          : undefined;

        if (!existingId && !product.hp_item_id) {
          // Fall back to name-based match (deduped by name)
          existingId = existingByName.get(product.name);
        }

        // Derive price from first price tier, default to 0
        const price = product.price_tiers?.[0]?.price ?? 0;

        // Build description with unit/pack info
        const unitInfo = product.unit_type ? ` [Unit: ${product.unit_type}]` : "";
        const pickupInfo = product.default_pickup_location
          ? ` | Pickup: ${product.default_pickup_location}`
          : "";
        const description = `${product.description ?? ""}${unitInfo}${pickupInfo}`.trim();

        await upsertSquareCatalogItem(settings.square_access_token, {
          name: product.name,
          description,
          price,
        }, existingId);
        synced++;
      } catch (err) {
        errors.push(`"${product.name}": ${String(err)}`);
      }
    }
  } catch (err) {
    errors.push(`Sync error: ${String(err)}`);
  }

  return { success: errors.length === 0, synced, errors };
}

export async function syncProductsFromSquare(brandId: string): Promise<SyncResult> {
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

  if (!settings.square_access_token) {
    return { success: false, synced: 0, errors: ["Square not connected"] };
  }

  const errors: string[] = [];
  let synced = 0;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  let cursor: string | undefined;
  do {
    try {
      const catalogData = await fetchSquareCatalog(settings.square_access_token, cursor);

      for (const obj of catalogData.objects ?? []) {
        if (obj.type !== "ITEM" || !obj.item?.name) continue;
        const item = obj.item;
        const variations = item.variations ?? [];
        const priceMoney = variations[0]?.price_money;
        const price = priceMoney ? Number(priceMoney.amount) / 100 : 0;
        const imageUrl = obj.item.image_url ?? null;

        // Sync to RC via bulk_upsert_products RPC
        const upsertRes = await fetch(
          `${supabaseUrl}/rest/v1/rpc/bulk_upsert_products`,
          {
            method: "POST",
            headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
            body: JSON.stringify({
              p_brand_id: brandId,
              p_products: [
                {
                  name: item.name,
                  description: item.description ?? "",
                  price,
                  type: "Pickup & Shipping",
                  active: true,
                  image_url: imageUrl,
                },
              ],
            }),
          }
        );

        if (upsertRes.ok) {
          synced++;
        } else {
          const errText = await upsertRes.text();
          errors.push(`Square item "${item.name}": ${errText.slice(0, 100)}`);
        }
      }

      cursor = catalogData.cursor;
    } catch (err) {
      errors.push(`Catalog batch error: ${String(err)}`);
      break;
    }
  } while (cursor);

  return { success: errors.length === 0, synced, errors };
}
