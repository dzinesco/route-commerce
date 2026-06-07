"use server";

import { getAdminUser } from "@/lib/admin-permissions";

// TODO(migration): the water-log feature was built on Supabase RPCs
// (`create_water_headgate`, `update_water_headgate`, `delete_water_headgate`,
// `get_water_users`, `create_water_user`, `update_water_user`,
// `delete_water_user`, `reset_water_user_pin`, `get_water_entries`,
// `get_water_headgates_admin`, `regenerate_headgate_token`,
// `update_water_entry`, `delete_water_entry`, `get_water_entry_by_id`,
// `get_water_display_summary`, `get_water_alert_log`) and tables that
// are not part of the SaaS rebuild's `db/schema/` (`water_headgates`,
// `water_users`, `water_entries`, `water_sessions`,
// `water_admin_sessions`, `water_admin_settings`, `water_alert_log`).
// All actions below preserve their original signature and return
// empty / no-op responses so the admin UI degrades gracefully. To
// re-enable water log, add the tables to `db/schema/` and
// re-implement these against Drizzle. Same pattern as
// `actions/route-trace/lots.ts`.

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

const NOT_CONFIGURED = "Water log is not configured in the SaaS rebuild";

// ── Headgate Admin ──────────────────────────────────────────

export async function createWaterHeadgate(
  _brandId: string,
  _name: string,
  _unit: string = "CFS"
): Promise<{ success: boolean; headgate?: Headgate; error?: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (!adminUser.can_manage_water_log && adminUser.role !== "platform_admin") {
    return { success: false, error: "Not authorized" };
  }
  return { success: false, error: NOT_CONFIGURED };
}

export async function updateWaterHeadgate(
  _headgateId: string,
  _name: string,
  _active: boolean,
  _unit?: string,
  _highThreshold?: number | null,
  _lowThreshold?: number | null
): Promise<{ success: boolean; error?: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (!adminUser.can_manage_water_log) return { success: false, error: "Not authorized" };
  return { success: false, error: NOT_CONFIGURED };
}

// ── Irrigator Admin ─────────────────────────────────────────

export async function getWaterIrrigators(_brandId: string): Promise<Irrigator[]> {
  return [];
}

export async function createWaterIrrigator(
  _brandId: string,
  _name: string,
  _lang: string = "en"
): Promise<{ success: boolean; irrigator?: Irrigator; pin?: string; error?: string }> {
  return createWaterUser(_brandId, _name, "irrigator", _lang) as Promise<{
    success: boolean;
    irrigator?: Irrigator;
    pin?: string;
    error?: string;
  }>;
}

export async function createWaterUser(
  _brandId: string,
  _name: string,
  _role: "irrigator" | "water_admin",
  _lang: string = "en"
): Promise<{ success: boolean; user?: Irrigator; pin?: string; error?: string }> {
  return { success: false, error: NOT_CONFIGURED };
}

export async function updateWaterIrrigator(
  _irrigatorId: string,
  _name: string,
  _active: boolean,
  _lang: string,
  _role: "irrigator" | "water_admin"
): Promise<{ success: boolean; error?: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (!adminUser.can_manage_water_log) return { success: false, error: "Not authorized" };
  return { success: false, error: NOT_CONFIGURED };
}

export async function resetWaterIrrigatorPin(
  _irrigatorId: string
): Promise<{ success: boolean; pin?: string; error?: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (!adminUser.can_manage_water_log) return { success: false, error: "Not authorized" };
  return { success: false, error: NOT_CONFIGURED };
}

export async function deleteWaterUser(_userId: string): Promise<{ success: boolean; error?: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (!adminUser.can_manage_water_log) return { success: false, error: "Not authorized" };
  return { success: false, error: NOT_CONFIGURED };
}

export async function deleteWaterHeadgate(_headgateId: string): Promise<{ success: boolean; error?: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (!adminUser.can_manage_water_log) return { success: false, error: "Not authorized" };
  return { success: false, error: NOT_CONFIGURED };
}

// ── Entries ────────────────────────────────────────────────

export async function getWaterEntries(_brandId: string, _limit = 50): Promise<WaterEntry[]> {
  return [];
}

export async function getWaterHeadgatesAdmin(_brandId: string): Promise<Headgate[]> {
  return [];
}

export async function regenerateHeadgateToken(
  _headgateId: string
): Promise<{ success: boolean; token?: string; error?: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (!adminUser.can_manage_water_log) return { success: false, error: "Not authorized" };
  return { success: false, error: NOT_CONFIGURED };
}

// ── Entry edit/delete ─────────────────────────────────────

export async function updateWaterEntry(
  _entryId: string,
  _measurement: number,
  _notes: string | null,
  _unit?: string
): Promise<{ success: boolean; error?: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (!adminUser.can_manage_water_log) return { success: false, error: "Not authorized" };
  return { success: false, error: NOT_CONFIGURED };
}

export async function deleteWaterEntry(_entryId: string): Promise<{ success: boolean; error?: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (!adminUser.can_manage_water_log) return { success: false, error: "Not authorized" };
  return { success: false, error: NOT_CONFIGURED };
}

export async function getWaterEntryById(_entryId: string): Promise<WaterEntry | null> {
  return null;
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

export async function getWaterDisplaySummary(_brandId: string): Promise<WaterDisplaySummary | null> {
  return null;
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

export async function getWaterAlertLog(_brandId: string, _limit = 50): Promise<AlertLogEntry[]> {
  return [];
}
