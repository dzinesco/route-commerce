import { getAdminUser } from "@/lib/admin-permissions";
import { getAdminOrderDetail } from "@/actions/orders";
import OrderEditForm from "@/components/admin/OrderEditForm";
import OrderPaymentSection from "@/components/admin/OrderPaymentSection";
import OrderPickupAction from "@/components/admin/OrderPickupAction";
import AdminAccessDenied from "@/components/admin/AdminAccessDenied";
import { formatDate } from "@/lib/format-date";
import { redirect } from "next/navigation";
import Link from "next/link";

type OrderDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const { id } = await params;

  const order = await getAdminOrderDetail(id);

  if (!order) {
    return (
      <main className="min-h-screen px-6 py-10">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/admin/orders"
            className="inline-flex items-center gap-2 text-sm text-stone-500 hover:text-stone-700"
          >
            ← Back to Orders
          </Link>
          <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
            <p className="text-lg font-semibold text-red-700">Order not found</p>
          </div>
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
  const taxAmount = Number(order.tax_amount ?? 0);
  const total = subtotal + taxAmount - discount_amount;

  return (
    <main className="min-h-screen px-6 py-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/orders"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-500 hover:bg-stone-50 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-stone-950 tracking-tight">Order Details</h1>
              <p className="text-sm text-stone-500">{formatDate(order.created_at)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${
              order.pickup_complete
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-amber-50 text-amber-700 border border-amber-200"
            }`}>
              {order.pickup_complete ? "✓ Picked Up" : "⏳ Pending"}
            </span>
            {order.payment_processor && (
              <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-semibold text-violet-700 border border-violet-200">
                {order.payment_processor}
              </span>
            )}
          </div>
        </div>

        {/* Customer info */}
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">Customer</p>
              <h2 className="mt-1 text-2xl font-bold text-stone-950">{order.customer_name}</h2>
            </div>
            <OrderPickupAction
              orderId={order.id}
              brandId={brandId}
              currentlyPickedUp={order.pickup_complete}
            />
          </div>

          <div className="mt-5 grid grid-cols-2 gap-4">
            {order.customer_phone && (
              <div>
                <p className="text-xs font-semibold text-stone-400">Phone</p>
                <p className="mt-0.5 text-sm font-medium text-stone-700">{order.customer_phone}</p>
              </div>
            )}
            {order.customer_email && (
              <div>
                <p className="text-xs font-semibold text-stone-400">Email</p>
                <p className="mt-0.5 text-sm font-medium text-stone-700">{order.customer_email}</p>
              </div>
            )}
          </div>
        </div>

        {/* Stop info */}
        {order.stops && (
          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">Pickup Location</p>
            <p className="mt-1 text-lg font-bold text-stone-950">
              {order.stops.city}, {order.stops.state}
            </p>
            <p className="mt-0.5 text-sm text-stone-500">{formatDate(order.stops.date)}</p>
          </div>
        )}

        {/* Order items */}
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold text-stone-950">Order Items</h3>

          {order.order_items && order.order_items.length > 0 ? (
            <div className="mt-4 divide-y divide-stone-100">
              {order.order_items.map((item: any) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-3"
                >
                  <div>
                    <p className="font-medium text-stone-900">
                      {item.products?.name ?? "Unknown Product"}
                    </p>
                    <p className="text-xs text-stone-400">Qty: {item.quantity} × {formatCurrency(Number(item.price))}</p>
                  </div>
                  <p className="font-semibold text-stone-900">
                    {formatCurrency(Number(item.price) * item.quantity)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-stone-400">No items found</p>
          )}

          {/* Totals */}
          <div className="mt-6 border-t border-stone-100 pt-6 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-stone-500">Subtotal</span>
              <span className="text-stone-900">{formatCurrency(subtotal)}</span>
            </div>
            {taxAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-stone-500">Tax</span>
                <span className="text-stone-900">{formatCurrency(taxAmount)}</span>
              </div>
            )}
            {discount_amount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-stone-500">Discount</span>
                <span className="text-red-600">-{formatCurrency(discount_amount)}</span>
                {order.discount_reason && (
                  <span className="text-xs text-stone-400 ml-2">({order.discount_reason})</span>
                )}
              </div>
            )}
            <div className="flex justify-between text-lg font-bold text-stone-950 pt-2 border-t border-stone-200">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        {/* Payment & Refunds */}
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold text-stone-950">Payment & Refunds</h3>
          <p className="mt-1 text-sm text-stone-500">Record payment details and manage refunds</p>

          <div className="mt-5">
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
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold text-stone-950">Edit Order</h3>
          <p className="mt-1 text-sm text-stone-500">Update customer details, pricing, and status</p>

          <div className="mt-5">
            <OrderEditForm order={order as any} brandId={brandId} />
          </div>
        </div>

        {/* Internal notes */}
        {order.internal_notes && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">Internal Notes</p>
            <p className="mt-1 text-sm text-stone-700">{order.internal_notes}</p>
          </div>
        )}
      </div>
    </main>
  );
}