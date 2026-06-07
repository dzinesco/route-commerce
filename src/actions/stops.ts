"use server";

import { revalidateTag } from "next/cache";
import { getAdminUser } from "@/lib/admin-permissions";
import { getActiveBrandId } from "@/lib/brand-scope";
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

  const activeBrandId = await getActiveBrandId(adminUser, brandId);
  if (!activeBrandId && adminUser.role !== "platform_admin") {
    return { success: false, created: 0, error: "Brand access required" };
  }
  const effectiveBrandId = activeBrandId;
  if (!effectiveBrandId) {
    return { success: false, created: 0, error: "No brand selected" };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  // Use anon key — admin_create_stops_batch is SECURITY DEFINER so RLS is
  // bypassed. This fixes the prior 42501 RLS violation that came from doing
  // direct REST inserts against the RLS-blocked `stops` table.
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const rows = stops.map((s) => ({
    city: s.city,
    state: s.state,
    location: s.location,
    date: s.date || "",
    time: s.time || "",
    address: s.address || null,
    zip: s.zip || null,
    cutoff_time: null,
    active: false,
  }));

  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/admin_create_stops_batch`, {
    method: "POST",
    headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
    body: JSON.stringify({ p_brand_id: effectiveBrandId, p_stops: rows }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Request failed" }));
    return { success: false, created: 0, error: (err as { message?: string }).message ?? "Insert failed" };
  }

  revalidateTag("stops", "default");
  revalidateTag(`brand:${effectiveBrandId}:stops`, "default");

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

  revalidateTag("stops", "default");
  revalidateTag(`brand:${brandId}:stops`, "default");

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
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) return [];

  // Get all active stops with their brand slug.
  // Wrapped in try/catch so a build-time outage (ECONNREFUSED) doesn't
  // crash the prerender — the sitemap just renders without stop URLs.
  try {
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
  } catch {
    return [];
  }
}

/**
 * Fetch active stops for a brand by slug.
 * Public action used by the storefront stop pages (e.g. /tuxedo/stops,
 * /indian-river-direct/stops) — replaces the previous client-side
 * `supabase.from("stops")` query so supabase-js no longer ships to
 * the browser for those routes.
 *
 * Cached at the edge for 5 minutes; invalidated by `revalidateTag('stops')`
 * from any stop mutation (see createStopsBatch, publishStop, etc.).
 */
export type PublicStop = {
  id: string;
  city: string;
  state: string;
  date: string;
  time: string;
  location: string;
  address: string | null;
  slug: string;
  cutoff_time: string | null;
};

export async function getPublicStopsForBrand(
  brandSlug: string
): Promise<PublicStop[]> {
  if (!brandSlug) return [];

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) return [];

  // Wrapped in try/catch so a build-time Supabase outage (ECONNREFUSED)
  // doesn't crash the prerender — the page just renders with no stops
  // and revalidates from a real request once the cache is warm.
  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/rpc/get_public_stops_for_brand`,
      {
        method: "POST",
        headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
        body: JSON.stringify({ p_brand_slug: brandSlug }),
        next: {
          revalidate: 300,
          tags: ["stops", `brand:${brandSlug}:stops`],
        },
      }
    );

    if (!response.ok) return [];

    const stops = await response.json();
    return Array.isArray(stops) ? (stops as PublicStop[]) : [];
  } catch {
    return [];
  }
}