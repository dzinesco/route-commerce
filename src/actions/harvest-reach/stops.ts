"use server";

import { getAdminUser } from "@/lib/admin-permissions";
import { svcHeaders } from "@/lib/svc-headers";

export type StopOption = {
  id: string;
  city: string;
  state: string;
  date: string;
  time: string;
  location: string;
  zip: string;
  is_upcoming: boolean;
  is_past: boolean;
};

export async function getStopsForSegmentPicker(
  brandId: string,
  stopId?: string
): Promise<StopOption[]> {
  const adminUser = await getAdminUser();
  if (!adminUser) return [];
  if (adminUser.role === "brand_admin" && adminUser.brand_id !== brandId) return [];

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/get_stops_for_segment_picker`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({
        p_brand_id: brandId,
        p_stop_id: stopId ?? null,
      }),
    }
  );

  if (!response.ok) return [];
  return (await response.json()) as StopOption[];
}