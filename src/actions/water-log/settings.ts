"use server";

import { getAdminUser } from "@/lib/admin-permissions";

// TODO(migration): the water-log settings RPCs (`get_water_admin_settings`,
// `hash_water_admin_pin`, `save_water_admin_settings`,
// `verify_water_admin_pin`) and the underlying
// `water_admin_settings` table are not in the SaaS rebuild schema.
// The functions below preserve the original signatures and return
// empty / no-op responses. Same pattern as
// `actions/route-trace/lots.ts`.

export type WaterAdminSettings = {
  enabled: boolean;
  session_duration_hours: number;
  can_edit_entries: boolean;
  can_delete_entries: boolean;
  can_export_csv: boolean;
  alert_phone?: string | null;
  alerts_enabled?: boolean;
};

const NOT_CONFIGURED = "Water log is not configured in the SaaS rebuild";

export async function getWaterAdminSettings(_brandId: string): Promise<WaterAdminSettings | null> {
  return null;
}

export async function saveWaterAdminSettings(
  _brandId: string,
  _settings: Partial<WaterAdminSettings & { pin?: string }>
): Promise<{ success: boolean; error?: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (!adminUser.can_manage_water_log) return { success: false, error: "Not authorized" };
  return { success: false, error: NOT_CONFIGURED };
}

export async function verifyWaterAdminPin(
  _brandId: string,
  _pin: string
): Promise<{ success: boolean; session_id?: string; error?: string }> {
  return { success: false, error: NOT_CONFIGURED };
}
