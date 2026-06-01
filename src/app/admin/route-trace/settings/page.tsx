import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/admin-permissions";
import { isFeatureEnabled } from "@/lib/feature-flags";
import RouteTraceNav from "@/components/route-trace/RouteTraceNav";

export default async function RouteTraceSettingsPage() {
  const adminUser = await getAdminUser();
  if (!adminUser) redirect("/login");

  const effectiveBrandId = adminUser.brand_id ?? "64294306-5f42-463d-a5e8-2ad6c81a96de";

  const enabled = await isFeatureEnabled(effectiveBrandId, "route_trace");
  if (!enabled) redirect("/admin/settings/apps?reason=route_trace");

  return (
    <div className="min-h-screen bg-zinc-950 px-6 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-zinc-100">Route Trace Settings</h1>
          <p className="mt-1 text-sm text-zinc-500">Configure your traceability workflow and defaults</p>
        </div>
        <RouteTraceNav activeTab="settings" />
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 shadow-black/20 p-6">
          <p className="text-sm text-zinc-500">Settings coming soon. For now, use the Add-ons page to manage Route Trace.</p>
          <a
            href="/admin/settings/apps"
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-stone-800 transition-colors"
          >
            → Manage Add-ons
          </a>
        </div>
      </div>
    </div>
  );
}