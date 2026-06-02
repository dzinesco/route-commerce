import StopTableClient from "@/components/admin/StopTableClient";
import StopsHeaderActions from "@/components/admin/StopsHeaderActions";
import { supabase } from "@/lib/supabase";
import { getAdminUser } from "@/lib/admin-permissions";
import AdminAccessDenied from "@/components/admin/AdminAccessDenied";
import { PageHeader } from "@/components/admin/design-system";
import { redirect } from "next/navigation";

const StopIcon = () => (
  <svg className="h-5 w-5 sm:h-6 sm:w-6 text-current" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
);

export default async function AdminStopsPage() {
  const adminUser = await getAdminUser();

  if (!adminUser) return <AdminAccessDenied />;

  if (!adminUser.can_manage_stops) {
    redirect("/admin/pickup");
  }

  let query = supabase
    .from("stops")
    .select(`
      id,
      city,
      state,
      date,
      time,
      location,
      active,
      deleted_at,
      brand_id,
      address,
      zip,
      cutoff_time,
      status,
      brands (
        name
      )
    `)
    .is("deleted_at", null)
    .order("date", { ascending: true });

  if (adminUser?.brand_id) {
    query = query.eq("brand_id", adminUser.brand_id);
  }

  const { data: stops, error } = await query;

  if (error) {
    return (
      <main className="min-h-screen bg-[var(--admin-bg)]">
        <div className="px-4 sm:px-6 md:px-8 py-6 sm:py-8">
          <div className="max-w-6xl mx-auto">
            <nav className="flex items-center gap-2 text-xs sm:text-sm mb-6">
              <a href="/admin" className="text-[var(--admin-text-muted)] hover:text-[var(--admin-text-secondary)]">Admin</a>
              <span className="text-[var(--admin-text-muted)]">/</span>
              <span className="text-[var(--admin-text-primary)] font-medium">Stops & Routes</span>
            </nav>
            <h1 className="text-2xl sm:text-3xl font-black text-red-600 tracking-tight">
              Error loading stops
            </h1>
            <pre className="mt-4 rounded-xl bg-white border border-[var(--admin-border)] p-4 text-sm text-[var(--admin-text-secondary)]">
              {error.message}
            </pre>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--admin-bg)]">
      <div className="px-4 sm:px-6 md:px-8 py-6 sm:py-8">
        <PageHeader
          breadcrumb={[
            { label: "Admin", href: "/admin" },
            { label: "Stops & Routes" }
          ]}
          icon={<StopIcon />}
          title="Stops & Routes"
          subtitle={adminUser?.brand_id ? "Managing stops for your brand." : "Manage routes, pickup locations, dates, and cutoff times."}
          actions={<StopsHeaderActions brandId={adminUser?.brand_id ?? ""} />}
        />
      </div>

      {/* Content */}
      <div className="px-4 sm:px-6 md:px-8 py-4 sm:py-6">
        <div className="overflow-hidden rounded-2xl border border-[var(--admin-border)] bg-white shadow-sm">
          <StopTableClient stops={stops ?? []} />
        </div>
      </div>
    </main>
  );
}