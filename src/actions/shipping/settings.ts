"use server";

import { getAdminUser } from "@/lib/admin-permissions";
import { svcHeaders } from "@/lib/svc-headers";

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

// ── FedEx Auth Helper (mirrors fedex-rates.ts) ─────────────────────────────────

const FEDEX_BASE_URL = "https://apis.fedex.com";
const FEDEX_SANDBOX_URL = "https://apis-sandbox.fedex.com";

interface FedExAuthToken {
  accessToken: string;
  expiresAt: number;
}

let cachedToken: FedExAuthToken | null = null;

async function getFedExToken(apiKey: string, apiSecret: string, useProduction: boolean): Promise<{ accessToken: string } | { error: string }> {
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
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/shipping_settings?brand_id=eq.${encodeURIComponent(brandId)}&limit=1`,
    {
      headers: {
        ...svcHeaders(supabaseKey),
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) return { success: false, error: "Failed to fetch shipping settings" };
  const data = await response.json();
  return { success: true, settings: data[0] ?? null };
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

  if (adminUser.role === "brand_admin" && adminUser.brand_id !== params.brandId) {
    return { success: false, error: "Not authorized for this brand" };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // Get existing settings to get ID for update
  const existing = await fetch(
    `${supabaseUrl}/rest/v1/shipping_settings?brand_id=eq.${encodeURIComponent(params.brandId)}&select=id`,
    {
      headers: svcHeaders(supabaseKey),
    }
  );

  const existingData: Array<{ id: string }> = await existing.json();
  const existingId = existingData[0]?.id;

  const payload = {
    ...(existingId ? { id: existingId } : {}),
    brand_id: params.brandId,
    carrier: "fedex",
    fedex_account_number: params.fedexAccountNumber ?? null,
    fedex_api_key: params.fedexApiKey ?? null,
    fedex_api_secret: params.fedexApiSecret ?? null,
    fedex_use_production: params.fedexUseProduction ?? false,
    default_service_type: params.defaultServiceType ?? "FEDEX_GROUND",
    refrigerated_handling_notes: params.refrigeratedHandlingNotes ?? null,
    fragile_handling_notes: params.fragileHandlingNotes ?? null,
    updated_at: new Date().toISOString(),
  };

  const response = await fetch(
    `${supabaseUrl}/rest/v1/shipping_settings`,
    {
      method: existingId ? "PATCH" : "POST",
      headers: {
        ...svcHeaders(supabaseKey),
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    return { success: false, error: `Failed to save: ${err.slice(0, 200)}` };
  }

  const data = await response.json();
  return { success: true, settings: data[0] };
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