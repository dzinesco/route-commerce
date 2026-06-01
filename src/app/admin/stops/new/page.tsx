import { supabase } from "@/lib/supabase";
import NewStopForm from "@/components/admin/NewStopForm";
import StopProductAssignment from "@/components/admin/StopProductAssignment";
import { getAdminUser } from "@/lib/admin-permissions";
import AdminAccessDenied from "@/components/admin/AdminAccessDenied";
import { redirect } from "next/navigation";

type Stop = {
  city: string;
  state: string;
  location: string;
  date: string;
  time: string;
  brand_id: string;
  active: boolean;
  address?: string | null;
  zip?: string | null;
  cutoff_time?: string | null;
};

export default async function NewStopPage({
  searchParams,
}: {
  searchParams: Promise<{ duplicate?: string }>;
}) {
  const adminUser = await getAdminUser();
  const { duplicate } = await searchParams;

  if (!adminUser) return <AdminAccessDenied />;
  if (!adminUser.can_manage_stops) redirect("/admin/pickup");

  let duplicateFrom: Stop | null = null;
  if (duplicate) {
    const { data } = await supabase
      .from("stops")
      .select("city, state, location, date, time, brand_id, active, address, zip, cutoff_time")
      .eq("id", duplicate)
      .single();
    duplicateFrom = data;
  }

  const brandId =
    adminUser.brand_id ?? "64294306-5f42-463d-a5e8-2ad6c81a96de";

  const [{ data: allProducts }] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, type, price")
      .eq("brand_id", brandId)
      .eq("active", true),
  ]);

  return (
    <main className="min-h-screen bg-stone-100 px-6 py-12">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <a
            href="/admin/stops"
            className="text-sm text-stone-500 hover:text-stone-700"
          >
            ← Back to Stops
          </a>
        </div>

        <div className="rounded-2xl bg-white p-8 border border-stone-200 shadow-lg">
          <h1 className="text-3xl font-bold text-stone-950">
            {duplicateFrom ? "Duplicate Stop" : "Create Stop"}
          </h1>

          <p className="mt-2 text-stone-600">
            {duplicateFrom
              ? `Pre-filled from ${duplicateFrom.city}, ${duplicateFrom.state}. Edit and save to create.`
              : "Add a new tour stop for Tuxedo Corn or Indian River Direct."}
          </p>

          <NewStopForm duplicateFrom={duplicateFrom} />
        </div>
      </div>
    </main>
  );
}
