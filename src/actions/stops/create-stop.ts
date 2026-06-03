"use server";

import { revalidateTag } from "next/cache";
import { getAdminUser } from "@/lib/admin-permissions";
import { svcHeaders } from "@/lib/svc-headers";
import { getMockTableData } from "@/lib/mock-data";

const useMockData = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true";

export type CreateStopResult =
  | { success: true; id: string }
  | { success: false; error: string };

export async function createStop(
  brandId: string,
  data: {
    city: string;
    state: string;
    location: string;
    date: string;
    time: string;
    address?: string | null;
    zip?: string | null;
    cutoff_time?: string | null;
    active?: boolean;
  }
): Promise<CreateStopResult> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (!adminUser.can_manage_stops) return { success: false, error: "Not authorized" };

  if (adminUser.role === "brand_admin" && adminUser.brand_id !== brandId) {
    return { success: false, error: "Not authorized for this brand" };
  }

  if (useMockData) {
    const mockStops = getMockTableData("stops") as Array<{ id: string }>;
    return { success: true, id: `mock-stop-${Date.now()}` };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  // Preferred path: anon key + SECURITY DEFINER RPC (bypasses RLS, works even if
  // service role key is absent at runtime). See:
  //   supabase/migrations/202_fix_admin_create_stop.sql
  //   scripts/apply-admin-create-stop.js   (run this locally with the keys you have)
  //   supabase/ADMIN_CREATE_STOP_FIX.sql   (exact prompt SQL for SQL editor)
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/admin_create_stop`, {
    method: "POST",
    headers: { ...svcHeaders(anonKey), "Content-Type": "application/json" },
    body: JSON.stringify({
      p_active: data.active ?? false,
      p_address: data.address || null,
      p_brand_id: brandId,
      p_city: data.city,
      p_cutoff_time: data.cutoff_time || null,
      p_date: data.date,
      p_location: data.location,
      p_state: data.state,
      p_time: data.time,
      p_zip: data.zip || null,
    }),
  });

  let usedFallback = false;

  if (!res.ok) {
    const errText = await res.text();
    const lower = errText.toLowerCase();
    const looksLikeMissingFn =
      lower.includes("pgrst202") ||
      lower.includes("admin_create_stop") ||
      lower.includes("could not find the function") ||
      lower.includes("function not found");

    if (looksLikeMissingFn) {
      usedFallback = true;
    } else {
      return { success: false, error: `Failed: ${errText}` };
    }
  } else {
    const inserted = await res.json().catch(() => ({} as any));
    if (inserted && inserted.success === false) {
      // Our RPC returns structured errors as 200 + {success:false}
      const errMsg = inserted.error || "Failed to create stop";
      const lower = errMsg.toLowerCase();
      if (lower.includes("function") || lower.includes("not found") || lower.includes("pgrst")) {
        usedFallback = true;
      } else {
        return { success: false, error: errMsg };
      }
    } else {
      // Happy path from RPC (either old {id,slug} or new {success, stop_id})
      const stopId = inserted?.stop_id || inserted?.id || "";
      const effectiveBrandId = brandId || adminUser.brand_id;
      if (effectiveBrandId) {
        revalidateTag("stops", "default");
        revalidateTag(`brand:${effectiveBrandId}:stops`, "default");
      }
      return { success: true, id: stopId };
    }
  }

  if (usedFallback) {
    // We cannot bypass the block_stops_mutations RLS policy via REST even with the service key.
    // The only reliable path is the SECURITY DEFINER RPC created by migration 202.
    // Tell the user exactly how to install it using only the keys they already have.
    return {
      success: false,
      error:
        "The admin_create_stop database function is missing (this is why Add New Stop fails with function not found).\n\n" +
        "Fix using only the keys in your .env.local (no Supabase dashboard needed):\n" +
        "  1. On a machine that can reach your database (normal laptop usually works):\n" +
        "       node scripts/apply-admin-create-stop.js\n" +
        "  2. Or: npm run migrate:one 202\n" +
        "  3. Or apply supabase/migrations/202_fix_admin_create_stop.sql via psql / Supabase CLI with --db-url.\n\n" +
        "After it succeeds, restart your dev server and Add New Stop will work.",
    };
  }

  // Should not reach here
  return { success: false, error: "Unexpected state creating stop" };
}
