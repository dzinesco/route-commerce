"use server";

import { getAdminUser } from "@/lib/admin-permissions";
import { svcHeaders } from "@/lib/svc-headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

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

// ── Internal fetch helper ────────────────────────────────────────────────────

async function platformRPC<T>(rpcName: string, body: Record<string, unknown> = {}): Promise<T> {
  const adminUser = await getAdminUser();
  if (!adminUser) throw new Error("Not authenticated");
  if (adminUser.role !== "platform_admin") throw new Error("Access denied: platform admin only");

  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/${rpcName}`, {
    method: "POST",
    headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`RPC ${rpcName} failed: ${err}`);
  }

  return response.json() as Promise<T>;
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

  const response = await fetch(
    `${supabaseUrl}/rest/v1/founder_pain_log_platform?select=*`,
    {
      headers: svcHeaders(supabaseKey),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Failed to fetch pain log: ${err}`);
  }

  return response.json() as Promise<PainLogItem[]>;
}

export async function createPainLogItem(data: CreatePainLogData): Promise<{ success: boolean; error?: string }> {
  try {
    const adminUser = await getAdminUser();
    if (!adminUser) return { success: false, error: "Not authenticated" };
    if (adminUser.role !== "platform_admin") return { success: false, error: "Access denied" };

    const response = await fetch(`${supabaseUrl}/rest/v1/founder_pain_log`, {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify({
        brand_id: data.brand_id || null,
        severity: data.severity,
        category: data.category,
        title: data.title,
        description: data.description || null,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return { success: false, error: err };
    }

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

    const response = await fetch(
      `${supabaseUrl}/rest/v1/founder_pain_log?id=eq.${id}`,
      {
        method: "PATCH",
        headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "resolved",
          resolved_at: new Date().toISOString(),
          resolved_by: adminUser.id,
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      return { success: false, error: err };
    }

    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}