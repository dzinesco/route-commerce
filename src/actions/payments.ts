"use server";

import { getAdminUser } from "@/lib/admin-permissions";
import { assertBrandAccess } from "@/lib/brand-scope";
import { pool } from "@/lib/db";

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
  try {
    const { rows } = await pool.query<PaymentSettings>(
      "SELECT * FROM get_payment_settings($1)",
      [brandId],
    );
    return { success: true, settings: rows[0] ?? null };
  } catch {
    return { success: false, error: "Failed to fetch payment settings" };
  }
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

  try {
    await pool.query(
      `SELECT upsert_payment_settings(
         $1, $2, $3, $4, $5, $6, $7, $8, $9
       )`,
      [
        params.brandId,
        params.provider,
        params.stripePublishableKey ?? null,
        params.stripeSecretKey ?? null,
        params.stripeUserId ?? null,
        params.squareAccessToken ?? null,
        params.squareLocationId ?? null,
        params.squareSyncEnabled ?? null,
        params.squareInventoryMode ?? null,
      ],
    );
    return { success: true };
  } catch {
    return { success: false, error: "Failed to save payment settings" };
  }
}
