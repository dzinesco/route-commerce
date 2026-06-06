"use server";

import { auth } from "@/lib/auth";
import { createClient as createServiceClient } from "@supabase/supabase-js";

/**
 * Update the password for the currently signed-in admin.
 *
 * Identity comes from the Auth.js session (`auth().user.id`), which is
 * the same UUID space as `admin_users.user_id` and `auth.users.id` in
 * Postgres. The legacy `rc_auth_uid` / `rc_uid` cookie fallback has
 * been removed — the Auth.js JWT is the single source of truth.
 */
export async function updatePasswordAction(
  newPassword: string
): Promise<{ error?: string }> {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return { error: "Not authenticated. Please sign in again." };
  }

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await service.rpc("update_user_password", {
    p_user_id: userId,
    p_password: newPassword,
  });

  if (error) return { error: error.message };
  return {};
}
