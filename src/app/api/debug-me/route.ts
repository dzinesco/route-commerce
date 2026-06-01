import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = await cookies();
  const uid = cookieStore.get("rc_auth_uid")?.value ?? cookieStore.get("rc_uid")?.value;

  if (!uid) {
    return NextResponse.json({ error: "No uid cookie found" }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({
      uid,
      error: "Missing env vars",
      supabaseUrl: supabaseUrl ?? "MISSING",
      serviceKeyPresent: !!serviceKey,
    });
  }

  // Exact same lookup as getAdminUser
  const lookupRes = await fetch(
    `${supabaseUrl}/rest/v1/admin_users?user_id=eq.${uid}&limit=1`,
    { headers: { apikey: serviceKey, "Content-Type": "application/json" } }
  );

  let adminUsers: unknown[] = [];
  let lookupOk = lookupRes.ok;
  let lookupStatus = lookupRes.status;
  let lookupData: unknown = null;

  if (lookupRes.ok) {
    lookupData = await lookupRes.json().catch(() => []);
    adminUsers = Array.isArray(lookupData) ? lookupData : [];
  } else {
    lookupData = await lookupRes.text().catch(() => "unknown error");
  }

  if (adminUsers.length > 0) {
    return NextResponse.json({
      uid,
      result: "found",
      adminUser: adminUsers[0],
    });
  }

  // Try auto-create
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_REGEX.test(uid)) {
    return NextResponse.json({ uid, result: "invalid_uuid" });
  }

  const postRes = await fetch(`${supabaseUrl}/rest/v1/admin_users`, {
    method: "POST",
    headers: { apikey: serviceKey, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({
      user_id: uid, role: "platform_admin", brand_id: null, active: true,
      can_manage_products: true, can_manage_stops: true, can_manage_orders: true,
      can_manage_pickup: true, can_manage_messages: true, can_manage_refunds: true,
      can_manage_users: true, can_manage_water_log: true, can_manage_reports: true,
      can_manage_settings: true, must_change_password: false
    }),
  });

  return NextResponse.json({
    uid,
    result: "auto_created",
    lookupOk,
    lookupStatus,
    adminUsersFound: adminUsers.length,
    postStatus: postRes.status,
    postOk: postRes.ok,
    postData: postRes.ok ? await postRes.json().catch(() => null) : await postRes.text().catch(() => null),
  });
}
