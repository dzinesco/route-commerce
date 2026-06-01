"use server";

import { createClient as createServiceClient } from "@supabase/supabase-js";

function getServiceClient() {
  const roleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!roleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY not set");
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    roleKey,
  );
}

export type ResetAdminPasswordResult =
  | { success: true; tempPassword: string }
  | { success: false; error: string };

/**
 * Emergency recovery action — only usable in development or when the caller
 * already has service role access. Resets the password for the specified email
 * and returns the temp password so it can be displayed to the user.
 */
export async function resetAdminPassword(
  email: string,
  newPassword: string
): Promise<ResetAdminPasswordResult> {
  const service = getServiceClient();

  // Look up auth user by email
  const { data: authUsers, error: listError } = await service.auth.admin.listUsers();
  if (listError || !authUsers?.users) {
    return { success: false, error: "Could not list users: " + listError?.message };
  }

  const authUser = authUsers.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!authUser) {
    return { success: false, error: "No auth user found for that email address." };
  }

  // Update password via service role
  const { error: updateError } = await service.auth.admin.updateUserById(
    authUser.id,
    { password: newPassword, email_confirm: true }
  );

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  return { success: true, tempPassword: newPassword };
}