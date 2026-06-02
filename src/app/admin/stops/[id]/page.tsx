import { supabase } from "@/lib/supabase";
import StopEditForm from "@/components/admin/StopEditForm";
import StopProductAssignment from "@/components/admin/StopProductAssignment";
import MessageCustomersSection from "@/components/admin/MessageCustomersSection";
import { getAdminUser } from "@/lib/admin-permissions";
import AdminAccessDenied from "@/components/admin/AdminAccessDenied";
import { redirect } from "next/navigation";

type StopDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function StopDetailPage({ params }: StopDetailPageProps) {
  const { id } = await params;

  const [{ data: stop, error }, { data: brands }] = await Promise.all([
    supabase
      .from("stops")
      .select("*, brands(name, slug)")
      .eq("id", id)
      .single(),
    supabase.from("brands").select("id, name, slug"),
  ]);

  const adminUser = await getAdminUser();

  if (!adminUser) {
    return <AdminAccessDenied />;
  }

  if (!adminUser.can_manage_stops) redirect("/admin/pickup");

  if (adminUser.brand_id && stop?.brand_id !== adminUser.brand_id) {
    return <AdminAccessDenied />;
  }

  if (error || !stop) {
    return (
      <main className="min-h-screen px-6 py-12" style={{ backgroundColor: "var(--admin-bg)" }}>
        <div className="mx-auto max-w-4xl">
          <h1 className="text-3xl font-bold text-red-600">Stop not found</h1>
          <pre className="mt-4 rounded-xl bg-white border border-stone-200 p-4 text-sm text-stone-600">
            {error?.message ?? "Stop not found"}
          </pre>
          <a
            href="/admin/stops"
            className="mt-4 inline-block text-stone-500 hover:text-stone-700"
          >
            ← Back to Stops
          </a>
        </div>
      </main>
    );
  }

  const [{ data: allProducts }, { data: productStops }] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, type, price")
      .eq("brand_id", stop.brand_id)
      .eq("active", true),
    supabase
      .from("product_stops")
      .select("id, product_id, products(id, name, type, price)")
      .eq("stop_id", id),
  ]);

  const assignedProducts = (productStops ?? [])
    .map((ps: any) => ps)
    .filter(Boolean);

  return (
    <main className="min-h-screen px-6 py-12" style={{ backgroundColor: "var(--admin-bg)" }}>
      <div className="mx-auto max-w-4xl">
        <a
          href="/admin/stops"
          className="text-sm text-stone-500 hover:text-stone-700"
        >
          ← Back to Stops
        </a>

        <div className="mt-6 rounded-2xl bg-white p-8 border border-stone-200 shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-stone-500">
                {stop.brands?.name}
              </p>
              <h1 className="mt-2 text-4xl font-bold text-stone-950">
                {stop.city}, {stop.state}
              </h1>
              <p className="mt-2 text-lg text-stone-600">{stop.location}</p>
            </div>

            <span
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium ${
                stop.active
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-stone-200 text-stone-500"
              }`}
            >
              {stop.active ? "Active" : "Inactive"}
            </span>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-medium text-stone-500">Date</p>
              <p className="mt-1 text-lg font-semibold text-stone-950">
                {stop.date}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-stone-500">Time</p>
              <p className="mt-1 text-lg font-semibold text-stone-950">
                {stop.time}
              </p>
            </div>
            {stop.address && (
              <div>
                <p className="text-sm font-medium text-stone-500">Address</p>
                <p className="mt-1 text-lg font-semibold text-stone-950">
                  {stop.address}
                  {stop.zip ? `, ${stop.zip}` : ""}
                </p>
              </div>
            )}
            {stop.cutoff_time && (
              <div>
                <p className="text-sm font-medium text-stone-500">Cutoff</p>
                <p className="mt-1 text-lg font-semibold text-stone-950">
                  {new Date(stop.cutoff_time).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <a
            href={`/admin/stops/new?duplicate=${stop.id}`}
            className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
          >
            Duplicate Stop
          </a>
        </div>

        <div className="mt-6 rounded-2xl bg-white p-8 border border-stone-200 shadow-lg">
          <h2 className="text-2xl font-bold text-stone-950">
            Assigned Products
          </h2>
          <p className="mt-1 text-stone-600">
            Manage which products are available at this stop.
          </p>

          <div className="mt-6">
            <StopProductAssignment
              stopId={stop.id}
              allProducts={allProducts ?? []}
              assignedProducts={assignedProducts}
              callerUid={adminUser.user_id}
            />
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-white p-8 border border-stone-200 shadow-lg">
          <h2 className="text-2xl font-bold text-stone-950">Edit Stop</h2>
          <p className="mt-1 text-stone-600">
            Update stop details, location, and availability.
          </p>

          <div className="mt-6">
            <StopEditForm
              stop={{
                id: stop.id,
                city: stop.city,
                state: stop.state,
                date: stop.date,
                time: stop.time,
                location: stop.location,
                slug: stop.slug,
                active: stop.active,
                brand_id: stop.brand_id,
                address: stop.address,
                zip: stop.zip,
                cutoff_time: stop.cutoff_time,
              }}
              brands={brands ?? []}
            />
          </div>
        </div>

        {/* Message Customers */}
        <div className="mt-6 rounded-2xl bg-white p-8 border border-stone-200 shadow-lg">
          <h2 className="text-2xl font-bold text-stone-950">Message Customers</h2>
          <p className="mt-1 text-stone-600">
            Send updates to customers with pending pickups at this stop.
          </p>

          <div className="mt-6">
            <MessageCustomersSection stopId={stop.id} brandId={stop.brand_id} />
          </div>
        </div>
      </div>
    </main>
  );
}
