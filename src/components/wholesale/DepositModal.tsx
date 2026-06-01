"use client";

import { useState } from "react";
import { type WholesaleOrder, recordWholesaleDeposit } from "@/actions/wholesale";

type Props = {
  order: WholesaleOrder;
  onClose: () => void;
  onFulfilled: () => void;
};

export default function DepositModal({ order, onClose, onFulfilled }: Props) {
  const maxDeposit = Number(order.balance_due);
  const [amount, setAmount] = useState(
    maxDeposit > 0 ? maxDeposit.toFixed(2) : ""
  );
  const [method, setMethod] = useState("cash");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  async function handleConfirm() {
    const parsed = Number(amount);
    if (!amount || isNaN(parsed) || parsed <= 0) {
      setMsg({ kind: "error", text: "Please enter a valid amount." });
      return;
    }
    if (parsed > maxDeposit) {
      setMsg({ kind: "error", text: `Deposit cannot exceed the remaining balance of $${maxDeposit.toFixed(2)}.` });
      return;
    }
    setSaving(true);
    const result = await recordWholesaleDeposit(order.id, parsed, method);
    setSaving(false);
    if (result.success) {
      onFulfilled();
      onClose();
    } else {
      setMsg({ kind: "error", text: result.error ?? "Failed to record deposit." });
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-96 shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="font-semibold text-slate-900 mb-4">Record Deposit</h3>
        <p className="text-sm text-slate-500 mb-4">
          Balance due: <span className="font-semibold text-slate-700">${Number(order.balance_due).toFixed(2)}</span>
        </p>
        {msg && (
          <div className={`mb-3 rounded-lg border px-3 py-2 text-sm ${
            msg.kind === "success"
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}>{msg.text}</div>
        )}
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Amount ($)</label>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              step="0.01"
              min="0"
              max={maxDeposit}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Method</label>
            <select
              value={method}
              onChange={e => setMethod(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
            >
              <option value="cash">Cash</option>
              <option value="check">Check</option>
              <option value="wire">Wire</option>
              <option value="card">Card</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex gap-3">
          <button
            onClick={handleConfirm}
            disabled={saving || !amount || Number(amount) > maxDeposit}
            className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Record Deposit"}
          </button>
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
