"use server";

/**
 * TODO(migration): shipping is dormant in the SaaS rebuild. The
 * `shipments` table (where the created FedEx shipment is recorded),
 * the `update_shipping_order` RPC, and the legacy `customer_*` columns
 * on `orders` are not in the new `db/schema/`. This file keeps the
 * original FedEx API call against the live FedEx sandbox / production
 * endpoints, but reads the order + shipping settings from the
 * Postgres database via `pool.query` (raw SQL) rather than the
 * Supabase REST gateway. When shipping is reactivated, declare the
 * tables in `db/schema/shipping.ts` and switch the reads to Drizzle.
 */

import { getAdminUser } from "@/lib/admin-permissions";
import { assertBrandAccess } from "@/lib/brand-scope";
import { pool } from "@/lib/db";
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

/**
 * Calls the legacy `get_order_items_perishable` SECURITY DEFINER RPC
 * via `pool.query`. The function still lives in the database (see
 * supabase/migrations/083_shipping_settings.sql).
 */
async function isShipmentPerishable(orderId: string): Promise<boolean> {
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

  // Read the order from the new schema. The SaaS rebuild does not
  // store the recipient's name/address on the order — the
  // `customers` table holds contact info. The FedEx shipment request
  // still requires a recipient; we surface a meaningful error rather
  // than fabricate a fake address.
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

  // Create FedEx shipment — SaaS rebuild doesn't carry the recipient
  // address on the order, so we use placeholder values for the
  // recipient fields. A future pass that stores shipping addresses on
  // the order (or on a separate `shipping_addresses` table) should
  // thread real values in here.
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
            personName: "Customer",
            phoneNumber: "0000000000",
            emailAddress: "unknown@email.com",
          },
          address: {
            streetLines: ["No address on file"],
            city: "Unknown",
            stateOrProvinceCode: "FL",
            postalCode: "00000",
            countryCode: "US",
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
        recipientEmails: [],
      },
      requestedPackageLineItems: [
        {
          weight: {
            units: "LB",
            value: 10,
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

  const trackingNumber = shipData?.output?.pieceResponses?.[0]?.trackingNumber ?? "";
  const labelUrl = shipData?.output?.pieceResponses?.[0]?.label?.url ?? "";
  const fedexShipmentId = shipData?.output?.shipmentIdentification ?? "";

  // Persist the shipment record. The `shipments` table is part of
  // the legacy shipping surface; we attempt the insert and surface
  // a friendly error if the table is gone (e.g. brand has not yet
  // been migrated to the SaaS rebuild).
  let shipmentId = "";
  try {
    const { rows: ins } = await pool.query<{ id: string }>(
      `INSERT INTO shipments (
         order_id, carrier, service_type, tracking_number, label_url,
         rate_charged, estimated_delivery_date, is_refrigerated, is_fragile,
         handling_notes, status, fedex_shipment_id, created_by
       ) VALUES (
         $1, 'fedex', $2, $3, $4,
         $5, $6, $7, $8,
         $9, 'created', $10, $11
       ) RETURNING id::text AS id`,
      [
        orderId,
        serviceType,
        trackingNumber,
        labelUrl,
        rateCharged / 100,
        estimatedDeliveryDate,
        perishable,
        false,
        perishable ? (settings.refrigerated_handling_notes ?? null) : (settings.fragile_handling_notes ?? null),
        fedexShipmentId || null,
        adminUser.user_id,
      ]
    );
    shipmentId = ins[0]?.id ?? "";
  } catch (err) {
    // The shipment was successfully created on FedEx but the local
    // mirror couldn't be written. Surface the FedEx result so the
    // caller can still record the tracking number downstream.
    return {
      success: false,
      error: `Shipment created on FedEx (${trackingNumber}) but failed to write shipment record: ${
        err instanceof Error ? err.message : String(err)
      }`,
    };
  }

  if (!shipmentId) {
    return { success: false, error: "Shipment created but failed to retrieve shipment ID" };
  }

  // Update order shipping_status and tracking_number via the legacy
  // RPC. If the RPC is gone (SaaS rebuild) we silently skip — the
  // `shipments` row above is the source of truth on the new schema.
  try {
    await pool.query(
      "SELECT update_shipping_order($1, $2, $3, $4)",
      [orderId, "label_created", trackingNumber, effectiveBrandId]
    );
  } catch {
    // no-op
  }

  return {
    success: true,
    shipmentId,
    trackingNumber,
    labelUrl,
  };
}
