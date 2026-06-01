import { supabase } from "@/lib/supabase";
import { getAdminUser } from "@/lib/admin-permissions";
import AdminAccessDenied from "@/components/admin/AdminAccessDenied";
import ReportsDashboard from "@/components/admin/ReportsDashboard";
import { redirect } from "next/navigation";

export default async function ReportsPage() {
  const adminUser = await getAdminUser();
  if (!adminUser) return <AdminAccessDenied />;
  if (!adminUser.can_manage_reports) redirect("/admin/pickup");

  const isPlatformAdmin = adminUser.role === "platform_admin";

  const { data: brands } = await supabase
    .from("brands")
    .select("id, name")
    .order("name");

  const initialBrandId = isPlatformAdmin
    ? null
    : adminUser.brand_id ?? null;

  return (
    <main className="min-h-screen bg-stone-100 px-6 py-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-stone-950">Reports</h1>
          <p className="mt-1 text-sm text-stone-500">
            Operational visibility across orders, fulfillment, contacts, and campaigns.
          </p>
        </div>

        <ReportsDashboard
          brands={brands ?? []}
          initialBrandId={initialBrandId}
          isPlatformAdmin={isPlatformAdmin}
          brandId={adminUser.brand_id}
        />
      </div>
    </main>
  );
}