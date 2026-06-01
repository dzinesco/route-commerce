import { getAdminUser } from "@/lib/admin-permissions";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export default async function TestPage() {
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();
  let adminUser = null;
  let adminUserError: string | null = null;

  try {
    adminUser = await getAdminUser();
  } catch (e: any) {
    adminUserError = e?.message ?? String(e);
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-8 text-white">
      <h1 className="text-2xl font-bold mb-6 text-emerald-400">Auth Debug</h1>

      <div className="mb-6">
        <h2 className="text-xs font-semibold text-stone-400 uppercase mb-2">Server cookies ({allCookies.length})</h2>
        <pre className="bg-black/50 p-4 rounded-xl text-xs overflow-auto max-h-64">
          {allCookies.map(c => `${c.name}=${c.value.slice(0, 80)}...`).join("\n") || "(none)"}
        </pre>
      </div>

      <div className="mb-6">
        <h2 className="text-xs font-semibold text-stone-400 uppercase mb-2">rc_access_token present?</h2>
        <p className="text-lg font-mono">
          {allCookies.some(c => c.name === "rc_access_token")
            ? <span className="text-emerald-400">YES — {allCookies.find(c => c.name === "rc_access_token")?.value.length} chars</span>
            : <span className="text-red-400">NO</span>
          }
        </p>
      </div>

      <div>
        <h2 className="text-xs font-semibold text-stone-400 uppercase mb-2">getAdminUser() result</h2>
        {adminUserError ? (
          <p className="text-red-400">ERROR: {adminUserError}</p>
        ) : (
          <pre className="bg-black/50 p-4 rounded-xl text-sm overflow-auto">
            {JSON.stringify(adminUser, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}