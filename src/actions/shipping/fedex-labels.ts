"use server";

import { getAdminUser } from "@/lib/admin-permissions";
import { svcHeaders } from "@/lib/svc-headers";
import type { FedExServiceType } from "./fedex-rates";

export type CreateShipmentResult =
  | { success: true; shipmentId: string; trackingNumber: string; labelUrl: string }
  | { success: false; error: string };

const FEDEX_BASE_URL = "https://apis.fedex.com";
const FEDEX_SANDBOX_URL = "https://apis-sandbox.fedex.com";

interface FedExAuthToken {
  accessToken: string;
  expiresAt: number;
}

let cachedToken: FedExAuthToken | null = null;

async function getFedExToken(settings: {
  fedexApiKey: string;
  fedexApiSecret: string;
  useProduction: boolean;
}): Promise<{ accessToken: string } | { error: string }> {
  const base = settings.useProduction ? FEDEX_BASE_URL : FEDEX_SANDBOX_URL;

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

async function getFedExTokenForCreate(
  brandId: string | null,
  adminUserId: string | null
): Promise<{ accessToken: string } | { error: string }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // Try to get from shipping_settings
  const settingsRes = await fetch(
    `${supabaseUrl}/rest/v1/shipping_settings?brand_id=eq.${encodeURIComponent(brandId ?? "NULL")}&limit=1`,
    {
      headers: svcHeaders(supabaseKey),
    }
  );

  const settingsData: Array<{
    fedex_api_key: string | null;
    fedex_api_secret: string | null;
    fedex_use_production: boolean;
  }> = await settingsRes.json();

  const settings = settingsData[0];
  if (!settings?.fedex_api_key || !settings?.fedex_api_secret) {
    return { error: "FedEx not configured for this brand" };
  }

  return getFedExToken({
    fedexApiKey: settings.fedex_api_key,
    fedexApiSecret: settings.fedex_api_secret,
    useProduction: settings.fedex_use_production,
  });
}

async function isShipmentPerishable(orderId: string): Promise<boolean> {
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
  return false;
}

/**
 * createFedExShipment — Creates a FedEx shipment for an order.
 *
 * @param orderId        — The order to ship
 * @param serviceType    — The FedEx service type selected (FEDEX_OVERNIGHT, etc.)
 * @param rateCharged    — The rate quoted and charged (cents)
 * @param estimatedDeliveryDate — ISO date string from rate quote
 */
export async function createFedExShipment(
  orderId: string,
  serviceType: FedExServiceType,
  rateCharged: number, // cents
  estimatedDeliveryDate: string
): Promise<CreateShipmentResult> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (!adminUser.can_manage_orders) {
    return { success: false, error: "Not authorized to create shipments" };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // Fetch order
  const orderRes = await fetch(
    `${supabaseUrl}/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}&select=*`,
    {
      headers: svcHeaders(supabaseKey),
    }
  );

  if (!orderRes.ok) return { success: false, error: "Failed to fetch order" };
  const orders: Array<{
    id: string;
    brand_id: string | null;
    customer_name: string;
    customer_address: string;
    customer_city: string;
    customer_state: string;
    customer_zip: string;
    customer_country: string;
    customer_phone: string | null;
    customer_email: string | null;
  }> = await orderRes.json();

  const order = orders[0];
  if (!order) return { success: false, error: "Order not found" };

  const effectiveBrandId = order.brand_id ?? adminUser.brand_id ?? null;

  // Get FedEx settings
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
    refrigerated_handling_notes: string | null;
    fragile_handling_notes: string | null;
  }> = await settingsRes.json();

  const settings = settingsData[0];
  if (!settings?.fedex_api_key || !settings?.fedex_api_secret || !settings?.fedex_account_number) {
    return { success: false, error: "FedEx not configured for this brand" };
  }

  // Check perishable status
  const perishable = await isShipmentPerishable(orderId);

  // Validate perishable-only services
  if (perishable && serviceType !== "FEDEX_OVERNIGHT" && serviceType !== "FEDEX_2_DAY_AIR") {
    return {
      success: false,
      error: `Perishable orders can only ship via Overnight or 2-Day Air. Selected: ${serviceType}`,
    };
  }

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

  // Build special services
  const specialServicesRequested: string[] = [];
  if (perishable) {
    specialServicesRequested.push("REFRIGERATED");
  }

  // Create FedEx shipment
  // NOTE: customer_address is TEXT field — may contain full address on one line.
  // For full FedEx compliance this would ideally be parsed into address_line_1/2.
  // Using it as city/state/zip for now, with customer_name as contact.
  const createShipmentRequest = {
    labelResponseOptions: "URL_ONLY",
    requestedShipment: {
      shipDateStamp: new Date().toISOString().split("T")[0],
      serviceType,
      packagingType: "YOUR_PACKAGING",
      shipper: {
        contact: {
          companyName: "Route Commerce",
          phoneNumber: "7725897500",
          emailAddress: "orders@routecommerce.com",
        },
        address: {
          streetLines: ["PO Box 1234"],
          city: "Stuart",
          stateOrProvinceCode: "FL",
          postalCode: "34994",
          countryCode: "US",
          residential: false,
        },
      },
      recipients: [
        {
          contact: {
            personName: order.customer_name,
            phoneNumber: order.customer_phone ?? "0000000000",
            emailAddress: order.customer_email ?? "unknown@email.com",
          },
          address: {
            streetLines: [order.customer_address || "No address provided"],
            city: order.customer_city || "Unknown",
            stateOrProvinceCode: order.customer_state || "FL",
            postalCode: order.customer_zip || "00000",
            countryCode: order.customer_country || "US",
            residential: true,
          },
        },
      ],
      shippingChargesPayment: {
        paymentType: "SENDER",
        payor: {
          responsibleParty: {
            accountNumber: { value: settings.fedex_account_number },
          },
        },
      },
      specialServicesRequested: {
        specialServiceTypes: specialServicesRequested.length > 0 ? specialServicesRequested : undefined,
        ...(perishable && {
          refrigeratedShipment: {
            heavyWeightNotification: false,
          },
        }),
      },
      emailNotificationDetail: {
        emailNotificationRecipientType: "RECIPIENT",
        notificationEvents: ["DELIVERED"],
        notificationFormat: "HTML",
        notificationLanguage: "en",
        recipientEmails: order.customer_email ? [order.customer_email] : [],
      },
      requestedPackageLineItems: [
        {
          weight: {
            units: "LB",
            value: 10, // Weight is hardcoded to 10LB for MVP — actual weight should be calculated from package dimensions and product weights at order time
          },
          dimensions: {
            length: 12,
            width: 8,
            height: 6,
            units: "IN",
          },
        },
      ],
    },
    accountNumber: { value: settings.fedex_account_number },
  };

  const shipRes = await fetch(`${base}/ship/v1/shipments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-locale": "en_US",
    },
    body: JSON.stringify(createShipmentRequest),
  });

  if (!shipRes.ok) {
    const text = await shipRes.text();
    return { success: false, error: `FedEx shipment creation failed: ${text.slice(0, 300)}` };
  }

  const shipData = await shipRes.json();

  const jobId = shipData?.output?.jobId;
  const trackingNumber = shipData?.output?.pieceResponses?.[0]?.trackingNumber ?? "";
  const labelUrl = shipData?.output?.pieceResponses?.[0]?.label?.url ?? "";
  const fedexShipmentId = shipData?.output?.shipmentIdentification ?? "";

  // Store shipment record
  const insertRes = await fetch(`${supabaseUrl}/rest/v1/shipments`, {
    method: "POST",
    headers: {
      ...svcHeaders(supabaseKey),
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      order_id: orderId,
      carrier: "fedex",
      service_type: serviceType,
      tracking_number: trackingNumber,
      label_url: labelUrl,
      rate_charged: rateCharged / 100,
      estimated_delivery_date: estimatedDeliveryDate,
      is_refrigerated: perishable,
      is_fragile: false,
      handling_notes: perishable ? (settings.refrigerated_handling_notes ?? null) : (settings.fragile_handling_notes ?? null),
      status: "created",
      fedex_shipment_id: fedexShipmentId || null,
      created_by: adminUser.user_id,
    }),
  });

  if (!insertRes.ok) {
    const errText = await insertRes.text();
    return { success: false, error: `Shipment created but failed to store record: ${errText.slice(0, 200)}` };
  }

  const shipmentRecords: Array<{ id: string }> = await insertRes.json();
  const shipmentId = shipmentRecords[0]?.id;

  if (!shipmentId) {
    return { success: false, error: "Shipment created but failed to retrieve shipment ID" };
  }

  // Update order shipping_status and tracking_number
  await fetch(
    `${supabaseUrl}/rest/v1/rpc/update_shipping_order`,
    {
      method: "POST",
      headers: {
        ...svcHeaders(supabaseKey),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        p_order_id: orderId,
        p_shipping_status: "label_created",
        p_tracking_number: trackingNumber,
        p_brand_id: effectiveBrandId,
      }),
    }
  );

  return {
    success: true,
    shipmentId,
    trackingNumber,
    labelUrl,
  };
}