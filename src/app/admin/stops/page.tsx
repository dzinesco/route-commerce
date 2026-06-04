import StopTableClient from "@/components/admin/StopTableClient";
import LocationsTab from "@/components/admin/LocationsTab";
import StopsLocationsTabs from "@/components/admin/StopsLocationsTabs";
import StatsStrip from "@/components/admin/StatsStrip";
import { supabase } from "@/lib/supabase";
import { getAdminUser } from "@/lib/admin-permissions";
import { getActiveBrandId } from "@/lib/brand-scope";
import { adminListLocations } from "@/actions/locations";
import AdminAccessDenied from "@/components/admin/AdminAccessDenied";
import { PageHeader } from "@/components/admin/design-system";
import { redirect } from "next/navigation";
import { TabSwitcher } from "@/components/admin/TabSwitcher";

const StopIcon = () => (
  <svg className="h-5 w-5 sm:h-6 sm:w-6 text-current" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
);

type TabValue = "stops" | "locations";

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
  const activeBrandId = await getActiveBrandId(adminUser);

  const stopsQuery = supabase
    .from("stops")
    .select(`
      id, city, state, date, time, location, active, deleted_at, brand_id,
      address, zip, cutoff_time, status,
      brands ( name )
    `)
    .is("deleted_at", null)
    .order("date", { ascending: true });

  if (activeBrandId) {
    stopsQuery.eq("brand_id", activeBrandId);
  }

  const [{ data: stops, error: stopsError }, locations] = await Promise.all([
    stopsQuery,
    adminListLocations(activeBrandId ?? ""),
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

  // Derive stats for the strip. The stops/locations arrays are already on hand.
  const safeStops = stops ?? [];
  const cityCount = new Set(
    safeStops.map((s) => `${(s.city ?? "").toLowerCase()}|${(s.state ?? "").toLowerCase()}`)
  ).size;
  const stateCount = new Set(safeStops.map((s) => (s.state ?? "").toUpperCase())).size;
  const draftCount = safeStops.filter((s) => s.status === "draft").length;
  const activeCount = safeStops.filter((s) => s.active && s.status !== "draft").length;
  const inactiveCount = safeStops.filter((s) => !s.active && s.status !== "draft").length;

  const locationCityCount = new Set(
    locations.map((l) => (l.city ?? "").toLowerCase())
  ).size;
  const locationWithStops = locations.filter((l) => l.stop_count > 0).length;

  const subtitle =
    tab === "locations"
      ? "Reusable venues. Each stop links to one venue, so editing here updates every stop using it."
      : adminUser?.brand_id
        ? "Manage stops, venues, and the routes that connect them."
        : "Manage stops, venues, and the routes that connect them.";

  const stopsStats = [
    { value: safeStops.length, label: "stops" },
    { value: cityCount, label: "cities" },
    { value: stateCount, label: "states" },
    { value: activeCount, label: "active" },
    { value: draftCount, label: "draft", emphasis: draftCount > 0 },
    { value: inactiveCount, label: "inactive" },
  ];

  const locationsStats = [
    { value: locations.length, label: "venues" },
    { value: locationCityCount, label: "cities" },
    { value: locationWithStops, label: "with stops" },
  ];

  return (
    <main className="min-h-screen bg-[var(--admin-bg)]">
      {/* Header */}
      <div className="px-4 sm:px-6 md:px-8 pt-6 sm:pt-8 pb-4 sm:pb-5">
        <div className="max-w-6xl mx-auto">
          <PageHeader
            breadcrumb={[
              { label: "Admin", href: "/admin" },
              { label: "Stops & Routes" }
            ]}
            icon={<StopIcon />}
            title="Stops & Routes"
            subtitle={subtitle}
          />
          <div className="mt-3 ml-[52px]">
            <StatsStrip
              stats={tab === "locations" ? locationsStats : stopsStats}
            />
          </div>
        </div>
      </div>

      {/* Card: tabs + content */}
      <div className="px-4 sm:px-6 md:px-8 pb-8">
        <div className="max-w-6xl mx-auto">
          <div className="overflow-hidden rounded-2xl border border-[var(--admin-border)] bg-white shadow-sm">
            <StopsLocationsTabs
              active={tab}
              stopCount={safeStops.length}
              locationCount={locations.length}
              stopsSublabel={`${cityCount} cities`}
              locationsSublabel={`${locationCityCount} cities`}
            />
            <TabSwitcher tabKey={tab}>
              {tab === "stops" ? (
                <StopTableClient stops={safeStops} />
              ) : (
                <LocationsTab locations={locations} brandId={adminUser?.brand_id ?? ""} />
              )}
            </TabSwitcher>
          </div>
        </div>
      </div>
    </main>
  );
}
