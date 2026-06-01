import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin-permissions";

export async function GET() {
  // Test the REST call directly from this endpoint
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const uid = "c023efb3-e3ef-4156-bed6-d17b92ea8aca";

  let restResult = null;
  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/admin_users?user_id=eq.${uid}&limit=1`,
      { headers: { apikey: serviceKey, "Content-Type": "application/json" } }
    );
    const data = await res.json().catch(() => null);
    restResult = { status: res.status, data, keyLen: serviceKey.length };
  } catch (e: any) {
    restResult = { error: e?.message };
  }

  const adminUser = await getAdminUser();
  return NextResponse.json({
    adminUser: adminUser ? {
      id: adminUser.id,
      user_id: adminUser.user_id,
      role: adminUser.role,
      brand_id: adminUser.brand_id,
      active: adminUser.active,
    } : null,
    restResult,
    supabaseUrl: supabaseUrl ? "SET" : "MISSING",
  });
}