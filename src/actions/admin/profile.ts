"use server";

import { Pool } from "pg";
import { revalidatePath } from "next/cache";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export type UpdateAdminProfileResult =
  | { success: true }
  | { success: false; error: string };

export async function updateAdminProfileAction(
  id: string,
  displayName: string | null,
  phoneNumber: string | null
): Promise<UpdateAdminProfileResult> {
  try {
    await pool.query("SELECT update_admin_user($1, $2, $3)", [
      id,
      displayName,
      phoneNumber,
    ]);
    revalidatePath("/admin/me");
    return { success: true };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to update profile";
    return { success: false, error: message };
  }
}
