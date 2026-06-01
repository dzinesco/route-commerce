"use client";

import { type WholesaleOrder } from "@/actions/wholesale";

type Props = {
  order: WholesaleOrder;
  onClose: () => void;
  onFulfill: (orderId: string) => void;
  onRecordDeposit: (orderId: string) => void;
  fulfilling: string | null;
};

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    awaiting_deposit: "bg-purple-100 text-purple-700",
    confirmed: "bg-blue-100 text-blue-700",
    fulfilled: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${map[status] ?? "bg-slate-100 text-slate-600"}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

export default function OrderDetailsModal({ order, onClose, onFulfill, onRecordDeposit, fulfilling }: Props) {
  const hasPhone = Boolean(order.customer_phone);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-white px-6 py-4 border-b border-slate-200 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Order Details</h2>
            <p className="text-sm text-slate-500 font-mono">{order.invoice_number ?? order.id.slice(0, 8)}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Customer + pickup meta */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-500 mb-0.5">Customer</p>
              <p className="font-semibold text-slate-900">{order.company_name}</p>
              <p className="text-sm text-slate-500">{order.contact_name ?? ""}</p>
              <p className="text-sm text-slate-500">
                <a href={`mailto:${order.customer_email}`} className="hover:underline">{order.customer_email}</a>
              </p>
              {hasPhone && (
                <a href={`tel:${order.customer_phone}`} className="text-sm text-blue-600 hover:underline">
                  {order.customer_phone}
                </a>
              )}
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-0.5">Pickup Date</p>
              <p className="font-medium text-slate-700">{order.anticipated_pickup_date ?? "—"}</p>
              <p className="text-xs text-slate-500 mt-2 mb-0.5">Status</p>
              <StatusBadge status={order.status} />
              <p className="text-xs text-slate-500 mt-2 mb-0.5">Payment</p>
              <span className={`text-sm font-medium ${order.payment_status === "paid" ? "text-green-600" : "text-orange-600"}`}>
                {order.payment_status === "paid" ? "Paid" : `$${Number(order.balance_due).toFixed(2)} balance due`}
              </span>
            </div>
          </div>

          {/* Line items */}
          <div>
            <p className="text-xs text-slate-500 mb-2 uppercase tracking-wide font-semibold">Items</p>
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-semibold">Product</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Qty</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Unit Price</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {order.items && order.items.length > 0 ? order.items.map((item, i) => (
                    <tr key={i}>
                      <td className="px-4 py-2.5 font-medium text-slate-700">{item.product_name}</td>
                      <td className="px-4 py-2.5 text-right text-slate-600">{item.quantity}</td>
                      <td className="px-4 py-2.5 text-right text-slate-600">${Number(item.unit_price).toFixed(2)}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-slate-900">${Number(item.line_total).toFixed(2)}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={4} className="px-4 py-4 text-center text-slate-400">No items</td></tr>
                  )}
                </tbody>
                <tfoot className="bg-slate-50 border-t border-slate-200">
                  <tr>
                    <td colSpan={3} className="px-4 py-2.5 text-right font-semibold text-slate-700">Subtotal</td>
                    <td className="px-4 py-2.5 text-right font-bold text-slate-900">${Number(order.subtotal).toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="px-4 py-2.5 text-right text-slate-600">Deposit Paid</td>
                    <td className="px-4 py-2.5 text-right text-slate-700">${Number(order.deposit_paid).toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="px-4 py-2.5 text-right font-semibold text-slate-700">Balance Due</td>
                    <td className="px-4 py-2.5 text-right font-bold text-orange-600">${Number(order.balance_due).toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Timestamps */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-slate-500">Created</p>
              <p className="text-slate-700">{new Date(order.created_at).toLocaleString()}</p>
            </div>
            {order.fulfilled_at && (
              <div>
                <p className="text-xs text-slate-500">Fulfilled</p>
                <p className="text-slate-700">{new Date(order.fulfilled_at).toLocaleString()}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            {order.fulfillment_status !== "fulfilled" && (
              <button
                onClick={() => onFulfill(order.id)}
                disabled={fulfilling === order.id}
                className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
              >
                {fulfilling === order.id ? "..." : "Mark Fulfilled"}
              </button>
            )}
            {Number(order.balance_due) > 0 && order.fulfillment_status !== "fulfilled" && (
              <button
                onClick={() => onRecordDeposit(order.id)}
                className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700"
              >
                Record Deposit
              </button>
            )}
            <a
              href={`/api/wholesale/invoice/${order.id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
            >
              Download Invoice
            </a>
            <button
              onClick={onClose}
              className="ml-auto rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
