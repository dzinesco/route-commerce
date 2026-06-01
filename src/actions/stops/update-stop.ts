"use server";

import { getAdminUser } from "@/lib/admin-permissions";
import { svcHeaders } from "@/lib/svc-headers";
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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const slug = `${data.city.toLowerCase().replace(/\s+/g, "-")}-${data.date}`;

  const res = await fetch(`${supabaseUrl}/rest/v1/stops?id=eq.${stopId}`, {
    method: "PATCH",
    headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
    body: JSON.stringify({
      city: data.city,
      state: data.state,
      location: data.location,
      date: data.date,
      time: data.time,
      slug,
      active: data.active,
      brand_id: brandId,
      address: data.address ?? null,
      zip: data.zip ?? null,
      cutoff_time: data.cutoff_time ?? null,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return { success: false, error: `Failed: ${err}` };
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
