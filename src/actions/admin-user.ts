"use server";

import { getAdminUser, type AdminUser } from "@/lib/admin-permissions";

export async function getCurrentAdminUser(): Promise<AdminUser | null> {
  return getAdminUser();
}