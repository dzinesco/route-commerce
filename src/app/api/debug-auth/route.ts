import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();
  const rcAuthUid = cookieStore.get("rc_auth_uid")?.value;
  const rcUid = cookieStore.get("rc_uid")?.value;
  const rcAccessToken = cookieStore.get("rc_access_token")?.value;

  let adminUsersStatus = "not_tried";
  let adminUsersResult: string | null = null;

  if (rcAuthUid) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (supabaseUrl && serviceKey) {
      try {
        const res = await fetch(
          `${supabaseUrl}/rest/v1/admin_users?user_id=eq.${rcAuthUid}&limit=1`,
          { headers: { apikey: serviceKey, "Content-Type": "application/json" } }
        );
        adminUsersStatus = String(res.status);
        const data = await res.json().catch(() => null);
        adminUsersResult = JSON.stringify(data);
      } catch (e) {
        adminUsersStatus = "error: " + (e instanceof Error ? e.message : String(e));
      }
    } else {
      adminUsersStatus = "missing_env_vars";
    }
  } else {
    adminUsersStatus = "no_rc_auth_uid_cookie";
  }

  return NextResponse.json({
    cookies: {
      rc_auth_uid: rcAuthUid ? `${rcAuthUid.slice(0, 10)}...` : null,
      rc_uid: rcUid ? `${rcUid.slice(0, 10)}...` : null,
      rc_access_token: rcAccessToken ? "present" : null,
      all_cookie_names: allCookies.map(c => c.name),
    },
    admin_users: {
      status: adminUsersStatus,
      result: adminUsersResult,
    },
  });
}