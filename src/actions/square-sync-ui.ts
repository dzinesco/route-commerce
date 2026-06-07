"use server";

import { getAdminUser } from "@/lib/admin-permissions";
import { assertBrandAccess } from "@/lib/brand-scope";
import { pool } from "@/lib/db";

export type SyncLogEntry = {
  id: string;
  brand_id: string;
  event_type: string;
  direction: string | null;
  entity_type: string | null;
  entity_id: string | null;
  status: string;
  message: string | null;
  details: Record<string, unknown>;
  created_at: string;
};

export type SyncResult = {
  success: boolean;
  synced: number;
  errors: string[];
};

export async function syncSquareNow(
  brandId: string,
  type: "products" | "orders" | "all"
): Promise<SyncResult> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, synced: 0, errors: ["Not authenticated"] };
  if (!adminUser.can_manage_orders) return { success: false, synced: 0, errors: ["Not authorized"] };
  try {
    assertBrandAccess(adminUser, brandId);
  } catch {
    return { success: false, synced: 0, errors: ["Not authorized"] };
  }

  const response = await fetch(`/api/square/sync`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ brandId, type }),
  });

  if (!response.ok) {
    const errText = await response.text();
    return { success: false, synced: 0, errors: [`HTTP ${response.status}: ${errText}`] };
  }

  const result = await response.json();
  return {
    success: result.success ?? true,
    synced: result.synced ?? 0,
    errors: result.errors ?? [],
  };
}

export async function getSyncLog(brandId: string): Promise<{
  success: boolean;
  logs: SyncLogEntry[];
}> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, logs: [] };
  if (!adminUser.can_manage_orders) return { success: false, logs: [] };
  try {
    assertBrandAccess(adminUser, brandId);
  } catch {
    return { success: false, logs: [] };
  }

  const { rows: logs } = await pool.query<SyncLogEntry>(
    "SELECT * FROM square_sync_log WHERE brand_id = $1 ORDER BY created_at DESC LIMIT 10",
    [brandId]
  );

  return { success: true, logs };
}