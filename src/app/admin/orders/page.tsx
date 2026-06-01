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
    <main className="min-h-screen">
      <AdminOrdersPanel
        initialOrders={brandOrders}
        initialStops={brandStops}
        brandId={adminUser?.brand_id ?? null}
      />
    </main>
  );
}