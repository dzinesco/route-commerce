"use server";

import { getAdminUser } from "@/lib/admin-permissions";
import { createClient } from "@supabase/supabase-js";

export type StopDetail = {
  id: string;
  city: string;
  state: string;
  date: string;
  time: string;
  location: string;
  slug: string;
  active: boolean;
  brand_id: string;
  address: string | null;
  zip: string | null;
  cutoff_time: string | null;
  brands: { name: string; slug: string } | { name: string; slug: string }[] | null;
};

export type AssignedProduct = {
  id: string;
  product_id: string;
  products: { name: string; type: string; price: number } | null;
};

export type StopDetailsResult =
  | {
      success: true;
      stop: StopDetail;
      allProducts: { id: string; name: string; type: string; price: number }[];
      assignedProducts: AssignedProduct[];
      brands: { id: string; name: string; slug: string }[];
    }
  | { success: false; error: string };

/**
 * Fetch a single stop with its brand, all candidate products, currently
 * assigned products, and the list of brands (for the brand switcher in the
 * edit form). Mirrors the data the old `/admin/stops/[id]` page server
 * component loaded, so the modal can be a drop-in replacement.
 */
export async function getStopDetails(stopId: string): Promise<StopDetailsResult> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (!adminUser.can_manage_stops) {
    return { success: false, error: "Not authorized" };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const useMockData = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true";

  // Use a fresh server-side client (cookie-less) so RLS doesn't block reads
  // for platform_admin dev sessions. The auth check above has already gated
  // access.
  const server = useMockData
    ? null
    : createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

  // 1. Stop + brand
  let stop: StopDetail | null = null;
  let stopErr: string | null = null;

  if (server) {
    const { data, error } = await server
      .from("stops")
      .select("*, brands(name, slug)")
      .eq("id", stopId)
      .single();
    if (error) stopErr = error.message;
    else stop = (data ?? null) as StopDetail | null;
  } else {
    // Mock fallback — empty
    stopErr = "Stop not found";
  }

  if (!stop) {
    return { success: false, error: stopErr ?? "Stop not found" };
  }

  // Brand-scope check for brand_admin
  if (adminUser.brand_id && stop.brand_id !== adminUser.brand_id) {
    return { success: false, error: "Not authorized for this brand" };
  }

  // 2. Candidate products for this brand
  const { data: allProducts } = server
    ? await server
        .from("products")
        .select("id, name, type, price")
        .eq("brand_id", stop.brand_id)
        .eq("active", true)
    : { data: [] as { id: string; name: string; type: string; price: number }[] };

  // 3. Assigned products (joined with product info)
  const { data: productStops } = server
    ? await server
        .from("product_stops")
        .select("id, product_id, products(id, name, type, price)")
        .eq("stop_id", stopId)
    : { data: [] as AssignedProduct[] };

  // 4. Brands for the brand switcher
  const { data: brands } = server
    ? await server.from("brands").select("id, name, slug")
    : { data: [] as { id: string; name: string; slug: string }[] };

  return {
    success: true,
    stop,
    allProducts: allProducts ?? [],
    assignedProducts: (productStops ?? []) as AssignedProduct[],
    brands: brands ?? [],
  };
}
