import AdminOrdersPanel from "@/components/admin/AdminOrdersPanel";
import { getAdminUser } from "@/lib/admin-permissions";
import { getActiveBrandId } from "@/lib/brand-scope";
import { getAdminOrders } from "@/actions/orders";
import AdminAccessDenied from "@/components/admin/AdminAccessDenied";
import { PageHeader } from "@/components/admin/design-system";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const adminUser = await getAdminUser();

  if (!adminUser) return <AdminAccessDenied />;

  if (!adminUser.can_manage_orders) {
    redirect("/admin/pickup");
  }

  const activeBrandId = await getActiveBrandId(adminUser);
  // Platform admin can browse all brands' orders; everyone else must have a brand
  if (!activeBrandId && adminUser.role !== "platform_admin") {
    return <AdminAccessDenied message="You don't have access to any brand." />;
  }

  const { orders, stops } = await getAdminOrders();

  const brandStops = activeBrandId
    ? stops.filter((s) => s.brand_id === activeBrandId)
    : stops;

  const brandOrders = activeBrandId
    ? orders.filter(
        (o) =>
          o.stops && brandStops.some((s) => s.id === o.stop_id)
      )
    : orders;

  // Fetch active products for this brand (for admin "New Order" item picker)
  let brandProducts: Array<{ id: string; name: string; price: number; type?: string | null; active?: boolean }> = [];
  try {
    let prodQuery = supabase
      .from("products")
      .select("id, name, price, type, active")
      .eq("active", true)
      .is("deleted_at", null)
      .order("name")
      .limit(200);

    if (activeBrandId) {
      prodQuery = prodQuery.eq("brand_id", activeBrandId);
    }

    const { data: prods } = await prodQuery;
    brandProducts = (prods ?? []).map((p: any) => ({
      id: p.id,
      name: p.name,
      price: Number(p.price),
      type: p.type ?? null,
      active: p.active ?? true,
    }));
  } catch {
    // non-fatal for the orders list
  }

  return (
    <div className="min-h-screen bg-[var(--admin-bg)]">
      <div className="px-4 sm:px-6 md:px-8 pt-4 sm:pt-6">
        <PageHeader
          title="Orders"
          subtitle="Manage customer orders and pickup status"
          icon={
            <svg className="h-5 w-5 sm:h-6 sm:w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/>
              <path d="M3 6h18"/>
              <path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
          }
        />
      </div>

      {/* Content */}
      <div className="px-4 sm:px-6 md:px-8 py-4 sm:py-6">
        <div className="rounded-2xl border border-[var(--admin-border)] bg-white overflow-hidden">
          <AdminOrdersPanel
            initialOrders={brandOrders}
            initialStops={brandStops}
            initialProducts={brandProducts}
            brandId={activeBrandId}
          />
        </div>
      </div>
    </div>
  );
}