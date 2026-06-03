"use server";

import { getAdminUser } from "@/lib/admin-permissions";
import { svcHeaders } from "@/lib/svc-headers";
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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  // Use anon key — the RPC is SECURITY DEFINER so it bypasses RLS regardless
  // of caller. This also means a missing SUPABASE_SERVICE_ROLE_KEY in
  // production no longer breaks stop creation.
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/admin_create_stop`, {
    method: "POST",
    headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
    body: JSON.stringify({
      p_brand_id: brandId,
      p_city: data.city,
      p_state: data.state,
      p_location: data.location,
      p_date: data.date,
      p_time: data.time,
      p_address: data.address ?? null,
      p_zip: data.zip ?? null,
      p_cutoff_time: data.cutoff_time ?? null,
      p_active: data.active ?? false,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return { success: false, error: `Failed: ${err}` };
  }

  const inserted = await res.json();
  return { success: true, id: inserted?.id ?? "" };
}
