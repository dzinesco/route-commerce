"use server";

import { getAdminUser } from "@/lib/admin-permissions";
import { pool } from "@/lib/db";
import { logAuditEvent } from "@/actions/audit";

const useMockData = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true";

export type UpdateStopResult =
  | { success: true }
  | { success: false; error: string };

export async function updateStop(
  stopId: string,
  brandId: string,
  data: {
    city: string;
    state: string;
    location: string;
    date: string;
    time: string;
    active: boolean;
    address?: string | null;
    zip?: string | null;
    cutoff_time?: string | null;
  }
): Promise<UpdateStopResult> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (!adminUser.can_manage_stops) return { success: false, error: "Not authorized" };

  if (adminUser.role === "brand_admin" && adminUser.brand_id !== brandId) {
    return { success: false, error: "Not authorized for this brand" };
  }

  if (useMockData) {
    return { success: true };
  }

  const slug = `${data.city.toLowerCase().replace(/\s+/g, "-")}-${data.date}`;

  // Direct UPDATE on the legacy stops table — the new-schema Drizzle
  // stops table doesn't have the columns we need to write.
  const { rowCount, error } = await pool
    .query(
      `UPDATE stops SET
         city = $1,
         state = $2,
         location = $3,
         date = $4,
         time = $5,
         slug = $6,
         active = $7,
         brand_id = $8,
         address = $9,
         zip = $10,
         cutoff_time = $11
       WHERE id = $12`,
      [
        data.city,
        data.state,
        data.location,
        data.date,
        data.time,
        slug,
        data.active,
        brandId,
        data.address ?? null,
        data.zip ?? null,
        data.cutoff_time ?? null,
        stopId,
      ],
    )
    .then((r) => ({ rowCount: r.rowCount ?? 0, error: null }))
    .catch((e: unknown) => ({
      rowCount: 0,
      error: e instanceof Error ? e : new Error(String(e)),
    }));

  if (error || !rowCount) {
    return {
      success: false,
      error: error ? error.message : "Stop not found",
    };
  }

  logAuditEvent({
    table_name: "stops",
    record_id: stopId,
    action: "UPDATE",
    old_data: {},
    new_data: { city: data.city, state: data.state, date: data.date, active: data.active },
    brand_id: brandId,
  });

  return { success: true };
}
