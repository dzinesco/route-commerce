"use server";

import { query } from "@/lib/db";

export type ResetAdminPasswordResult =
  | { success: true; tempPassword: string }
  | { success: false; error: string };

/**
 * Emergency recovery action — only usable in development or when the caller
 * already has direct DB access. Resets the password for the specified email
 * and returns the temp password so it can be displayed to the user.
 *
 * Now that Supabase auth is gone, this hits the `users` table directly and
 * calls the same `update_user_password` SECURITY DEFINER RPC used by the
 * self-service password change action.
 */
export async function resetAdminPassword(
  email: string,
  newPassword: string
): Promise<ResetAdminPasswordResult> {
  // Look up the user by email
  const { rows } = await query<{ id: string }>(
    "SELECT id FROM users WHERE email = $1 LIMIT 1",
    [email.toLowerCase()],
  );
  const user = rows[0];
  if (!user) {
    return { success: false, error: "No auth user found for that email address." };
  }

  // Update password via SECURITY DEFINER RPC
  try {
    await query("SELECT update_user_password($1, $2)", [user.id, newPassword]);
    return { success: true, tempPassword: newPassword };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update password",
    };
  }
}
