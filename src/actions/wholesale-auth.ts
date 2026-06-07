"use server";

/**
 * Wholesale customer authentication.
 *
 * TODO(migration): The original implementation used Supabase's
 * `auth.signInWithPassword` for email/password login of wholesale
 * customers. Now that Supabase is being removed, the wholesale
 * customer auth needs to be rebuilt on top of Auth.js v5 (or a
 * custom bcrypt + cookie session) before this module can be re-enabled.
 *
 * Until that lands, the actions below are stubbed: they preserve the
 * original signatures so the login form renders without runtime
 * errors, but always return a friendly "not available" error.
 *
 * Re-enable by:
 *   1. Adding a `wholesale_customers` table (or extending
 *      `db/schema/customers.ts` with `password_hash` + `auth_user_id`).
 *   2. Wiring up the chosen auth provider in `src/lib/auth.ts`.
 *   3. Setting the `wholesale_session` cookie with the resolved
 *      customer id.
 */

import { cookies } from "next/headers";

export type WholesaleLoginResult =
  | { success: true; token: string; userId: string; customerId: string }
  | { success: false; error: string };

const NOT_AVAILABLE_ERROR =
  "Wholesale customer login is temporarily unavailable while we rebuild authentication. Please contact your account manager.";

export async function wholesaleLoginAction(_formData: FormData): Promise<WholesaleLoginResult> {
  return { success: false, error: NOT_AVAILABLE_ERROR };
}

export async function wholesaleLogoutAction(): Promise<{ success: true } | { success: false; error: string }> {
  const cookieStore = await cookies();
  // Best-effort cookie cleanup so a returning customer doesn't see stale state
  cookieStore.delete("wholesale_session");
  cookieStore.delete("sb-wnzkhezyhnfzhkhiflrp-auth-token");
  return { success: true };
}
