"use server";

import { cookies } from "next/headers";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export async function updatePasswordAction(
  newPassword: string
): Promise<{ error?: string }> {
  const cookieStore = await cookies();
  const uid =
    cookieStore.get("rc_auth_uid")?.value ??
    cookieStore.get("rc_uid")?.value;

  if (!uid) {
    return { error: "Not authenticated. Please log in again." };
  }

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await service.rpc("update_user_password", {
    p_user_id: uid,
    p_password: newPassword,
  });

  if (error) return { error: error.message };
  return {};
}