"use server";

import { getAdminUser } from "@/lib/admin-permissions";
import { pool } from "@/lib/db";

// ── Types ────────────────────────────────────────────────────────────────────

export type PlatformMetrics = {
  active_brands: number;
  orders_today: number;
  revenue_today: number;
  active_routes: number;
  failed_orders_today: number;
  pending_orders_today: number;
};

export type ActivityEvent = {
  id: string;
  event_type: string;
  entity_type: string;
  entity_id: string;
  payload: Record<string, unknown>;
  actor_type: string;
  source: string;
  created_at: string;
  brand_id: string | null;
  brand_name: string | null;
};

export type BrandHealth = {
  brand_id: string;
  brand_name: string;
  brand_slug: string;
  plan_tier: string;
  orders_today: number;
  revenue_today: number;
  active_stops: number;
  failed_orders: number;
  pending_orders: number;
  last_activity: string | null;
  open_pain_items: number;
  health_status: "healthy" | "warning" | "critical";
};

export type PainLogItem = {
  id: string;
  brand_id: string | null;
  brand_name: string | null;
  severity: "low" | "medium" | "high" | "critical";
  category: string;
  title: string;
  description: string | null;
  status: string;
  created_at: string;
};

export type CreatePainLogData = {
  brand_id?: string | null;
  severity: "low" | "medium" | "high" | "critical";
  category: string;
  title: string;
  description?: string | null;
};

// ── Internal RPC helper ──────────────────────────────────────────────────────

async function platformRPC<T>(rpcName: string): Promise<T> {
  const adminUser = await getAdminUser();
  if (!adminUser) throw new Error("Not authenticated");
  if (adminUser.role !== "platform_admin") throw new Error("Access denied: platform admin only");

  const { rows } = await pool.query<Record<string, T>>(
    `SELECT ${rpcName}() AS "${rpcName}"`,
  );

  const data = rows[0]?.[rpcName];
  if (data == null) {
    return null as T;
  }
  return data as T;
}

// ── Platform actions ─────────────────────────────────────────────────────────

export async function getPlatformMetrics(): Promise<PlatformMetrics> {
  return platformRPC<PlatformMetrics>("get_platform_command_center_metrics");
}

export async function getPlatformActivityFeed(): Promise<ActivityEvent[]> {
  return platformRPC<ActivityEvent[]>("get_platform_activity_feed");
}

export async function getBrandHealthSnapshot(): Promise<BrandHealth[]> {
  return platformRPC<BrandHealth[]>("get_brand_health_snapshot");
}

export async function getPainLog(): Promise<PainLogItem[]> {
  const adminUser = await getAdminUser();
  if (!adminUser) throw new Error("Not authenticated");

  const { rows } = await pool.query<PainLogItem>(
    `SELECT * FROM founder_pain_log_platform ORDER BY created_at DESC`,
  );

  return rows;
}

export async function createPainLogItem(data: CreatePainLogData): Promise<{ success: boolean; error?: string }> {
  try {
    const adminUser = await getAdminUser();
    if (!adminUser) return { success: false, error: "Not authenticated" };
    if (adminUser.role !== "platform_admin") return { success: false, error: "Access denied" };

    await pool.query(
      `INSERT INTO founder_pain_log (brand_id, severity, category, title, description)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        data.brand_id || null,
        data.severity,
        data.category,
        data.title,
        data.description || null,
      ],
    );

    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function resolvePainLogItem(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const adminUser = await getAdminUser();
    if (!adminUser) return { success: false, error: "Not authenticated" };
    if (adminUser.role !== "platform_admin") return { success: false, error: "Access denied" };

    await pool.query(
      `UPDATE founder_pain_log
       SET status = 'resolved', resolved_at = now(), resolved_by = $2
       WHERE id = $1`,
      [id, adminUser.id],
    );

    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}
