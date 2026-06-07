"use server";

import { getAdminUser } from "@/lib/admin-permissions";
import { pool } from "@/lib/db";
import Stripe from "stripe";

/**
 * Get Stripe Connect status for a brand.
 * Checks if brand has a stripe_user_id (connected account).
 */
export async function getStripeConnectStatus(brandId: string): Promise<{
  is_connected: boolean;
  account_id?: string;
  charges_enabled?: boolean;
  payouts_enabled?: boolean;
  details_submitted?: boolean;
  error?: string;
}> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { is_connected: false, error: "Not authenticated" };

  // Get brand's payment settings via SECURITY DEFINER RPC
  const { rows } = await pool.query<{ stripe_user_id: string | null }>(
    "SELECT * FROM get_brand_payment_settings($1)",
    [brandId]
  );

  const stripeUserId = rows[0]?.stripe_user_id ?? null;

  if (!stripeUserId) {
    return { is_connected: false };
  }

  // Verify the account exists and get status
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return { is_connected: true, account_id: stripeUserId };
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2026-04-22.dahlia" as any });
    const account = await stripe.accounts.retrieve(stripeUserId);

    return {
      is_connected: true,
      account_id: stripeUserId,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      details_submitted: account.details_submitted,
    };
  } catch (err) {
    // If we can't verify, assume connected but with stale data
    return {
      is_connected: true,
      account_id: stripeUserId,
      charges_enabled: false,
      payouts_enabled: false,
      details_submitted: false,
    };
  }
}

/**
 * Create a new Stripe Connect Express account for a brand
 * and return an onboarding link.
 */
export async function createStripeConnectLink(brandId: string): Promise<{
  success: boolean;
  url?: string;
  account_id?: string;
  error?: string;
}> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (!adminUser.can_manage_settings && adminUser.role !== "platform_admin") {
    return { success: false, error: "Not authorized" };
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return { success: false, error: "Stripe is not configured on this platform" };
  }

  try {
    const stripe = new Stripe(stripeKey, { apiVersion: "2026-04-22.dahlia" as any });
    const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

    // Create Express account
    const account = await stripe.accounts.create({
      type: "express",
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      metadata: {
        brand_id: brandId,
      },
    });

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${origin}/admin/advanced?stripe_refresh=true`,
      return_url: `${origin}/admin/advanced?stripe_connected=true`,
      type: "account_onboarding",
    });

    return {
      success: true,
      url: accountLink.url,
      account_id: account.id,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create Stripe account";
    return { success: false, error: message };
  }
}

/**
 * Create a new account link for an existing Stripe Connect account
 * (for refreshing expired links or re-onboarding)
 */
export async function refreshStripeConnectLink(brandId: string): Promise<{
  success: boolean;
  url?: string;
  error?: string;
}> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (!adminUser.can_manage_settings && adminUser.role !== "platform_admin") {
    return { success: false, error: "Not authorized" };
  }

  // Get existing account ID
  const status = await getStripeConnectStatus(brandId);
  if (!status.is_connected || !status.account_id) {
    // No existing account, create new one
    return createStripeConnectLink(brandId);
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return { success: false, error: "Stripe is not configured on this platform" };
  }

  try {
    const stripe = new Stripe(stripeKey, { apiVersion: "2026-04-22.dahlia" as any });
    const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

    const accountLink = await stripe.accountLinks.create({
      account: status.account_id,
      refresh_url: `${origin}/admin/advanced?stripe_refresh=true`,
      return_url: `${origin}/admin/advanced?stripe_connected=true`,
      type: "account_onboarding",
    });

    return {
      success: true,
      url: accountLink.url,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to refresh onboarding link";
    return { success: false, error: message };
  }
}

/**
 * Save Stripe Connect account ID to brand settings
 */
export async function saveStripeConnectAccount(brandId: string, accountId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Save to payment_settings via SECURITY DEFINER RPC
    await pool.query(
      "SELECT set_stripe_connect_account($1, $2)",
      [brandId, accountId]
    );
    return { success: true };
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : String(e);
    return { success: false, error: `Failed to save: ${error}` };
  }
}

/**
 * Disconnect Stripe Connect account from a brand
 */
export async function disconnectStripeConnect(brandId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (!adminUser.can_manage_settings && adminUser.role !== "platform_admin") {
    return { success: false, error: "Not authorized" };
  }

  try {
    // SECURITY DEFINER RPC disconnects the Stripe Connect account
    await pool.query(
      "SELECT disconnect_stripe_connect($1)",
      [brandId]
    );
    return { success: true };
  } catch {
    return { success: false, error: "Failed to disconnect Stripe account" };
  }
}

/**
 * Create a Stripe Express dashboard login link
 */
export async function createStripeDashboardLink(brandId: string): Promise<{
  success: boolean;
  url?: string;
  error?: string;
}> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (!adminUser.can_manage_settings && adminUser.role !== "platform_admin") {
    return { success: false, error: "Not authorized" };
  }

  const status = await getStripeConnectStatus(brandId);
  if (!status.is_connected || !status.account_id) {
    return { success: false, error: "No Stripe account connected" };
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return { success: false, error: "Stripe is not configured" };
  }

  try {
    const stripe = new Stripe(stripeKey, { apiVersion: "2026-04-22.dahlia" as any });
    const loginLink = await stripe.accounts.createLoginLink(status.account_id);

    return {
      success: true,
      url: loginLink.url,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create dashboard link";
    return { success: false, error: message };
  }
}