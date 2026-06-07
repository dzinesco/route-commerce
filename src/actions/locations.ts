"use server";

import { revalidateTag } from "next/cache";
import { getAdminUser } from "@/lib/admin-permissions";
import { getActiveBrandId } from "@/lib/brand-scope";
import { pool } from "@/lib/db";

export type LocationInput = {
  name: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  phone?: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
  notes?: string | null;
  active?: boolean;
};

export type Location = {
  id: string;
  brand_id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  contact_name: string | null;
  contact_email: string | null;
  notes: string | null;
  active: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  slug: string | null;
};

export type LocationWithCount = Location & { stop_count: number };

// ── Create (single) ──────────────────────────────────────────────────────────
export async function createLocation(
  brandId: string,
  input: LocationInput
): Promise<{ success: true; id: string; slug: string } | { success: false; error: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (!adminUser.can_manage_stops) {
    return { success: false, error: "Not authorized to manage locations" };
  }
  const activeBrandId = await getActiveBrandId(adminUser, brandId);
  if (!activeBrandId && adminUser.role !== "platform_admin") {
    return { success: false, error: "Brand access required" };
  }
  const effectiveBrandId = activeBrandId;
  if (!effectiveBrandId) return { success: false, error: "No brand selected" };

  try {
    const { rows } = await pool.query<{ id: string; slug: string }>(
      `SELECT * FROM admin_create_location(
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
       )`,
      [
        effectiveBrandId,
        input.name,
        input.address ?? null,
        input.city ?? null,
        input.state ?? null,
        input.zip ?? null,
        input.phone ?? null,
        input.contact_name ?? null,
        input.contact_email ?? null,
        input.notes ?? null,
      ],
    );
    const data = rows[0];
    if (!data) {
      return { success: false, error: "Insert failed" };
    }
    revalidateTag("locations", "default");
    revalidateTag(`brand:${effectiveBrandId}:locations`, "default");
    return { success: true, id: data.id, slug: data.slug };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Insert failed",
    };
  }
}

// ── Create (batch) ───────────────────────────────────────────────────────────
export async function createLocationsBatch(
  brandId: string,
  locations: LocationInput[]
): Promise<{ success: boolean; created: number; error?: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, created: 0, error: "Not authenticated" };
  if (!adminUser.can_manage_stops) {
    return { success: false, created: 0, error: "Not authorized" };
  }
  const activeBrandId = await getActiveBrandId(adminUser, brandId);
  if (!activeBrandId && adminUser.role !== "platform_admin") {
    return { success: false, created: 0, error: "Brand access required" };
  }
  const effectiveBrandId = activeBrandId;
  if (!effectiveBrandId) return { success: false, created: 0, error: "No brand selected" };

  let inserted: { id?: string }[] = [];
  try {
    const { rows } = await pool.query<{ id?: string }>(
      "SELECT * FROM admin_create_locations_batch($1, $2::jsonb)",
      [effectiveBrandId, JSON.stringify(locations)],
    );
    inserted = rows;
  } catch (err) {
    return {
      success: false,
      created: 0,
      error: err instanceof Error ? err.message : "Insert failed",
    };
  }

  revalidateTag("locations", "default");
  revalidateTag(`brand:${effectiveBrandId}:locations`, "default");
  return {
    success: true,
    created: Array.isArray(inserted) ? inserted.length : locations.length,
  };
}

// ── Update (partial) ─────────────────────────────────────────────────────────
export async function updateLocation(
  locationId: string,
  brandId: string,
  updates: Partial<LocationInput>
): Promise<{ success: boolean; error?: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (!adminUser.can_manage_stops) return { success: false, error: "Not authorized" };

  let data: { success?: boolean; error?: string } = {};
  try {
    const { rows } = await pool.query<{ success?: boolean; error?: string }>(
      "SELECT * FROM admin_update_location($1, $2, $3::jsonb)",
      [locationId, brandId, JSON.stringify(updates)],
    );
    data = rows[0] ?? {};
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Update failed",
    };
  }

  if (!data.success) {
    return { success: false, error: data.error ?? "Update failed" };
  }

  revalidateTag("locations", "default");
  revalidateTag(`brand:${brandId}:locations`, "default");
  return { success: true };
}

// ── Delete (soft) ────────────────────────────────────────────────────────────
export async function deleteLocation(
  locationId: string,
  brandId: string
): Promise<{ success: boolean; error?: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (!adminUser.can_manage_stops) return { success: false, error: "Not authorized" };

  let data: { success?: boolean; error?: string } = {};
  try {
    const { rows } = await pool.query<{ success?: boolean; error?: string }>(
      "SELECT * FROM admin_delete_location($1, $2)",
      [locationId, brandId],
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

  revalidateTag("locations", "default");
  revalidateTag(`brand:${brandId}:locations`, "default");
  return { success: true };
}

// ── Read (admin, by brand_id) ────────────────────────────────────────────────
export async function adminListLocations(
  brandId: string
): Promise<LocationWithCount[]> {
  const adminUser = await getAdminUser();
  if (!adminUser) return [];

  const activeBrandId = await getActiveBrandId(adminUser, brandId);
  const effectiveBrandId = activeBrandId;

  try {
    const { rows } = await pool.query<LocationWithCount>(
      "SELECT * FROM admin_list_locations($1)",
      [effectiveBrandId],
    );
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

// ── Read (public, by brand slug) ─────────────────────────────────────────────
export type PublicLocation = Pick<
  Location,
  "id" | "name" | "address" | "city" | "state" | "zip" | "phone" | "slug"
> & { stop_count: number };

export async function getPublicLocationsForBrand(
  brandSlug: string
): Promise<PublicLocation[]> {
  if (!brandSlug) return [];

  try {
    const { rows } = await pool.query<PublicLocation>(
      "SELECT * FROM get_locations_for_brand($1)",
      [brandSlug],
    );
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

// ── Attach a stop to a location ──────────────────────────────────────────────
export async function attachStopToLocation(
  stopId: string,
  locationId: string,
  brandId: string
): Promise<{ success: boolean; error?: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (!adminUser.can_manage_stops) return { success: false, error: "Not authorized" };

  let data: { success?: boolean; error?: string } = {};
  try {
    const { rows } = await pool.query<{ success?: boolean; error?: string }>(
      "SELECT * FROM admin_attach_location_to_stop($1, $2, $3)",
      [stopId, locationId, brandId],
    );
    data = rows[0] ?? {};
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Attach failed",
    };
  }

  if (!data.success) {
    return { success: false, error: data.error ?? "Attach failed" };
  }

  revalidateTag("stops", "default");
  revalidateTag("locations", "default");
  revalidateTag(`brand:${brandId}:stops`, "default");
  revalidateTag(`brand:${brandId}:locations`, "default");
  return { success: true };
}
