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
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const slug = `${data.city.toLowerCase().replace(/\s+/g, "-")}-${data.date || new Date().toISOString().slice(0, 10)}`;

  const res = await fetch(`${supabaseUrl}/rest/v1/stops`, {
    method: "POST",
    headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({
      city: data.city,
      state: data.state,
      location: data.location,
      date: data.date,
      time: data.time,
      slug,
      brand_id: brandId,
      active: data.active ?? false,
      address: data.address ?? null,
      zip: data.zip ?? null,
      cutoff_time: data.cutoff_time ?? null,
      status: "draft",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return { success: false, error: `Failed: ${err}` };
  }

  const inserted = await res.json();
  return { success: true, id: inserted[0]?.id ?? "" };
}
