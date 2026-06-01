"use server";

import { getAdminUser } from "@/lib/admin-permissions";
import { svcHeaders } from "@/lib/svc-headers";

export type WaterAdminSettings = {
  enabled: boolean;
  session_duration_hours: number;
  can_edit_entries: boolean;
  can_delete_entries: boolean;
  can_export_csv: boolean;
  alert_phone?: string | null;
  alerts_enabled?: boolean;
};

export async function getWaterAdminSettings(brandId: string): Promise<WaterAdminSettings | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/get_water_admin_settings`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({ p_brand_id: brandId }),
    }
  );

  if (!response.ok) return null;
  const data = await response.json();
  return data as WaterAdminSettings;
}

export async function saveWaterAdminSettings(
  brandId: string,
  settings: Partial<WaterAdminSettings & { pin?: string }>
): Promise<{ success: boolean; error?: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (!adminUser.can_manage_water_log) return { success: false, error: "Not authorized" };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  let pinHash: string | null = null;
  if (settings.pin) {
    // Hash the PIN server-side using PostgreSQL
    const hashRes = await fetch(
      `${supabaseUrl}/rest/v1/rpc/hash_water_admin_pin`,
      {
        method: "POST",
        headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
        body: JSON.stringify({ p_pin: settings.pin }),
      }
    );
    const hashData = await hashRes.json();
    if (!hashData?.hash) return { success: false, error: "Failed to hash PIN" };
    pinHash = hashData.hash;
  }

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/save_water_admin_settings`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({
        p_brand_id: brandId,
        p_enabled: settings.enabled ?? null,
        p_pin_hash: pinHash,
        p_session_duration_hours: settings.session_duration_hours ?? null,
        p_can_edit_entries: settings.can_edit_entries ?? null,
        p_can_delete_entries: settings.can_delete_entries ?? null,
        p_can_export_csv: settings.can_export_csv ?? null,
        p_alert_phone: settings.alert_phone ?? null,
        p_alerts_enabled: settings.alerts_enabled ?? null,
      }),
    }
  );

  const data = await response.json();
  if (!response.ok || !data?.success) {
    return { success: false, error: data?.error ?? "Failed to save settings" };
  }
  return { success: true };
}

export async function verifyWaterAdminPin(
  brandId: string,
  pin: string
): Promise<{ success: boolean; session_id?: string; error?: string }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const settingsRes = await fetch(
    `${supabaseUrl}/rest/v1/rpc/get_water_admin_settings`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({ p_brand_id: brandId }),
    }
  );
  const settings = await settingsRes.json();
  if (!settingsRes.ok || !settings?.enabled) {
    return { success: false, error: "Admin portal not enabled" };
  }

  // Verify PIN against stored hash
  const verifyRes = await fetch(
    `${supabaseUrl}/rest/v1/rpc/verify_water_admin_pin`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({ p_brand_id: brandId, p_pin: pin }),
    }
  );
  const verifyData = await verifyRes.json();
  if (!verifyRes.ok || !verifyData?.success) {
    return { success: false, error: "Invalid PIN" };
  }

  return { success: true, session_id: verifyData.session_id };
}