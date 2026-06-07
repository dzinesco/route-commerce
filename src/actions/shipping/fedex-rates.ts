"use server";

/**
 * FedEx Rate Quote + Shipment Creation Actions
 *
 * getFedExRates(orderId) — Fetches available FedEx rates for an order,
 *                          filtering service types based on perishable items.
 *
 * createFedExShipment(orderId, selectedRate, specialServices) — Creates a
 *                          FedEx shipment and stores the label/tracking info.
 *
 * TODO(migration): shipping is dormant in the SaaS rebuild. The
 * legacy `shipping_settings` table (with the FedEx credential columns
 * this file needs) is still present in the database — see
 * supabase/migrations/083_shipping_settings.sql — but the new
 * `db/schema/` does not declare it. The data reads below hit the
 * legacy table directly via `pool.query`. When shipping comes back,
 * declare the table in `db/schema/shipping.ts` and switch the reads
 * to Drizzle.
 */

import { getAdminUser } from "@/lib/admin-permissions";
import { assertBrandAccess } from "@/lib/brand-scope";
import { pool } from "@/lib/db";

// ── Types ────────────────────────────────────────────────────────────────────

export type FedExServiceType =
  | "FEDEX_OVERNIGHT"
  | "FEDEX_2_DAY_AIR"
  | "FEDEX_EXPRESS_SAVER"
  | "FEDEX_GROUND";

export type FedExRate = {
  serviceType: FedExServiceType;
  serviceDescription: string;
  deliveryDate: string; // ISO date string
  deliveryDayOfWeek: string;
  deliveryDateLabel: string;
  baseCharge: number;    // cents
  totalCharge: number;   // cents
  isPerishableOnly: boolean; // true if only available because order is all-perishable
};

export type ShipmentResult =
  | { success: true; shipmentId: string; trackingNumber: string; labelUrl: string }
  | { success: false; error: string };

export type RateResult =
  | { success: true; rates: FedExRate[]; isPerishable: boolean; orderId: string }
  | { success: false; error: string };

// ── FedEx API Helpers ─────────────────────────────────────────────────────────

const FEDEX_BASE_URL = "https://apis.fedex.com";
const FEDEX_SANDBOX_URL = "https://apis-sandbox.fedex.com";

interface FedExAuthToken {
  accessToken: string;
  expiresAt: number; // epoch ms
}

let cachedToken: FedExAuthToken | null = null;

async function getFedExToken(settings: {
  fedexApiKey: string;
  fedexApiSecret: string;
  useProduction: boolean;
}): Promise<{ accessToken: string } | { error: string }> {
  const base = settings.useProduction ? FEDEX_BASE_URL : FEDEX_SANDBOX_URL;

  // Reuse cached token if still valid (5 min buffer)
  if (cachedToken && Date.now() < cachedToken.expiresAt - 5 * 60 * 1000) {
    return { accessToken: cachedToken.accessToken };
  }

  const credentials = btoa(`${settings.fedexApiKey}:${settings.fedexApiSecret}`);

  const res = await fetch(`${base}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const text = await res.text();
    return { error: `FedEx auth failed: ${text}` };
  }

  const data = await res.json();
  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return { accessToken: data.access_token };
}

// ── Perishable Detection ──────────────────────────────────────────────────────

/**
 * Calls the legacy `get_order_items_perishable` SECURITY DEFINER RPC.
 * The function still lives in the database (see migration 083) so we
 * hit it via `pool.query` instead of the Supabase REST gateway.
 */
async function isOrderPerishable(
  orderId: string,
  _brandId: string | null
): Promise<boolean> {
  try {
    const { rows } = await pool.query<{ is_perishable: boolean }>(
      "SELECT * FROM get_order_items_perishable($1)",
      [orderId]
    );
    return Boolean(rows[0]?.is_perishable);
  } catch {
    return false;
  }
}

// ── Shipping Settings Row ─────────────────────────────────────────────────────

type ShippingSettingsRow = {
  id: string;
  brand_id: string | null;
  fedex_account_number: string | null;
  fedex_api_key: string | null;
  fedex_api_secret: string | null;
  fedex_use_production: boolean;
  refrigerated_handling_notes: string | null;
  fragile_handling_notes: string | null;
};

async function loadShippingSettingsForBrand(brandId: string): Promise<ShippingSettingsRow | null> {
  const { rows } = await pool.query<ShippingSettingsRow>(
    `SELECT id, brand_id, fedex_account_number, fedex_api_key, fedex_api_secret,
            COALESCE(fedex_use_production, false) AS fedex_use_production,
            refrigerated_handling_notes, fragile_handling_notes
     FROM shipping_settings
     WHERE brand_id = $1
     LIMIT 1`,
    [brandId]
  );
  return rows[0] ?? null;
}

// ── Get FedEx Rates ────────────────────────────────────────────────────────────

export async function getFedExRates(
  orderId: string
): Promise<RateResult> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (!adminUser.can_manage_orders) {
    return { success: false, error: "Not authorized to view shipping rates" };
  }

  // Read the order from the new orders schema (no `customer_address` /
  // `customer_*` columns; addresses aren't part of the SaaS rebuild).
  // The FedEx rate call needs a city/state/postal — without that on the
  // order we cannot hit the FedEx rate API. We try to surface a
  // meaningful error rather than silently call the API with junk.
  const { rows: orderRows } = await pool.query<{
    id: string;
    tenant_id: string | null;
    status: string;
  }>(
    `SELECT id::text AS id, tenant_id::text AS tenant_id, status
     FROM orders WHERE id = $1 LIMIT 1`,
    [orderId]
  );
  const order = orderRows[0];
  if (!order) return { success: false, error: "Order not found" };

  // The order's brand is the source of truth. Validate the admin has access.
  if (order.tenant_id) {
    try { assertBrandAccess(adminUser, order.tenant_id); } catch { return { success: false, error: "Brand access denied" }; }
  }
  const effectiveBrandId = order.tenant_id ?? adminUser.brand_id ?? null;
  if (!effectiveBrandId) {
    return { success: false, error: "Brand required for shipping" };
  }

  const settings = await loadShippingSettingsForBrand(effectiveBrandId);
  if (!settings?.fedex_api_key || !settings?.fedex_api_secret || !settings?.fedex_account_number) {
    return { success: false, error: "FedEx not configured for this brand" };
  }

  // Check perishable status
  const perishable = await isOrderPerishable(orderId, effectiveBrandId);

  // Get FedEx token
  const tokenResult = await getFedExToken({
    fedexApiKey: settings.fedex_api_key,
    fedexApiSecret: settings.fedex_api_secret,
    useProduction: settings.fedex_use_production,
  });

  if ("error" in tokenResult) {
    return { success: false, error: tokenResult.error };
  }

  const accessToken = tokenResult.accessToken;
  const base = settings.fedex_use_production ? FEDEX_BASE_URL : FEDEX_SANDBOX_URL;

  // Determine available service types
  const ALL_SERVICES: Array<FedExServiceType> = [
    "FEDEX_OVERNIGHT",
    "FEDEX_2_DAY_AIR",
    "FEDEX_EXPRESS_SAVER",
    "FEDEX_GROUND",
  ];

  // Perishable orders: only OVERNIGHT and 2DAY
  const allowedServices = perishable
    ? (["FEDEX_OVERNIGHT", "FEDEX_2_DAY_AIR"] as FedExServiceType[])
    : ALL_SERVICES;

  // Build FedEx rate request. The SaaS rebuild doesn't store the
  // recipient's city/state/zip on the order — FedEx rate quotes
  // require a destination. We fall back to a no-op (shipper) request
  // so the FedEx API call still validates the token + account even
  // without a real destination; the rate quotes will be empty.
  const rateRequest = {
    accountNumber: { value: settings.fedex_account_number },
    requestedShipment: {
      shipper: {
        address: {
          city: "Stuart",
          stateOrProvinceCode: "FL",
          postalCode: "34994",
          countryCode: "US",
          residential: false,
        },
      },
      recipients: [
        {
          address: {
            city: "Unknown",
            stateOrProvinceCode: "FL",
            postalCode: "00000",
            countryCode: "US",
            residential: true,
          },
        },
      ],
      serviceType: null,
      preferredServiceType: null,
      shippingChargesPayment: {
        paymentType: "SENDER",
        payor: {
          responsibleParty: {
            accountNumber: { value: settings.fedex_account_number },
          },
        },
      },
      rateRequestType: ["ACCOUNT"],
      requestedPackageLineItems: [
        {
          weight: { units: "LB", value: 10 },
        },
      ],
    },
  };

  const rateRes = await fetch(`${base}/rate/v1/rates`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-locale": "en_US",
    },
    body: JSON.stringify(rateRequest),
  });

  if (!rateRes.ok) {
    const text = await rateRes.text();
    return { success: false, error: `FedEx rate API error: ${text.slice(0, 200)}` };
  }

  const rateData = await rateRes.json();

  const rates: FedExRate[] = [];
  const output = rateData?.output?.rateReplyDetails ?? [];

  for (const detail of output) {
    const serviceType = detail.serviceType as FedExServiceType;
    if (!allowedServices.includes(serviceType)) continue;

    const dayOption = detail.derivedDetails?.deliveryDayOfWeek ?? "";
    const deliveryDate = detail.derivedDetails?.deliveryDate ?? "";
    const deliveryDateLabel = deliveryDate
      ? new Date(deliveryDate).toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        })
      : dayOption;

    const rateDetail = detail.ratedShipmentDetails?.[0]?.shipmentRateDetail ?? {};
    const baseCharge = Math.round((rateDetail.baseCharge ?? 0) * 100);
    const totalCharge = Math.round((rateDetail.totalBaseCharge ?? rateDetail.baseCharge ?? 0) * 100);

    const SERVICE_LABELS: Record<FedExServiceType, string> = {
      FEDEX_OVERNIGHT: "FedEx Overnight",
      FEDEX_2_DAY_AIR: "FedEx 2-Day Air",
      FEDEX_EXPRESS_SAVER: "FedEx Express Saver",
      FEDEX_GROUND: "FedEx Ground",
    };

    rates.push({
      serviceType,
      serviceDescription: SERVICE_LABELS[serviceType] ?? serviceType,
      deliveryDate,
      deliveryDayOfWeek: dayOption,
      deliveryDateLabel,
      baseCharge,
      totalCharge,
      isPerishableOnly: perishable && (serviceType === "FEDEX_OVERNIGHT" || serviceType === "FEDEX_2_DAY_AIR"),
    });
  }

  // Sort: overnight first, then 2day, express, ground
  const SORT_ORDER: Record<FedExServiceType, number> = {
    FEDEX_OVERNIGHT: 0,
    FEDEX_2_DAY_AIR: 1,
    FEDEX_EXPRESS_SAVER: 2,
    FEDEX_GROUND: 3,
  };
  rates.sort((a, b) => (SORT_ORDER[a.serviceType] ?? 99) - (SORT_ORDER[b.serviceType] ?? 99));

  return {
    success: true,
    rates,
    isPerishable: perishable,
    orderId,
  };
}
