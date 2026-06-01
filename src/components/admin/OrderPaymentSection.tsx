"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/format-date";
import { updateOrder } from "@/actions/orders/update-order";
import { createRefund } from "@/actions/orders/create-refund";

type Refund = {
  id: string;
  order_id: string;
  amount: number;
  reason: string | null;
  processor: string | null;
  processor_refund_id: string | null;
  status: string;
  created_at: string;
};

type OrderPaymentSectionProps = {
  orderId: string;
  brandId: string | null;
  orderTotal: number;
  payment_processor: string | null;
  payment_status: string | null;
  payment_transaction_id: string | null;
  refunded_amount: number;
  refund_reason: string | null;
  existingRefunds: Refund[];
};

export default function OrderPaymentSection({
  orderId,
  brandId,
  orderTotal,
  payment_processor,
  payment_status,
  payment_transaction_id,
  refunded_amount,
  refund_reason,
  existingRefunds,
}: OrderPaymentSectionProps) {
  const router = useRouter();
  const [processor, setProcessor] = useState(payment_processor ?? "");
  const [status, setStatus] = useState(payment_status ?? "manual");
  const [transactionId, setTransactionId] = useState(payment_transaction_id ?? "");
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [refunding, setRefunding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [refundSaved, setRefundSaved] = useState(false);

  async function handleSavePayment(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    const result = await updateOrder(orderId, brandId, {
      payment_processor: processor || null,
      payment_status: status,
      payment_transaction_id: transactionId || null,
    });

    if (!result.success) {
      setError(result.error ?? "Failed to save");
    } else {
      setSaved(true);
    }
    setSaving(false);
  }

  async function handleRefund(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(refundAmount);
    if (!amount || amount <= 0) return;

    setRefunding(true);
    setError(null);
    setRefundSaved(false);

    const result = await createRefund(orderId, brandId, {
      amount,
      reason: refundReason || null,
    });

    if (!result.success) {
      setError(result.error ?? "Failed to record refund");
    } else {
      setRefundAmount("");
      setRefundReason("");
      setRefundSaved(true);
    }
    setRefunding(false);
  }

  const totalRefunded = existingRefunds
    .filter((r) => r.status === "completed")
    .reduce((sum, r) => sum + Number(r.amount), 0);
  const remainingBalance = Math.max(0, orderTotal - totalRefunded);

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl bg-red-900/30 p-4 text-sm text-red-400">{error}</div>
      )}

      {/* Payment details */}
      <form onSubmit={handleSavePayment} className="space-y-4">
        {saved && (
          <div className="rounded-xl bg-green-900/30 p-4 text-sm text-green-400">
            Payment details saved.
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-300">
              Processor
            </label>
            <select
              value={processor}
              onChange={(e) => setProcessor(e.target.value)}
              className="w-full rounded-xl border border-zinc-600 bg-zinc-900 px-4 py-3 text-base outline-none focus:border-slate-900"
            >
              <option value="">—</option>
              {["manual", "stripe", "square", "cash", "venmo", "other"].map((p) => (
                <option key={p} value={p}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-300">
              Payment Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-xl border border-zinc-600 bg-zinc-900 px-4 py-3 text-base outline-none focus:border-slate-900"
            >
              {["pending", "paid", "failed", "refunded", "cancelled"].map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-300">
            Transaction ID
          </label>
          <input
            type="text"
            value={transactionId}
            onChange={(e) => setTransactionId(e.target.value)}
            placeholder="External payment reference"
            className="w-full rounded-xl border border-zinc-600 bg-zinc-900 px-4 py-3 text-base outline-none focus:border-slate-900"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Payment Details"}
        </button>
      </form>

      {/* Refund history */}
      {existingRefunds.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium text-zinc-300">
            Refunds ({existingRefunds.length})
          </p>
          <div className="space-y-2">
            {existingRefunds.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-xl border border-zinc-800 bg-slate-50 px-4 py-3"
              >
                <div>
                  <p className="font-medium text-zinc-100">
                    ${Number(r.amount).toFixed(2)}
                  </p>
                  {r.reason && (
                    <p className="text-xs text-zinc-500">{r.reason}</p>
                  )}
                  <p className="text-xs text-slate-400">
                    {formatDate(new Date(r.created_at))}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    r.status === "completed"
                      ? "bg-green-900/40 text-green-400"
                      : "bg-zinc-950 text-zinc-500"
                  }`}
                >
                  {r.status}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm">
            <span className="text-zinc-500">Total refunded</span>
            <span className="font-medium text-zinc-100">
              ${totalRefunded.toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {/* Record a refund */}
      <div className="rounded-xl border border-dashed border-zinc-600 p-4">
        <p className="mb-3 text-sm font-medium text-zinc-300">Record a Refund</p>
        {refundSaved && (
          <div className="mb-3 rounded-xl bg-green-900/30 p-3 text-sm text-green-400">
            Refund recorded.
          </div>
        )}
        <form onSubmit={handleRefund} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">
              Amount
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={remainingBalance}
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              placeholder={`Max $${remainingBalance.toFixed(2)}`}
              className="w-full rounded-xl border border-zinc-600 bg-zinc-900 px-4 py-2 text-sm outline-none focus:border-slate-900"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">
              Reason
            </label>
            <input
              type="text"
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              placeholder="Customer request, defective product, etc."
              className="w-full rounded-xl border border-zinc-600 bg-zinc-900 px-4 py-2 text-sm outline-none focus:border-slate-900"
            />
          </div>
          <button
            type="submit"
            disabled={!refundAmount || Number(refundAmount) <= 0 || refunding}
            className="w-full rounded-xl border border-red-300 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-900/30 disabled:opacity-50"
          >
            {refunding ? "Processing..." : "Record Refund"}
          </button>
        </form>
      </div>
    </div>
  );
}
