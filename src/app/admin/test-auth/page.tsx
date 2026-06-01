import { getAdminUser } from "@/lib/admin-permissions";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export default async function TestAuthPage() {
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();

  let adminUser = null;
  let error: string | null = null;

  try {
    adminUser = await getAdminUser();
  } catch (e: unknown) {
    error = e instanceof Error ? e.message : String(e);
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-8 text-white">
      <h1 className="text-2xl font-bold mb-6 text-emerald-400">Auth Debug</h1>

      <div className="mb-6">
        <h2 className="text-xs font-semibold text-stone-400 uppercase mb-2">All Cookies ({allCookies.length})</h2>
        <pre className="bg-black/50 p-4 rounded-xl text-xs overflow-auto max-h-64">
          {allCookies.map(c => `${c.name}=${c.value.slice(0, 80)}${c.value.length > 80 ? "..." : ""}`).join("\n") || "(none)"}
        </pre>
      </div>

      <div className="mb-6">
        <h2 className="text-xs font-semibold text-stone-400 uppercase mb-2">rc_auth_uid</h2>
        <p className="text-lg font-mono">
          {allCookies.some(c => c.name === "rc_auth_uid")
            ? <span className="text-emerald-400">SET — {allCookies.find(c => c.name === "rc_auth_uid")?.value}</span>
            : <span className="text-red-400">NOT SET</span>
          }
        </p>
      </div>

      <div className="mb-6">
        <h2 className="text-xs font-semibold text-stone-400 uppercase mb-2">rc_access_token</h2>
        <p className="text-lg font-mono">
          {allCookies.some(c => c.name === "rc_access_token")
            ? <span className="text-yellow-400">SET (not needed)</span>
            : <span className="text-zinc-500">NOT SET (OK)</span>
          }
        </p>
      </div>

      <div className="mb-6">
        <h2 className="text-xs font-semibold text-stone-400 uppercase mb-2">getAdminUser() result</h2>
        {error ? (
          <div>
            <p className="text-red-400 font-bold">ERROR</p>
            <pre className="bg-red-950/50 p-4 rounded-xl text-sm mt-2">{error}</pre>
          </div>
        ) : adminUser ? (
          <div>
            <p className="text-emerald-400 font-bold">AUTHENTICATED</p>
            <pre className="bg-black/50 p-4 rounded-xl text-sm mt-2 overflow-auto">
              {JSON.stringify({
                id: adminUser.id,
                user_id: adminUser.user_id,
                role: adminUser.role,
                brand_id: adminUser.brand_id,
                active: adminUser.active,
              }, null, 2)}
            </pre>
          </div>
        ) : (
          <p className="text-red-400">NOT AUTHENTICATED — null returned</p>
        )}
      </div>

      <div className="mt-8 pt-4 border-t border-zinc-800">
        <h2 className="text-xs font-semibold text-stone-400 uppercase mb-2">Quick Actions</h2>
        <div className="flex gap-4">
          <a href="/admin" className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-500">
            Go to Admin
          </a>
          <form action="/api/logout" method="POST">
            <button type="submit" className="px-4 py-2 bg-zinc-800 text-white rounded-xl text-sm font-bold hover:bg-zinc-700">
              Logout
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}