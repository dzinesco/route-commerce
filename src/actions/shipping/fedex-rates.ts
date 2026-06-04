"use server";

/**
 * FedEx Rate Quote + Shipment Creation Actions
 *
 * getFedExRates(orderId) — Fetches available FedEx rates for an order,
 *                          filtering service types based on perishable items.
 *
 * createFedExShipment(orderId, selectedRate, specialServices) — Creates a
 *                          FedEx shipment and stores the label/tracking info.
 */

import { getAdminUser } from "@/lib/admin-permissions";
import { assertBrandAccess } from "@/lib/brand-scope";
import { svcHeaders } from "@/lib/svc-headers";

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

async function isOrderPerishable(
  orderId: string,
  brandId: string | null
): Promise<boolean> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const res = await fetch(
    `${supabaseUrl}/rest/v1/rpc/get_order_items_perishable?p_order_id=${encodeURIComponent(orderId)}`,
    {
      headers: {
        ...svcHeaders(supabaseKey),
        "Content-Type": "application/json",
      },
    }
  );

  if (res.ok) {
    const data = await res.json();
    return !!data?.is_perishable;
  }

  // Fallback: query products directly
  const orderRes = await fetch(
    `${supabaseUrl}/rest/v1/order_items?order_id=eq.${encodeURIComponent(orderId)}&select=product_id`,
    {
      headers: svcHeaders(supabaseKey),
    }
  );

  if (!orderRes.ok) return false;

  const items: { product_id: string }[] = await orderRes.json();
  if (items.length === 0) return false;

  const productIds = items.map((i) => `id=eq.${i.product_id}`).join("&");
  const productRes = await fetch(
    `${supabaseUrl}/rest/v1/products?${productIds}&select=is_perishable`,
    {
      headers: svcHeaders(supabaseKey),
    }
  );

  if (!productRes.ok) return false;

  const products: { is_perishable: boolean }[] = await productRes.json();
  return products.length > 0 && products.every((p) => p.is_perishable);
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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // Fetch order + brand + address
  const orderRes = await fetch(
    `${supabaseUrl}/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}&select=*,brand:brands(id,name)`,
    {
      headers: svcHeaders(supabaseKey),
    }
  );

  if (!orderRes.ok) return { success: false, error: "Failed to fetch order" };
  const orders: Array<{
    id: string;
    brand_id: string | null;
    customer_address: string;
    customer_city: string;
    customer_state: string;
    customer_zip: string;
    customer_country: string;
    brand: { id: string; name: string } | null;
  }> = await orderRes.json();

  const order = orders[0];
  if (!order) return { success: false, error: "Order not found" };

  // The order's brand is the source of truth. Validate the admin has access.
  if (order.brand_id) {
    try { assertBrandAccess(adminUser, order.brand_id); } catch { return { success: false, error: "Brand access denied" }; }
  }
  const effectiveBrandId = order.brand_id ?? adminUser.brand_id ?? null;

  // Fetch shipping settings for this brand
  const settingsRes = await fetch(
    `${supabaseUrl}/rest/v1/shipping_settings?brand_id=eq.${encodeURIComponent(effectiveBrandId ?? "NULL")}&limit=1`,
    {
      headers: svcHeaders(supabaseKey),
    }
  );

  const settingsData: Array<{
    fedex_account_number: string | null;
    fedex_api_key: string | null;
    fedex_api_secret: string | null;
    fedex_use_production: boolean;
  }> = await settingsRes.json();

  const settings = settingsData[0];
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

  // Build FedEx rate request
  // NOTE: customer_address is a TEXT field — it may be a single-line address.
  // For full FedEx compliance, address parsing would need separate address_line_1/2 fields.
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
            city: order.customer_city || "Unknown",
            stateOrProvinceCode: order.customer_state || "FL",
            postalCode: order.customer_zip || "00000",
            countryCode: order.customer_country || "US",
            residential: true,
          },
        },
      ],
      serviceType: null, // Request all allowed services by omitting — FedEx returns all matching
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
          weight: { units: "LB", value: 10 }, // Weight is hardcoded to 10LB for MVP — actual weight should be calculated from package dimensions and product weights at order time
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