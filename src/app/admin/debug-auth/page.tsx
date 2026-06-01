import { cookies } from "next/headers";

export default async function DebugAuthPage() {
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

  return (
    <div className="min-h-screen bg-zinc-950 p-8 text-white">
      <h1 className="text-2xl font-bold text-emerald-400 mb-6">Auth Debug</h1>

      <div className="mb-6">
        <h2 className="text-xs font-semibold text-stone-400 uppercase mb-2">Cookies ({allCookies.length})</h2>
        <pre className="bg-black/50 p-4 rounded-xl text-xs overflow-auto max-h-64">
          {allCookies.map(c => `${c.name}=${c.value.slice(0, 80)}${c.value.length > 80 ? "..." : ""}`).join("\n") || "(none)"}
        </pre>
      </div>

      <div className="mb-6">
        <h2 className="text-xs font-semibold text-stone-400 uppercase mb-2">Key Cookies</h2>
        <p>rc_auth_uid: <span className={rcAuthUid ? "text-emerald-400" : "text-red-400"}>{rcAuthUid ? `${rcAuthUid.slice(0, 20)}...` : "NOT SET"}</span></p>
        <p>rc_uid: <span className={rcUid ? "text-emerald-400" : "text-red-400"}>{rcUid ? `${rcUid.slice(0, 20)}...` : "NOT SET"}</span></p>
        <p>rc_access_token: <span className={rcAccessToken ? "text-yellow-400" : "text-red-400"}>{rcAccessToken ? "PRESENT" : "NOT SET"}</span></p>
      </div>

      <div className="mb-6">
        <h2 className="text-xs font-semibold text-stone-400 uppercase mb-2">Admin Users Lookup</h2>
        <p>Status: <span className="text-lg font-mono">{adminUsersStatus}</span></p>
        <p>Result: <pre className="bg-black/50 p-4 rounded-xl text-xs overflow-auto mt-2">{adminUsersResult || "(none)"}</pre></p>
      </div>
    </div>
  );
}