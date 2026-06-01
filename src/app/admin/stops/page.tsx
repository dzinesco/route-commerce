import StopTableClient from "@/components/admin/StopTableClient";
import StopsHeaderActions from "@/components/admin/StopsHeaderActions";
import { supabase } from "@/lib/supabase";
import { getAdminUser } from "@/lib/admin-permissions";
import AdminAccessDenied from "@/components/admin/AdminAccessDenied";
import { redirect } from "next/navigation";

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
      <main className="min-h-screen px-6 py-10">
        <div className="mx-auto max-w-6xl">
          <nav className="flex items-center gap-2 text-xs text-stone-500 mb-6">
            <a href="/admin" className="hover:text-stone-600 transition-colors">Admin</a>
            <span>/</span>
            <span className="text-stone-600">Tour Stops</span>
          </nav>
          <h1 className="text-3xl font-bold text-red-600">
            Error loading stops
          </h1>
          <pre className="mt-4 rounded-xl bg-white border border-stone-200 p-4 text-sm text-stone-600">
            {error.message}
          </pre>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-6xl">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-stone-500 mb-6">
          <a href="/admin" className="hover:text-stone-600 transition-colors">Admin</a>
          <span>/</span>
          <span className="text-stone-600">Tour Stops</span>
        </nav>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-stone-950 tracking-tight">Tour Stops</h1>
            <p className="mt-2 text-sm text-stone-500">
              {adminUser?.brand_id
                ? "Managing stops for your brand."
                : "Manage routes, pickup locations, dates, and cutoff times."}
            </p>
          </div>

          <StopsHeaderActions brandId={adminUser?.brand_id ?? ""} />
        </div>

        <div className="mt-8 overflow-hidden rounded-2xl bg-white border border-stone-200 shadow-sm">
          <StopTableClient stops={stops ?? []} />
        </div>
      </div>
    </main>
  );
}