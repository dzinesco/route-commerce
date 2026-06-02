"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/format-date";
import { updateOrder } from "@/actions/orders/update-order";
import { createRefund } from "@/actions/orders/create-refund";
import { useToast, AdminButton, AdminInput } from "./design-system";

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

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

export default function OrderPaymentSection({
  orderId,
  brandId,
  orderTotal,
  payment_processor,
  payment_status,
  payment_transaction_id,
  existingRefunds,
}: OrderPaymentSectionProps) {
  const router = useRouter();
  const { success: showSuccess, error: showError } = useToast();
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

  const totalRefunded = existingRefunds
    .filter((r) => r.status === "completed")
    .reduce((sum, r) => sum + Number(r.amount), 0);
  const remainingBalance = Math.max(0, orderTotal - totalRefunded);

  // Validation for refund
  const [refundError, setRefundError] = useState<string | null>(null);

  function validateRefund(): boolean {
    const amount = Number(refundAmount);
    if (!amount || amount <= 0) {
      setRefundError("Please enter a valid refund amount");
      return false;
    }
    if (amount > remainingBalance) {
      setRefundError(`Amount cannot exceed remaining balance of ${formatCurrency(remainingBalance)}`);
      return false;
    }
    setRefundError(null);
    return true;
  }

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
      showError("Failed to save", result.error ?? "Please try again");
      setError(result.error ?? "Failed to save");
    } else {
      showSuccess("Payment saved", "Payment details have been updated");
      setSaved(true);
    }
    setSaving(false);
  }

  async function handleRefund(e: React.FormEvent) {
    e.preventDefault();
    if (!validateRefund()) return;

    const amount = Number(refundAmount);

    setRefunding(true);
    setError(null);
    setRefundSaved(false);

    const result = await createRefund(orderId, brandId, {
      amount,
      reason: refundReason || null,
    });

    if (!result.success) {
      showError("Failed to record refund", result.error ?? "Please try again");
      setError(result.error ?? "Failed to record refund");
    } else {
      showSuccess("Refund recorded", `${formatCurrency(amount)} has been refunded`);
      setRefundAmount("");
      setRefundReason("");
      setRefundSaved(true);
      router.refresh();
    }
    setRefunding(false);
  }

  return (
    <div className="space-y-5">
      {/* Balance summary */}
      <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-stone-500">Order Total</p>
            <p className="text-lg font-bold text-stone-900">{formatCurrency(orderTotal)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium text-stone-500">Refunded</p>
            <p className="text-lg font-bold text-green-600">{formatCurrency(totalRefunded)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium text-stone-500">Balance Due</p>
            <p className="text-lg font-bold text-[var(--admin-accent)]">{formatCurrency(remainingBalance)}</p>
          </div>
        </div>
      </div>

      {/* Payment details */}
      <form onSubmit={handleSavePayment} className="space-y-4">
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-600 flex items-start gap-3">
            <svg className="h-5 w-5 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        {saved && (
          <div className="rounded-xl bg-green-50 border border-green-200 p-4 text-sm text-green-700 flex items-center gap-3">
            <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Payment details saved
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-stone-500">Processor</label>
            <select
              value={processor}
              onChange={(e) => setProcessor(e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--admin-accent)] focus:ring-2 focus:ring-[var(--admin-accent)]/20"
            >
              <option value="">— None —</option>
              {["manual", "stripe", "square", "cash", "venmo", "other"].map((p) => (
                <option key={p} value={p}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-stone-500">Payment Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--admin-accent)] focus:ring-2 focus:ring-[var(--admin-accent)]/20"
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
          <label className="mb-1 block text-xs font-semibold text-stone-500">Transaction ID</label>
          <input
            type="text"
            value={transactionId}
            onChange={(e) => setTransactionId(e.target.value)}
            placeholder="External payment reference"
            className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-[var(--admin-accent)] focus:ring-2 focus:ring-[var(--admin-accent)]/20"
          />
        </div>

        <AdminButton
          type="submit"
          disabled={saving}
          isLoading={saving}
          variant="primary"
        >
          {saving ? "Saving..." : "Save Payment Details"}
        </AdminButton>
      </form>

      {/* Refund history */}
      {existingRefunds.length > 0 && (
        <div>
          <p className="mb-3 text-sm font-semibold text-stone-700">
            Refund History ({existingRefunds.length})
          </p>
          <div className="space-y-2">
            {existingRefunds.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-xl border border-stone-200 bg-white px-4 py-3"
              >
                <div>
                  <p className="font-semibold text-stone-900">
                    {formatCurrency(Number(r.amount))}
                  </p>
                  {r.reason && (
                    <p className="text-xs text-stone-500">{r.reason}</p>
                  )}
                  <p className="text-xs text-stone-400">
                    {formatDate(r.created_at)}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    r.status === "completed"
                      ? "bg-green-50 text-green-700 border border-green-200"
                      : "bg-stone-100 text-stone-500 border border-stone-200"
                  }`}
                >
                  {r.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Record a refund */}
      {remainingBalance > 0 && (
        <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50 p-4">
          <p className="mb-3 text-sm font-semibold text-stone-700">Record a Refund</p>
          {refundSaved && (
            <div className="mb-3 rounded-xl bg-green-50 border border-green-200 p-3 text-sm text-green-700 flex items-center gap-2">
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Refund recorded successfully
            </div>
          )}
          <form onSubmit={handleRefund} className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-stone-500">Amount</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={remainingBalance}
                  value={refundAmount}
                  onChange={(e) => {
                    setRefundAmount(e.target.value);
                    setRefundError(null);
                  }}
                  placeholder={`Max ${formatCurrency(remainingBalance)}`}
                  className={`w-full rounded-xl border bg-white pl-8 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--admin-accent)]/20 ${
                    refundError
                      ? "border-red-400 bg-red-50"
                      : "border-stone-200 focus:border-[var(--admin-accent)]"
                  }`}
                />
              </div>
              {refundError && (
                <p className="mt-1 text-xs text-red-500">{refundError}</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-stone-500">Reason</label>
              <input
                type="text"
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="Customer request, defective product, etc."
                className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-[var(--admin-accent)] focus:ring-2 focus:ring-[var(--admin-accent)]/20"
              />
            </div>
            <AdminButton
              type="submit"
              disabled={!refundAmount || Number(refundAmount) <= 0 || refunding}
              isLoading={refunding}
              variant="danger"
              fullWidth
            >
              {refunding ? "Processing..." : `Record Refund (Max ${formatCurrency(remainingBalance)})`}
            </AdminButton>
          </form>
        </div>
      )}
    </div>
  );
}