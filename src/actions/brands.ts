import "server-only";

import { getAdminUser } from "@/lib/admin-permissions";
import { svcHeaders } from "@/lib/svc-headers";

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
 *
 * This is a plain async function (not a server action) so it can be called
 * from server components and server actions without the "use server" wrapper.
 * The BrandSelector client component receives the result as a prop.
 */
export async function listBrandsForAdmin(): Promise<BrandListItem[]> {
  const adminUser = await getAdminUser();
  if (!adminUser) return [];

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return [];

  if (adminUser.role === "platform_admin") {
    try {
      const res = await fetch(
        `${supabaseUrl}/rest/v1/brands?select=id,name,slug,logo_url&order=name`,
        { headers: svcHeaders(serviceKey), cache: "no-store" }
      );
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  if (adminUser.brand_ids.length === 0) return [];

  // Use PostgREST `in` filter. The brand_ids are UUIDs, so the quoting
  // pattern in the spec is safe; the inner quotes are required by PostgREST
  // for UUID literals.
  const filter = `id=in.(${adminUser.brand_ids
    .map((id) => `"${id}"`)
    .join(",")})`;
  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/brands?${filter}&select=id,name,slug,logo_url&order=name`,
      { headers: svcHeaders(serviceKey), cache: "no-store" }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}
