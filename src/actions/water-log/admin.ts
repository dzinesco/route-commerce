"use server";

import { getAdminUser } from "@/lib/admin-permissions";
import { svcHeaders } from "@/lib/svc-headers";

type Irrigator = {
  id: string;
  name: string;
  role: "irrigator" | "water_admin";
  active: boolean;
  language_preference: string;
  last_used_at: string | null;
  created_at: string;
  deleted_at?: string | null;
};

type Headgate = {
  id: string;
  name: string;
  active: boolean;
  unit: string;
  created_at: string;
  deleted_at?: string | null;
  headgate_token?: string | null;
  last_used_at?: string | null;
  high_threshold?: number | null;
  low_threshold?: number | null;
};

type WaterEntry = {
  id: string;
  headgate_id: string;
  user_id: string;
  headgate_name: string;
  user_name: string;
  measurement: number;
  unit: string;
  notes: string | null;
  submitted_via: string;
  logged_at: string;
  headgate_unit?: string;
};

// ── Headgate Admin ──────────────────────────────────────────

export async function createWaterHeadgate(brandId: string, name: string, unit: string = "CFS"): Promise<{ success: boolean; headgate?: Headgate; error?: string }> {
  const adminUser = await (await import("@/lib/admin-permissions")).getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (!adminUser.can_manage_water_log && adminUser.role !== "platform_admin") {
    return { success: false, error: "Not authorized" };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // prefer service for admin muts

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/create_water_headgate`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({ p_brand_id: brandId, p_name: name, p_unit: unit }),
    }
  );

  const data = await response.json();
  if (!response.ok || !data?.headgate) {
    return { success: false, error: data?.message ?? "Failed to create headgate" };
  }
  return { success: true, headgate: data.headgate };
}

export async function updateWaterHeadgate(
  headgateId: string,
  name: string,
  active: boolean,
  unit?: string,
  highThreshold?: number | null,
  lowThreshold?: number | null
): Promise<{ success: boolean; error?: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (!adminUser.can_manage_water_log) return { success: false, error: "Not authorized" };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/update_water_headgate`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({
        p_headgate_id: headgateId,
        p_name: name,
        p_active: active,
        p_unit: unit ?? null,
        p_brand_id: adminUser.brand_id ?? null,
        p_high_threshold: highThreshold ?? null,
        p_low_threshold: lowThreshold ?? null,
      }),
    }
  );

  const data = await response.json();
  if (!response.ok || !data?.success) {
    return { success: false, error: data?.error ?? "Failed to update headgate" };
  }
  return { success: true };
}

// ── Irrigator Admin ─────────────────────────────────────────

export async function getWaterIrrigators(brandId: string): Promise<Irrigator[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/get_water_users`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({ p_brand_id: brandId }),
    }
  );

  if (!response.ok) return [];
  const data = await response.json();
  return data?.users ?? [];
}

export async function createWaterIrrigator(
  brandId: string,
  name: string,
  lang: string = "en"
): Promise<{ success: boolean; irrigator?: Irrigator; pin?: string; error?: string }> {
  return createWaterUser(brandId, name, "irrigator", lang) as Promise<{ success: boolean; irrigator?: Irrigator; pin?: string; error?: string }>;
}

export async function createWaterUser(
  brandId: string,
  name: string,
  role: "irrigator" | "water_admin",
  lang: string = "en"
): Promise<{ success: boolean; user?: Irrigator; pin?: string; error?: string }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/create_water_user`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({ p_brand_id: brandId, p_name: name, p_role: role, p_lang: lang }),
    }
  );

  const data = await response.json();
  if (!response.ok || !data?.success) {
    return { success: false, error: data?.error ?? "Failed to create user" };
  }
  return { success: true, user: data.user, pin: data.pin };
}

export async function updateWaterIrrigator(
  irrigatorId: string,
  name: string,
  active: boolean,
  lang: string,
  role: "irrigator" | "water_admin"
): Promise<{ success: boolean; error?: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (!adminUser.can_manage_water_log) return { success: false, error: "Not authorized" };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/update_water_user`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({
        p_user_id: irrigatorId,
        p_name: name,
        p_active: active,
        p_lang: lang,
        p_role: role,
        p_brand_id: adminUser.brand_id ?? null,
      }),
    }
  );

  const data = await response.json();
  if (!response.ok || !data?.success) {
    return { success: false, error: data?.error ?? "Failed to update user" };
  }
  return { success: true };
}

export async function resetWaterIrrigatorPin(
  irrigatorId: string
): Promise<{ success: boolean; pin?: string; error?: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (!adminUser.can_manage_water_log) return { success: false, error: "Not authorized" };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/reset_water_user_pin`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({
        p_user_id: irrigatorId,
        p_brand_id: adminUser.brand_id ?? null,
      }),
    }
  );

  const data = await response.json();
  if (!response.ok || !data?.success) {
    return { success: false, error: data?.error ?? "Failed to reset PIN" };
  }
  return { success: true, pin: data.pin };
}

export async function deleteWaterUser(userId: string): Promise<{ success: boolean; error?: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (!adminUser.can_manage_water_log) return { success: false, error: "Not authorized" };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/delete_water_user`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({
        p_user_id: userId,
        p_brand_id: adminUser.brand_id ?? null,
      }),
    }
  );

  const data = await response.json();
  if (!response.ok || !data?.success) {
    return { success: false, error: data?.error ?? "Failed to delete user" };
  }
  return { success: true };
}

export async function deleteWaterHeadgate(headgateId: string): Promise<{ success: boolean; error?: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (!adminUser.can_manage_water_log) return { success: false, error: "Not authorized" };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/delete_water_headgate`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({
        p_headgate_id: headgateId,
        p_brand_id: adminUser.brand_id ?? null,
      }),
    }
  );

  // The RPC returns JSONB on success: { success: true } or { success: false, error: "..." }.
  // On failure (HTTP non-2xx) Supabase returns { message: "...", code: "...", details: ... }.
  // We try to extract the most useful message in both cases.
  let data: { success?: boolean; error?: string; message?: string } | null = null;
  try {
    data = await response.json();
  } catch {
    // Non-JSON body — leave data as null, fall through to default error
  }

  if (response.ok && data?.success) {
    return { success: true };
  }

  // Prefer the RPC's own error if it set one
  const errorMessage =
    data?.error ??
    data?.message ??
    (response.ok ? "Unknown error" : `HTTP ${response.status}: ${response.statusText || "request failed"}`);

  if (process.env.NODE_ENV !== "production") {
    console.error("[deleteWaterHeadgate] failed", {
      headgateId,
      status: response.status,
      data,
    });
  }

  return { success: false, error: errorMessage };
}

// ── Entries ────────────────────────────────────────────────

export async function getWaterEntries(brandId: string, limit = 50): Promise<WaterEntry[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/get_water_entries`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({ p_brand_id: brandId, p_limit: limit }),
    }
  );

  if (!response.ok) return [];
  const data = await response.json();
  return data?.entries ?? [];
}

export async function getWaterHeadgatesAdmin(brandId: string): Promise<Headgate[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/get_water_headgates_admin`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({ p_brand_id: brandId }),
    }
  );

  if (!response.ok) return [];
  const data = await response.json();
  return data?.headgates ?? [];
}

export async function regenerateHeadgateToken(headgateId: string): Promise<{ success: boolean; token?: string; error?: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (!adminUser.can_manage_water_log) return { success: false, error: "Not authorized" };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/regenerate_headgate_token`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({ p_headgate_id: headgateId, p_brand_id: adminUser.brand_id ?? null }),
    }
  );

  const data = await response.json();
  if (!response.ok || !data?.success) {
    return { success: false, error: data?.error ?? "Failed to regenerate token" };
  }
  return { success: true, token: data.token };
}

// ── Entry edit/delete ─────────────────────────────────────

export async function updateWaterEntry(
  entryId: string,
  measurement: number,
  notes: string | null,
  unit?: string
): Promise<{ success: boolean; error?: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (!adminUser.can_manage_water_log) return { success: false, error: "Not authorized" };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/update_water_entry`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({
        p_entry_id: entryId,
        p_measurement: measurement,
        p_notes: notes,
        p_unit: unit ?? null,
        p_brand_id: adminUser.brand_id ?? null,
      }),
    }
  );

  const data = await response.json();
  if (!response.ok || !data?.success) {
    return { success: false, error: data?.error ?? "Failed to update entry" };
  }
  return { success: true };
}

export async function deleteWaterEntry(
  entryId: string
): Promise<{ success: boolean; error?: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (!adminUser.can_manage_water_log) return { success: false, error: "Not authorized" };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/delete_water_entry`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({
        p_entry_id: entryId,
        p_brand_id: adminUser.brand_id ?? null,
      }),
    }
  );

  const data = await response.json();
  if (!response.ok || !data?.success) {
    return { success: false, error: data?.error ?? "Failed to delete entry" };
  }
  return { success: true };
}

export async function getWaterEntryById(entryId: string): Promise<WaterEntry | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/get_water_entry_by_id`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({ p_entry_id: entryId }),
    }
  );

  if (!response.ok) return null;
  const data = await response.json();
  return data?.entry ?? null;
}

// ── Display summary ───────────────────────────────────

export type WaterDisplayEntry = {
  logged_at: string;
  headgate_name: string;
  user_name: string;
  user_role: string;
  measurement: number;
  unit: string;
  notes: string | null;
  submitted_via: string;
};

export type WaterDisplayHeadgate = {
  id: string;
  name: string;
  unit: string;
  latest_entry: { measurement: number; user_name: string; logged_at: string } | null;
  last_logged_at: string | null;
  minutes_ago: number | null;
};

export type WaterDisplaySummary = {
  headgates: WaterDisplayHeadgate[];
  today_count: number;
  today_total: number;
  recent_entries: WaterDisplayEntry[];
};

export async function getWaterDisplaySummary(brandId: string): Promise<WaterDisplaySummary | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/get_water_display_summary`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({ p_brand_id: brandId }),
    }
  );

  if (!response.ok) return null;
  const data = await response.json();
  return data as WaterDisplaySummary;
}

export type AlertLogEntry = {
  id: string;
  alert_type: "high" | "low";
  threshold_value: number;
  reading_value: number;
  message_sent: string | null;
  sent_at: string;
  created_at: string;
  headgate_name: string;
  formatted_time: string;
};

export async function getWaterAlertLog(brandId: string, limit = 50): Promise<AlertLogEntry[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/get_water_alert_log`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({ p_brand_id: brandId, p_limit: limit }),
    }
  );

  if (!response.ok) return [];
  const data = await response.json();
  return data?.alerts ?? [];
}