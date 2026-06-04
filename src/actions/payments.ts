"use server";

import { getAdminUser } from "@/lib/admin-permissions";
import { assertBrandAccess } from "@/lib/brand-scope";
import { svcHeaders } from "@/lib/svc-headers";

export type PaymentProvider = "stripe" | "square" | "manual";

export type PaymentSettings = {
  id: string;
  brand_id: string | null;
  provider: PaymentProvider | null;
  stripe_publishable_key: string | null;
  stripe_secret_key: string | null;
  square_access_token: string | null;
  square_location_id: string | null;
  square_sync_enabled: boolean;
  square_inventory_mode: "none" | "rc_to_square" | "square_to_rc" | "bidirectional";
  square_last_sync_at: string | null;
  square_last_sync_error: string | null;
  updated_at: string | null;
};

export type GetPaymentSettingsResult =
  | { success: true; settings: PaymentSettings | null }
  | { success: false; error: string };

export async function getPaymentSettings(brandId: string): Promise<GetPaymentSettingsResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/get_payment_settings`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({ p_brand_id: brandId }),
    }
  );

  if (!response.ok) return { success: false, error: "Failed to fetch payment settings" };
  const data = await response.json();
  return { success: true, settings: data };
}

export type SavePaymentSettingsResult =
  | { success: true }
  | { success: false; error: string };

export async function savePaymentSettings(params: {
  brandId: string;
  provider: PaymentProvider | null;
  stripePublishableKey?: string;
  stripeSecretKey?: string;
  stripeUserId?: string;
  squareAccessToken?: string;
  squareLocationId?: string;
  squareSyncEnabled?: boolean;
  squareInventoryMode?: "none" | "rc_to_square" | "square_to_rc" | "bidirectional";
}): Promise<SavePaymentSettingsResult> {
  const adminUser = await getAdminUser();
  if (!adminUser) {
    return { success: false, error: "Not authenticated" };
  }
  if (!adminUser.can_manage_orders) {
    return { success: false, error: "Not authorized" };
  }

  try {
    assertBrandAccess(adminUser, params.brandId);
  } catch {
    return { success: false, error: "Not authorized for this brand" };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/upsert_payment_settings`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({
        p_brand_id: params.brandId,
        p_provider: params.provider,
        p_stripe_publishable_key: params.stripePublishableKey ?? null,
        p_stripe_secret_key: params.stripeSecretKey ?? null,
        p_stripe_user_id: params.stripeUserId ?? null,
        p_square_access_token: params.squareAccessToken ?? null,
        p_square_location_id: params.squareLocationId ?? null,
        p_square_sync_enabled: params.squareSyncEnabled ?? null,
        p_square_inventory_mode: params.squareInventoryMode ?? null,
      }),
    }
  );

  if (!response.ok) {
    return { success: false, error: "Failed to save payment settings" };
  }
  return { success: true };
}