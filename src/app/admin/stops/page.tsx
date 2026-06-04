import StopTableClient from "@/components/admin/StopTableClient";
import LocationsTab from "@/components/admin/LocationsTab";
import StopsHeaderActions from "@/components/admin/StopsHeaderActions";
import { supabase } from "@/lib/supabase";
import { getAdminUser } from "@/lib/admin-permissions";
import { adminListLocations } from "@/actions/locations";
import AdminAccessDenied from "@/components/admin/AdminAccessDenied";
import { PageHeader } from "@/components/admin/design-system";
import { redirect } from "next/navigation";
import Link from "next/link";

const StopIcon = () => (
  <svg className="h-5 w-5 sm:h-6 sm:w-6 text-current" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
);

const TABS = [
  { value: "stops", label: "Stops" },
  { value: "locations", label: "Locations" },
] as const;
type TabValue = (typeof TABS)[number]["value"];

function isTab(v: string | undefined): v is TabValue {
  return v === "stops" || v === "locations";
}

type PageProps = {
  searchParams: Promise<{ tab?: string }>;
};

export default async function AdminStopsPage({ searchParams }: PageProps) {
  const adminUser = await getAdminUser();

  if (!adminUser) return <AdminAccessDenied />;
  if (!adminUser.can_manage_stops) redirect("/admin/pickup");

  const params = await searchParams;
  const tab: TabValue = isTab(params.tab) ? params.tab : "stops";

  // Always fetch stops + locations; the page is fast and a server component can
  // hand both to the client. The Locations tab only needs the array — it does
  // its own filtering in JS. Stops tab uses the existing client table.
  const stopsQuery = supabase
    .from("stops")
    .select(`
      id, city, state, date, time, location, active, deleted_at, brand_id,
      address, zip, cutoff_time, status,
      brands ( name )
    `)
    .is("deleted_at", null)
    .order("date", { ascending: true });

  if (adminUser?.brand_id) {
    stopsQuery.eq("brand_id", adminUser.brand_id);
  }

  const [{ data: stops, error: stopsError }, locations] = await Promise.all([
    stopsQuery,
    adminListLocations(adminUser.brand_id ?? ""),
  ]);

  if (stopsError) {
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
              {stopsError.message}
            </pre>
          </div>
        </div>
      </main>
    );
  }

  const subtitle =
    tab === "locations"
      ? "Reusable venues. Each stop links to one venue, so editing here updates every stop using it."
      : adminUser?.brand_id
        ? "Managing stops for your brand."
        : "Manage routes, pickup locations, dates, and cutoff times.";

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
          subtitle={subtitle}
          actions={<StopsHeaderActions brandId={adminUser?.brand_id ?? ""} tab={tab} />}
        />
      </div>

      {/* Tabs */}
      <div className="px-4 sm:px-6 md:px-8">
        <div className="max-w-6xl mx-auto">
          <div
            className="flex gap-1 border-b border-[var(--admin-border)]"
            role="tablist"
            aria-label="Stops and Locations tabs"
          >
            {TABS.map((t) => {
              const active = t.value === tab;
              return (
                <Link
                  key={t.value}
                  href={t.value === "stops" ? "/admin/stops" : "/admin/stops?tab=locations"}
                  role="tab"
                  aria-selected={active}
                  className="relative px-4 py-2.5 text-sm font-semibold transition-colors"
                  style={{
                    color: active ? "var(--admin-text-primary)" : "var(--admin-text-muted)",
                  }}
                >
                  {t.label}
                  {active && (
                    <span
                      className="absolute left-0 right-0 -bottom-px h-0.5"
                      style={{ background: "var(--admin-accent)" }}
                      aria-hidden
                    />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 sm:px-6 md:px-8 py-4 sm:py-6">
        <div className="max-w-6xl mx-auto">
          <div className="overflow-hidden rounded-b-2xl rounded-t-none border border-t-0 border-[var(--admin-border)] bg-white shadow-sm">
            {tab === "stops" ? (
              <StopTableClient stops={stops ?? []} />
            ) : (
              <LocationsTab locations={locations} brandId={adminUser?.brand_id ?? ""} />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
