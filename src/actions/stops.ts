"use server";

import { getAdminUser } from "@/lib/admin-permissions";
import { svcHeaders } from "@/lib/svc-headers";

export type StopImportRow = {
  city: string;
  state: string;
  location: string;
  date: string;
  time: string;
  address?: string;
  zip?: string;
  notes?: string;
};

export async function createStopsBatch(
  brandId: string,
  stops: StopImportRow[]
): Promise<{ success: boolean; created: number; error?: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, created: 0, error: "Not authenticated" };
  if (!adminUser.can_manage_stops) {
    return { success: false, created: 0, error: "Not authorized to manage stops" };
  }

  const effectiveBrandId = brandId || adminUser.brand_id;
  if (!effectiveBrandId) {
    return { success: false, created: 0, error: "No brand selected" };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const rows = stops.map((s) => {
    const slug = `${s.city.toLowerCase().replace(/\s+/g, "-")}-${s.date || new Date().toISOString().slice(0, 10)}`;
    return {
      city: s.city,
      state: s.state,
      location: s.location,
      date: s.date || "",
      time: s.time || "",
      address: s.address || null,
      zip: s.zip || null,
      brand_id: effectiveBrandId,
      slug,
      status: "draft",
      active: false,
    };
  });

  const res = await fetch(`${supabaseUrl}/rest/v1/stops`, {
    method: "POST",
    headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify(rows),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Request failed" }));
    return { success: false, created: 0, error: (err as { message?: string }).message ?? "Insert failed" };
  }

  const inserted = await res.json();
  return { success: true, created: Array.isArray(inserted) ? inserted.length : stops.length };
}

export async function publishStop(
  stopId: string,
  brandId: string
): Promise<{ success: boolean; error?: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (!adminUser.can_manage_stops) return { success: false, error: "Not authorized" };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const res = await fetch(`${supabaseUrl}/rest/v1/stops?id=eq.${stopId}`, {
    method: "PATCH",
    headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
    body: JSON.stringify({ status: "active", active: true }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Patch failed" }));
    return { success: false, error: (err as { message?: string }).message ?? "Publish failed" };
  }

  return { success: true };
}

/**
 * Fetch active stops for sitemap generation.
 * This is a public function that doesn't require authentication.
 */
export type StopForSitemap = {
  slug: string;
  brand_slug: string;
  last_modified: string;
};

export async function getActiveStopsForSitemap(): Promise<StopForSitemap[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // Get all active stops with their brand slug
  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/get_active_stops_with_brand`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
    }
  );

  if (!response.ok) return [];

  const stops = await response.json();
  return Array.isArray(stops) ? stops : [];
}