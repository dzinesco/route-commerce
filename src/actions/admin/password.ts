"use server";

import { auth } from "@/lib/auth";
import { query } from "@/lib/db";

/**
 * Update the current user's Supabase auth password.
 *
 * Reads the Auth.js v5 session to identify the user. The session's
 * `user.id` is either:
 *   - a Supabase auth user id (UUID) for email/password sign-ins
 *   - a Google `sub` (non-UUID) for Google sign-ins — these are not
 *     provisioned in Supabase auth, so the RPC will reject them. Google
 *     users must be provisioned in Supabase auth separately.
 *
 * The password update itself runs as a SECURITY DEFINER PL/pgSQL function
 * (`update_user_password`) inside the database, called directly via the
 * shared `pg` pool. No Supabase REST hop required.
 */
export async function updatePasswordAction(
  newPassword: string
): Promise<{ error?: string; userId?: string }> {
  const session = await auth();
  const uid = session?.user?.id;
  if (!uid) {
    return { error: "Not authenticated. Please log in again." };
  }

  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_REGEX.test(uid)) {
    return {
      error:
        "Password change is not available for social sign-in accounts. Please contact an admin.",
    };
  }

  try {
    // The RPC is SECURITY DEFINER and returns a single row (or raises).
    // We SELECT it (rather than SELECT update_user_password(...)) so the
    // call stays a normal parameterized query and we can read the result.
    await query("SELECT update_user_password($1, $2)", [uid, newPassword]);
    return { userId: uid };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to update password.";
    return { error: message };
  }
}
