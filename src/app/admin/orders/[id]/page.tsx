import { getAdminUser } from "@/lib/admin-permissions";
import { getAdminOrderDetail } from "@/actions/orders";
import OrderEditForm from "@/components/admin/OrderEditForm";
import OrderPaymentSection from "@/components/admin/OrderPaymentSection";
import OrderPickupAction from "@/components/admin/OrderPickupAction";
import AdminAccessDenied from "@/components/admin/AdminAccessDenied";
import { redirect } from "next/navigation";

type OrderDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const { id } = await params;

  const order = await getAdminOrderDetail(id);

  if (!order) {
    return (
      <main className="min-h-screen bg-stone-100 px-6 py-12">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-3xl font-bold text-red-600">Order not found</h1>
          <a
            href="/admin/orders"
            className="mt-4 inline-block text-stone-500 hover:text-stone-700"
          >
            ← Back to Orders
          </a>
        </div>
      </main>
    );
  }

  const adminUser = await getAdminUser();

  if (!adminUser) return <AdminAccessDenied />;

  if (!adminUser.can_manage_orders) redirect("/admin/pickup");

  if (adminUser?.brand_id && order.stops?.brand_id !== adminUser.brand_id) {
    return <AdminAccessDenied />;
  }

  const brandId = order.stops?.brand_id ?? null;
  const subtotal = Number(order.subtotal);
  const discount_amount = Number(order.discount_amount ?? 0);
  const total = Math.max(0, subtotal - discount_amount);

  return (
    <main className="min-h-screen bg-stone-100 px-6 py-12">
      <div className="mx-auto max-w-4xl">
        <a
          href="/admin/orders"
          className="text-sm text-stone-500 hover:text-stone-700"
        >
          ← Back to Orders
        </a>

        {/* Customer info */}
        <div className="card mt-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-stone-500">
                Customer
              </p>
              <h1 className="mt-2 text-3xl font-bold text-stone-950">
                {order.customer_name}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                  order.pickup_complete
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-yellow-100 text-yellow-700"
                }`}
              >
                {order.pickup_complete ? "Picked Up" : "Pending"}
              </span>
              <OrderPickupAction
                orderId={order.id}
                brandId={brandId}
                currentlyPickedUp={order.pickup_complete}
              />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {order.customer_phone && (
              <div>
                <p className="text-sm font-medium text-stone-500">Phone</p>
                <p className="mt-1 text-lg text-stone-950">{order.customer_phone}</p>
              </div>
            )}
            {order.customer_email && (
              <div>
                <p className="text-sm font-medium text-stone-500">Email</p>
                <p className="mt-1 text-lg text-stone-950">{order.customer_email}</p>
              </div>
            )}
          </div>
        </div>

        {/* Stop info */}
        {order.stops && (
          <div className="card mt-6">
            <p className="text-sm font-medium text-stone-500">Stop</p>
            <p className="mt-1 text-xl font-semibold text-stone-950">
              {order.stops.city}, {order.stops.state}
            </p>
            <p className="mt-1 text-sm text-stone-500">{order.stops.date}</p>
          </div>
        )}

        {/* Order items */}
        <div className="card mt-6">
          <h2 className="text-2xl font-bold text-stone-950">Order Items</h2>

          {order.order_items && order.order_items.length > 0 ? (
            <div className="mt-4 space-y-3">
              {order.order_items.map((item: any) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between border-b border-stone-200 pb-3 last:border-0"
                >
                  <div>
                    <p className="font-medium text-stone-950">
                      {item.products?.name ?? "Unknown Product"}
                    </p>
                    <p className="text-sm text-stone-500">Qty: {item.quantity}</p>
                  </div>
                  <p className="font-semibold text-stone-950">
                    ${(Number(item.price) * item.quantity).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-stone-500">No items found.</p>
          )}

          <div className="mt-6 border-t border-stone-200 pt-6 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-stone-500">Subtotal</span>
              <span className="text-stone-950">${subtotal.toFixed(2)}</span>
            </div>
            {Number(order.tax_amount ?? 0) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-stone-500">Tax ({order.tax_rate ? `${(Number(order.tax_rate) * 100).toFixed(3)}%` : ""})</span>
                <span className="text-stone-950">${Number(order.tax_amount).toFixed(2)}</span>
              </div>
            )}
            {discount_amount > 0 && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-stone-500">Discount</span>
                  <span className="text-red-600">-${discount_amount.toFixed(2)}</span>
                </div>
                {order.discount_reason && (
                  <p className="text-xs text-stone-500">{order.discount_reason}</p>
                )}
              </>
            )}
            <div className="flex justify-between text-xl font-bold text-stone-950 pt-2 border-t border-stone-200">
              <span>Total</span>
              <span>${(subtotal + Number(order.tax_amount ?? 0) - discount_amount).toFixed(2)}</span>
            </div>
            {order.tax_location && (
              <p className="text-xs text-stone-500">Tax sourced from: {order.tax_location}</p>
            )}
          </div>
        </div>

        {/* Payment & Refunds */}
        <div className="card mt-6">
          <h2 className="text-2xl font-bold text-stone-950">
            Payment & Refunds
          </h2>
          <p className="mt-1 text-stone-600">
            Record payment details and manage refunds for this order.
          </p>

          <div className="mt-6">
            <OrderPaymentSection
              orderId={order.id}
              brandId={brandId}
              orderTotal={total}
              payment_processor={order.payment_processor}
              payment_status={order.payment_status}
              payment_transaction_id={order.payment_transaction_id}
              refunded_amount={order.refunded_amount ?? 0}
              refund_reason={order.refund_reason}
              existingRefunds={order.refunds ?? []}
            />
          </div>
        </div>

        {/* Edit form */}
        <div className="card mt-6">
          <h2 className="text-2xl font-bold text-stone-950">Edit Order</h2>
          <p className="mt-1 text-stone-600">
            Update customer details, pricing, and status.
          </p>

          <div className="mt-6">
            <OrderEditForm order={order as any} brandId={brandId} />
          </div>
        </div>

        {/* Internal notes display */}
        {order.internal_notes && (
          <div className="card mt-6 border-amber-300 bg-amber-50">
            <p className="text-sm font-medium text-amber-700">Internal Notes</p>
            <p className="mt-1 text-stone-950">{order.internal_notes}</p>
          </div>
        )}
      </div>
    </main>
  );
}
