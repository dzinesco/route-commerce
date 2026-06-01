import { getAdminUser } from "@/lib/admin-permissions";
import { getShippingOrders } from "@/actions/shipping";
import ShippingFulfillmentPanel from "@/components/admin/ShippingFulfillmentPanel";
import AdminAccessDenied from "@/components/admin/AdminAccessDenied";

export const dynamic = "force-dynamic";

export default async function ShippingFulfillmentPage() {
  const adminUser = await getAdminUser();
  if (!adminUser) return <AdminAccessDenied />;

  const { orders } = await getShippingOrders();

  return (
    <ShippingFulfillmentPanel
      initialOrders={orders ?? []}
      canManageOrders={adminUser.can_manage_orders ?? false}
    />
  );
}
