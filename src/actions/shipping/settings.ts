"use server";

/**
 * Shipping settings CRUD + FedEx connection test.
 *
 * TODO(migration): shipping is dormant in the SaaS rebuild. The
 * `shipping_settings` table is still part of the legacy schema (see
 * supabase/migrations/083_shipping_settings.sql) — the FedEx integration
 * continues to read/write it via raw `pool.query` SQL rather than the
 * Supabase REST gateway or Drizzle. When shipping is reactivated, move
 * the table declaration into `db/schema/shipping.ts` and switch the
 * reads to typed Drizzle queries.
 */

import { getAdminUser } from "@/lib/admin-permissions";
import { assertBrandAccess } from "@/lib/brand-scope";
import { pool } from "@/lib/db";

// ── Types ──────────────────────────────────────────────────────────────────────

export type ShippingSettings = {
  id: string;
  brand_id: string | null;
  carrier: string;
  fedex_account_number: string | null;
  fedex_api_key: string | null;
  fedex_api_secret: string | null;
  fedex_use_production: boolean;
  default_service_type: string;
  refrigerated_handling_notes: string | null;
  fragile_handling_notes: string | null;
  updated_at: string | null;
};

export type GetShippingSettingsResult =
  | { success: true; settings: ShippingSettings | null }
  | { success: false; error: string };

export type SaveShippingSettingsResult =
  | { success: true; settings: ShippingSettings }
  | { success: false; error: string };

export type TestConnectionResult =
  | { success: true; message: string }
  | { success: false; error: string };

// ── FedEx Auth Helper (mirrors fedex-rates.ts / fedex-labels.ts) ───────────────

const FEDEX_BASE_URL = "https://apis.fedex.com";
const FEDEX_SANDBOX_URL = "https://apis-sandbox.fedex.com";

interface FedExAuthToken {
  accessToken: string;
  expiresAt: number;
}

let cachedToken: FedExAuthToken | null = null;

async function getFedExToken(
  apiKey: string,
  apiSecret: string,
  useProduction: boolean
): Promise<{ accessToken: string } | { error: string }> {
  const base = useProduction ? FEDEX_BASE_URL : FEDEX_SANDBOX_URL;

  if (cachedToken && Date.now() < cachedToken.expiresAt - 5 * 60 * 1000) {
    return { accessToken: cachedToken.accessToken };
  }

  const credentials = btoa(`${apiKey}:${apiSecret}`);
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
    return { error: `FedEx auth failed: ${text.slice(0, 200)}` };
  }

  const data = await res.json();
  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return { accessToken: data.access_token };
}

// ── Get Settings ─────────────────────────────────────────────────────────────

export async function getShippingSettings(brandId: string): Promise<GetShippingSettingsResult> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  try { assertBrandAccess(adminUser, brandId); } catch { return { success: false, error: "Brand access denied" }; }

  const { rows } = await pool.query<ShippingSettings>(
    `SELECT id::text AS id,
            brand_id::text AS brand_id,
            carrier,
            fedex_account_number,
            fedex_api_key,
            fedex_api_secret,
            COALESCE(fedex_use_production, false) AS fedex_use_production,
            COALESCE(default_service_type, 'FEDEX_GROUND') AS default_service_type,
            refrigerated_handling_notes,
            fragile_handling_notes,
            updated_at::text AS updated_at
     FROM shipping_settings
     WHERE brand_id = $1
     LIMIT 1`,
    [brandId]
  );

  return { success: true, settings: rows[0] ?? null };
}

// ── Save Settings ────────────────────────────────────────────────────────────

export async function saveShippingSettings(params: {
  brandId: string;
  fedexAccountNumber?: string;
  fedexApiKey?: string;
  fedexApiSecret?: string;
  fedexUseProduction?: boolean;
  defaultServiceType?: string;
  refrigeratedHandlingNotes?: string;
  fragileHandlingNotes?: string;
}): Promise<SaveShippingSettingsResult> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (!adminUser.can_manage_orders) return { success: false, error: "Not authorized" };
  try { assertBrandAccess(adminUser, params.brandId); } catch { return { success: false, error: "Brand access denied" }; }

  // Look up the existing row's id, if any.
  const { rows: existingRows } = await pool.query<{ id: string }>(
    "SELECT id::text AS id FROM shipping_settings WHERE brand_id = $1 LIMIT 1",
    [params.brandId]
  );
  const existingId = existingRows[0]?.id;

  if (existingId) {
    // Update the existing row
    const { rows } = await pool.query<ShippingSettings>(
      `UPDATE shipping_settings
       SET carrier = 'fedex',
           fedex_account_number = $2,
           fedex_api_key = $3,
           fedex_api_secret = $4,
           fedex_use_production = $5,
           default_service_type = $6,
           refrigerated_handling_notes = $7,
           fragile_handling_notes = $8,
           updated_at = NOW()
       WHERE id = $1
       RETURNING id::text AS id,
                 brand_id::text AS brand_id,
                 carrier,
                 fedex_account_number,
                 fedex_api_key,
                 fedex_api_secret,
                 COALESCE(fedex_use_production, false) AS fedex_use_production,
                 COALESCE(default_service_type, 'FEDEX_GROUND') AS default_service_type,
                 refrigerated_handling_notes,
                 fragile_handling_notes,
                 updated_at::text AS updated_at`,
      [
        existingId,
        params.fedexAccountNumber ?? null,
        params.fedexApiKey ?? null,
        params.fedexApiSecret ?? null,
        params.fedexUseProduction ?? false,
        params.defaultServiceType ?? "FEDEX_GROUND",
        params.refrigeratedHandlingNotes ?? null,
        params.fragileHandlingNotes ?? null,
      ]
    );

    if (!rows[0]) return { success: false, error: "Failed to save shipping settings" };
    return { success: true, settings: rows[0] };
  }

  // Insert a new row
  const { rows } = await pool.query<ShippingSettings>(
    `INSERT INTO shipping_settings (
       brand_id, carrier, fedex_account_number, fedex_api_key, fedex_api_secret,
       fedex_use_production, default_service_type,
       refrigerated_handling_notes, fragile_handling_notes, updated_at
     ) VALUES (
       $1, 'fedex', $2, $3, $4,
       $5, $6,
       $7, $8, NOW()
     )
     RETURNING id::text AS id,
               brand_id::text AS brand_id,
               carrier,
               fedex_account_number,
               fedex_api_key,
               fedex_api_secret,
               COALESCE(fedex_use_production, false) AS fedex_use_production,
               COALESCE(default_service_type, 'FEDEX_GROUND') AS default_service_type,
               refrigerated_handling_notes,
               fragile_handling_notes,
               updated_at::text AS updated_at`,
    [
      params.brandId,
      params.fedexAccountNumber ?? null,
      params.fedexApiKey ?? null,
      params.fedexApiSecret ?? null,
      params.fedexUseProduction ?? false,
      params.defaultServiceType ?? "FEDEX_GROUND",
      params.refrigeratedHandlingNotes ?? null,
      params.fragileHandlingNotes ?? null,
    ]
  );

  if (!rows[0]) return { success: false, error: "Failed to save shipping settings" };
  return { success: true, settings: rows[0] };
}

// ── Test Connection ──────────────────────────────────────────────────────────

export async function testFedExConnection(
  fedexApiKey: string,
  fedexApiSecret: string,
  fedexUseProduction: boolean
): Promise<TestConnectionResult> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (!adminUser.can_manage_orders) return { success: false, error: "Not authorized" };

  const tokenResult = await getFedExToken(fedexApiKey, fedexApiSecret, fedexUseProduction);

  if ("error" in tokenResult) {
    // Distinguish auth failure from network failure
    const msg = tokenResult.error.toLowerCase();
    if (msg.includes("401") || msg.includes("403") || msg.includes("authentication")) {
      return { success: false, error: "Invalid API key or secret. Check your FedEx Developer credentials." };
    }
    return { success: false, error: `FedEx connection failed: ${tokenResult.error.slice(0, 200)}` };
  }

  const base = fedexUseProduction ? FEDEX_BASE_URL : FEDEX_SANDBOX_URL;

  // Quick ping: request rates for a dummy shipment to verify token + account are valid
  const pingRes = await fetch(`${base}/rate/v1/rates`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokenResult.accessToken}`,
      "Content-Type": "application/json",
      "X-locale": "en_US",
    },
    body: JSON.stringify({
      accountNumber: { value: "000000000" }, // dummy — won't return real rates but validates auth
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
              city: "Stuart",
              stateOrProvinceCode: "FL",
              postalCode: "34994",
              countryCode: "US",
              residential: true,
            },
          },
        ],
        serviceType: "FEDEX_GROUND",
        shippingChargesPayment: {
          paymentType: "SENDER",
          payor: {
            responsibleParty: {
              accountNumber: { value: "000000000" },
            },
          },
        },
        rateRequestType: ["ACCOUNT"],
        requestedPackageLineItems: [
          { weight: { units: "LB", value: 1 } },
        ],
      },
    }),
  });

  // 400 means auth worked but account/destination invalid — still a success for "credentials work"
  // 401/403 means bad credentials
  if (pingRes.status === 401 || pingRes.status === 403) {
    return { success: false, error: "Authentication failed. Verify your API key and secret are correct." };
  }

  if (!pingRes.ok && pingRes.status !== 400) {
    const text = await pingRes.text();
    return { success: false, error: `FedEx API error: ${text.slice(0, 200)}` };
  }

  return {
    success: true,
    message: fedexUseProduction
      ? "Connected to FedEx Production. Credentials are valid."
      : "Connected to FedEx Sandbox. Credentials are valid.",
  };
}
