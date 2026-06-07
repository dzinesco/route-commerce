import "server-only";

import { getAdminUser } from "@/lib/admin-permissions";
import { pool } from "@/lib/db";

export type BrandListItem = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
};

/**
 * Returns the list of brands the current admin user can act in.
 *
 * - platform_admin: all brands (queried directly from the `brands` table)
 * - everyone else: brands in `adminUser.brand_ids`
 * - empty array for unauthenticated / no-access admins
 */
export async function listBrandsForAdmin(): Promise<BrandListItem[]> {
  const adminUser = await getAdminUser();
  if (!adminUser) return [];

  try {
    if (adminUser.role === "platform_admin") {
      const { rows } = await pool.query<BrandListItem>(
        `SELECT id, name, slug, logo_url FROM brands ORDER BY name`,
      );
      return rows;
    }

    if (adminUser.brand_ids.length === 0) return [];

    const { rows } = await pool.query<BrandListItem>(
      `SELECT id, name, slug, logo_url FROM brands
       WHERE id = ANY($1::uuid[])
       ORDER BY name`,
      [adminUser.brand_ids],
    );
    return rows;
  } catch {
    return [];
  }
}
