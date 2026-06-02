import AdminOrdersPanel from "@/components/admin/AdminOrdersPanel";
import { getAdminUser } from "@/lib/admin-permissions";
import { getAdminOrders } from "@/actions/orders";
import AdminAccessDenied from "@/components/admin/AdminAccessDenied";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const adminUser = await getAdminUser();

  if (!adminUser) return <AdminAccessDenied />;

  if (!adminUser.can_manage_orders) {
    redirect("/admin/pickup");
  }

  const { orders, stops } = await getAdminOrders();

  const brandStops = adminUser?.brand_id
    ? stops.filter((s) => s.brand_id === adminUser.brand_id)
    : stops;

  const brandOrders = adminUser?.brand_id
    ? orders.filter(
        (o) =>
          o.stops && brandStops.some((s) => s.id === o.stop_id)
      )
    : orders;

  return (
    <div className="min-h-screen bg-[var(--admin-bg)]">
      {/* Header */}
      <div className="px-4 sm:px-6 md:px-8 pt-4 sm:pt-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-emerald-600">
            <svg className="h-5 w-5 sm:h-6 sm:w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/>
              <path d="M3 6h18"/>
              <path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-[var(--admin-text-primary)] tracking-tight">Orders</h1>
            <p className="text-xs text-[var(--admin-text-muted)]">Manage customer orders and pickup status</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 sm:px-6 md:px-8 py-4 sm:py-6">
        <div className="rounded-2xl border border-[var(--admin-border)] bg-white overflow-hidden">
          <AdminOrdersPanel
            initialOrders={brandOrders}
            initialStops={brandStops}
            brandId={adminUser?.brand_id ?? null}
          />
        </div>
      </div>
    </div>
  );
}