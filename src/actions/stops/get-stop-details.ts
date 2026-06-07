"use server";

import { getAdminUser } from "@/lib/admin-permissions";
import { pool } from "@/lib/db";

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
      /** admin_users.user_id of the caller, forwarded to RPCs that authorise via user_id lookup */
      callerUid: string;
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

  const useMockData = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true";

  if (useMockData) {
    return { success: false, error: "Stop not found" };
  }

  // 1. Stop + brand — legacy schema, raw SQL (the Drizzle stops table
  //    maps to the new schema which doesn't have city/state/date/etc).
  const stopRes = await pool.query<StopDetail & { brand_name: string; brand_slug: string }>(
    `SELECT s.*, b.name AS brand_name, b.slug AS brand_slug
       FROM stops s
       LEFT JOIN brands b ON b.id = s.brand_id
      WHERE s.id = $1
      LIMIT 1`,
    [stopId],
  );
  const stopRow = stopRes.rows[0];
  if (!stopRow) {
    return { success: false, error: "Stop not found" };
  }
  const stop: StopDetail = {
    ...stopRow,
    brands: stopRow.brand_name
      ? { name: stopRow.brand_name, slug: stopRow.brand_slug }
      : null,
  };

  // Brand-scope check for brand_admin
  if (adminUser.brand_id && stop.brand_id !== adminUser.brand_id) {
    return { success: false, error: "Not authorized for this brand" };
  }

  // 2. Candidate products for this brand
  const { rows: allProducts } = await pool.query<{ id: string; name: string; type: string; price: number }>(
    `SELECT id, name, type, price
       FROM products
      WHERE brand_id = $1 AND active = true`,
    [stop.brand_id],
  );

  // 3. Assigned products (joined with product info)
  const { rows: productStops } = await pool.query<AssignedProduct>(
    `SELECT ps.id, ps.product_id,
            json_build_object('id', p.id, 'name', p.name, 'type', p.type, 'price', p.price) AS products
       FROM product_stops ps
       LEFT JOIN products p ON p.id = ps.product_id
      WHERE ps.stop_id = $1`,
    [stopId],
  );

  // 4. Brands for the brand switcher
  const { rows: brands } = await pool.query<{ id: string; name: string; slug: string }>(
    `SELECT id, name, slug FROM brands ORDER BY name`,
  );

  return {
    success: true,
    stop,
    allProducts: allProducts ?? [],
    assignedProducts: (productStops ?? []) as AssignedProduct[],
    brands: brands ?? [],
    callerUid: adminUser.user_id,
  };
}
