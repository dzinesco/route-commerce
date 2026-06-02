import WaterLogAdminPanel from "@/components/admin/WaterLogAdminPanel";
import { getAdminUser } from "@/lib/admin-permissions";
import { getWaterIrrigators, getWaterHeadgatesAdmin, getWaterEntries } from "@/actions/water-log/admin";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/admin/design-system";

const TUXEDO_BRAND_ID = "64294306-5f42-463d-a5e8-2ad6c81a96de";

export const dynamic = "force-dynamic";

// ── Skeleton Loading ──────────────────────────────────────────────────────────
function WaterLogLoadingSkeleton() {
  return (
    <div className="space-y-6 px-6 pb-8">
      {/* Navigation skeleton */}
      <div className="flex gap-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-10 w-28 rounded-xl bg-slate-200 animate-pulse" />
        ))}
      </div>

      {/* Summary skeleton */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 animate-pulse">
        <div className="flex items-start justify-between mb-4">
          <div className="h-5 w-32 bg-slate-200 rounded" />
          <div className="h-8 w-48 bg-slate-100 rounded" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="space-y-1">
              <div className="h-3 w-20 bg-slate-100 rounded" />
              <div className="h-6 w-16 bg-slate-200 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Table skeletons */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 animate-pulse">
        <div className="h-5 w-28 bg-slate-200 rounded mb-4" />
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-4 py-3 border-b border-slate-50 last:border-0">
              <div className="h-4 w-20 bg-slate-100 rounded" />
              <div className="h-4 w-16 bg-slate-100 rounded" />
              <div className="h-4 w-14 bg-slate-100 rounded ml-auto" />
              <div className="h-4 w-12 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default async function AdminWaterLogPage() {
  const adminUser = await getAdminUser();

  const isAuthorized =
    adminUser?.role === "platform_admin" ||
    (adminUser?.role === "brand_admin" &&
      adminUser?.brand_id === TUXEDO_BRAND_ID &&
      adminUser?.can_manage_water_log);

  if (!isAuthorized) {
    redirect("/admin/pickup");
  }

  const brandId = TUXEDO_BRAND_ID;

  const [users, headgates, entries] = await Promise.all([
    getWaterIrrigators(brandId),
    getWaterHeadgatesAdmin(brandId),
    getWaterEntries(brandId, 50),
  ]);

  return (
    <div className="min-h-screen bg-[var(--admin-bg)]">
      <PageHeader
        title="Water Log"
        subtitle="PIN-based access · Tuxedo only · separate from site admin"
        className="px-6 pt-6"
      />
      <div className="px-6 pb-8">
        <WaterLogAdminPanel
          initialUsers={users}
          initialHeadgates={headgates}
          initialEntries={entries}
          brandId={brandId}
          canManage={isAuthorized}
        />
      </div>
    </div>
  );
}