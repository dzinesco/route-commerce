import DriverPickupPanel from "@/components/admin/DriverPickupPanel";
import { getAdminUser } from "@/lib/admin-permissions";
import { getAdminOrders } from "@/actions/orders";

export const dynamic = "force-dynamic";

export default async function DriverPickupPage() {
  const adminUser = await getAdminUser();
  const { orders, stops } = await getAdminOrders();

  // Filter stops by brand if scoped
  const brandStops = adminUser?.brand_id
    ? stops.filter((s) => s.brand_id === adminUser.brand_id)
    : stops;

  // Build stop IDs for brand filtering
  const brandStopIds = brandStops.map((s) => s.id);

  // Filter orders by brand
  const brandOrders = adminUser?.brand_id
    ? orders.filter((o) => o.stop_id && brandStopIds.includes(o.stop_id))
    : orders;

  const pendingOrders = brandOrders.filter((o) => !o.pickup_complete);
  const pickedUpOrders = brandOrders.filter(
    (o) =>
      o.pickup_complete &&
      o.pickup_completed_at &&
      new Date(o.pickup_completed_at) >
        new Date(Date.now() - 72 * 60 * 60 * 1000)
  );

  return (
    <DriverPickupPanel
      initialPendingOrders={pendingOrders}
      initialPickedUpOrders={pickedUpOrders}
      initialStops={brandStops}
      brandId={adminUser?.brand_id ?? null}
      canManagePickup={adminUser?.can_manage_pickup ?? false}
    />
  );
}