"use server";

import { revalidateTag } from "next/cache";
import { getAdminUser } from "@/lib/admin-permissions";
import { getActiveBrandId } from "@/lib/brand-scope";
import { pool } from "@/lib/db";

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

  // `admin_create_stops_batch` is SECURITY DEFINER — bypasses RLS, so we
  // can call it as the app's DB role.
  let inserted: { id?: string }[] = [];
  try {
    const { rows: rpcRows } = await pool.query<{ id?: string }>(
      "SELECT * FROM admin_create_stops_batch($1, $2::jsonb)",
      [effectiveBrandId, JSON.stringify(rows)],
    );
    inserted = rpcRows;
  } catch (err) {
    return {
      success: false,
      created: 0,
      error: err instanceof Error ? err.message : "Insert failed",
    };
  }

  revalidateTag("stops", "default");
  revalidateTag(`brand:${effectiveBrandId}:stops`, "default");

  return {
    success: true,
    created: Array.isArray(inserted) ? inserted.length : stops.length,
  };
}

export async function publishStop(
  stopId: string,
  brandId: string
): Promise<{ success: boolean; error?: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (!adminUser.can_manage_stops) return { success: false, error: "Not authorized" };

  // Direct update via raw SQL — the stops table lives in the legacy
  // schema (city/state/date/active), so Drizzle's new-schema stops
  // table doesn't have the columns we'd need to set.
  try {
    const { rowCount } = await pool.query(
      "UPDATE stops SET status = 'active', active = true WHERE id = $1",
      [stopId],
    );
    if (!rowCount) {
      return { success: false, error: "Stop not found" };
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Publish failed",
    };
  }

  revalidateTag("stops", "default");
  revalidateTag(`brand:${brandId}:stops`, "default");

  return { success: true };
}

/**
 * Soft-delete a stop via the `delete_stop` SECURITY DEFINER RPC. Guards
 * against deleting a stop that has open (non-pickup) orders.
 */
export async function deleteStop(
  stopId: string,
  brandId: string
): Promise<{ success: boolean; error?: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (!adminUser.can_manage_stops) return { success: false, error: "Not authorized" };

  let data: { success?: boolean; error?: string } = {};
  try {
    const { rows } = await pool.query<{ success?: boolean; error?: string }>(
      "SELECT * FROM delete_stop($1, $2)",
      [stopId, brandId],
    );
    data = rows[0] ?? {};
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Delete failed",
    };
  }

  if (!data.success) {
    return { success: false, error: data.error ?? "Delete failed" };
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
  // Wrapped in try/catch so a build-time outage (ECONNREFUSED) doesn't
  // crash the prerender — the sitemap just renders without stop URLs.
  try {
    const { rows } = await pool.query<StopForSitemap>(
      "SELECT * FROM get_active_stops_with_brand()",
    );
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

/**
 * Fetch active stops for a brand by slug.
 * Public action used by the storefront stop pages (e.g. /tuxedo/stops,
 * /indian-river-direct/stops).
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

  // Wrapped in try/catch so a build-time DB outage (ECONNREFUSED) doesn't
  // crash the prerender — the page just renders with no stops and
  // revalidates from a real request once the cache is warm.
  try {
    const { rows } = await pool.query<PublicStop>(
      "SELECT * FROM get_public_stops_for_brand($1)",
      [brandSlug],
    );
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}
