"use server";

import { revalidateTag } from "next/cache";
import { getAdminUser } from "@/lib/admin-permissions";
import { getActiveBrandId } from "@/lib/brand-scope";
import { svcHeaders } from "@/lib/svc-headers";

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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const res = await fetch(
    `${supabaseUrl}/rest/v1/rpc/admin_create_location`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({
        p_brand_id: effectiveBrandId,
        p_name: input.name,
        p_address: input.address ?? null,
        p_city: input.city ?? null,
        p_state: input.state ?? null,
        p_zip: input.zip ?? null,
        p_phone: input.phone ?? null,
        p_contact_name: input.contact_name ?? null,
        p_contact_email: input.contact_email ?? null,
        p_notes: input.notes ?? null,
        p_active: input.active ?? true,
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Request failed" }));
    return { success: false, error: (err as { message?: string }).message ?? "Insert failed" };
  }

  const data = await res.json();
  revalidateTag("locations", "default");
  revalidateTag(`brand:${effectiveBrandId}:locations`, "default");
  return { success: true, id: data.id, slug: data.slug };
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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const res = await fetch(
    `${supabaseUrl}/rest/v1/rpc/admin_create_locations_batch`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({ p_brand_id: effectiveBrandId, p_locations: locations }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Request failed" }));
    return { success: false, created: 0, error: (err as { message?: string }).message ?? "Insert failed" };
  }

  const inserted = await res.json();
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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const res = await fetch(
    `${supabaseUrl}/rest/v1/rpc/admin_update_location`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({ p_location_id: locationId, p_brand_id: brandId, p_updates: updates }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Request failed" }));
    return { success: false, error: (err as { message?: string }).message ?? "Update failed" };
  }

  const data = await res.json();
  if (!data.success) return { success: false, error: data.error ?? "Update failed" };

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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const res = await fetch(
    `${supabaseUrl}/rest/v1/rpc/admin_delete_location`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({ p_location_id: locationId, p_brand_id: brandId }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Request failed" }));
    return { success: false, error: (err as { message?: string }).message ?? "Delete failed" };
  }

  const data = await res.json();
  if (!data.success) return { success: false, error: data.error ?? "Delete failed" };

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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // Application-layer brand scoping: platform_admin (brand_id: null) gets all
  // brands; everyone else gets only their own brand.
  const activeBrandId = await getActiveBrandId(adminUser, brandId);
  const effectiveBrandId = activeBrandId;

  const res = await fetch(
    `${supabaseUrl}/rest/v1/rpc/admin_list_locations`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({ p_brand_id: effectiveBrandId }),
      next: { revalidate: 60, tags: ["locations", `brand:${effectiveBrandId ?? "all"}:locations`] },
    }
  );

  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? (data as LocationWithCount[]) : [];
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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const res = await fetch(
    `${supabaseUrl}/rest/v1/rpc/get_locations_for_brand`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({ p_brand_slug: brandSlug }),
      next: { revalidate: 300, tags: ["locations", `brand:${brandSlug}:locations`] },
    }
  );

  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? (data as PublicLocation[]) : [];
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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const res = await fetch(
    `${supabaseUrl}/rest/v1/rpc/admin_attach_location_to_stop`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({
        p_stop_id: stopId,
        p_location_id: locationId,
        p_brand_id: brandId,
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Request failed" }));
    return { success: false, error: (err as { message?: string }).message ?? "Attach failed" };
  }

  const data = await res.json();
  if (!data.success) return { success: false, error: data.error ?? "Attach failed" };

  revalidateTag("stops", "default");
  revalidateTag("locations", "default");
  revalidateTag(`brand:${brandId}:stops`, "default");
  revalidateTag(`brand:${brandId}:locations`, "default");
  return { success: true };
}
