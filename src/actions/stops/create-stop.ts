"use server";

import { revalidateTag } from "next/cache";
import { getAdminUser } from "@/lib/admin-permissions";
import { pool } from "@/lib/db";
import { getMockTableData } from "@/lib/mock-data";

const useMockData = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true";

export type CreateStopResult =
  | { success: true; id: string }
  | { success: false; error: string };

export async function createStop(
  brandId: string,
  data: {
    city: string;
    state: string;
    location: string;
    date: string;
    time: string;
    address?: string | null;
    zip?: string | null;
    cutoff_time?: string | null;
    active?: boolean;
  }
): Promise<CreateStopResult> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (!adminUser.can_manage_stops) return { success: false, error: "Not authorized" };

  if (adminUser.role === "brand_admin" && adminUser.brand_id !== brandId) {
    return { success: false, error: "Not authorized for this brand" };
  }

  if (useMockData) {
    const mockStops = getMockTableData("stops") as Array<{ id: string }>;
    return { success: true, id: `mock-stop-${Date.now()}` };
  }

  // `admin_create_stop` is a SECURITY DEFINER RPC that bypasses the
  // block_stops_mutations RLS policy. It returns either {success,
  // stop_id} or {success:false, error}. Migration 202.
  let rpcResult: { success?: boolean; error?: string; stop_id?: string; id?: string } = {};
  try {
    const { rows } = await pool.query<{ success?: boolean; error?: string; stop_id?: string; id?: string }>(
      "SELECT * FROM admin_create_stop($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
      [
        data.active ?? false,
        data.address || null,
        brandId,
        data.city,
        data.cutoff_time || null,
        data.date,
        data.location,
        data.state,
        data.time,
        data.zip || null,
      ],
    );
    rpcResult = rows[0] ?? {};
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create stop",
    };
  }

  if (rpcResult.success === false) {
    return { success: false, error: rpcResult.error ?? "Failed to create stop" };
  }

  const stopId = rpcResult.stop_id || rpcResult.id || "";
  const effectiveBrandId = brandId || adminUser.brand_id;
  if (effectiveBrandId) {
    revalidateTag("stops", "default");
    revalidateTag(`brand:${effectiveBrandId}:stops`, "default");
  }
  return { success: true, id: stopId };
}
