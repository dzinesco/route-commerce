"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import StatusBadge from "./StatusBadge";
import StickerPreviewModal from "./StickerPreviewModal";
import { LotDetail, LotOrder, updateHarvestLotStatus } from "@/actions/route-trace/lots";

const STATUS_FLOW = ["active", "in_transit", "at_shed", "packed", "delivered"];

const EVENT_CONFIG: Record<string, { icon: string; bg: string; label: string }> = {
  harvested: { icon: "🌱", bg: "bg-green-100 text-green-700", label: "Harvested" },
  field_packed: { icon: "📦", bg: "bg-green-100 text-green-700", label: "Field Packed" },
  bin_tagged: { icon: "🏷️", bg: "bg-amber-100 text-amber-700", label: "Bin Tagged" },
  in_transit: { icon: "🚚", bg: "bg-amber-100 text-amber-700", label: "In Transit" },
  at_shed: { icon: "🏭", bg: "bg-blue-100 text-blue-700", label: "At Shed" },
  packed: { icon: "📋", bg: "bg-purple-100 text-purple-700", label: "Packed" },
  delivered: { icon: "✅", bg: "bg-stone-100 text-stone-600", label: "Delivered" },
};

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? "w-3.5 h-3.5"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

export default function LotDetailPanel({
  lot,
  brandId,
  orders = [],
}: {
  lot: LotDetail;
  brandId: string;
  orders?: LotOrder[];
}) {
  const [showSticker, setShowSticker] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showBinModal, setShowBinModal] = useState(false);
  const [showUsedModal, setShowUsedModal] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [newStatus, setNewStatus] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [binId, setBinId] = useState("");
  const [usedOrderId, setUsedOrderId] = useState("");
  const [usedQty, setUsedQty] = useState("");
  const [usedNotes, setUsedNotes] = useState("");

  const nextStatuses = STATUS_FLOW.slice(STATUS_FLOW.indexOf(lot.status) + 1);
  const isInTransit = lot.status === "in_transit";
  const canMarkLoaded = lot.status === "at_shed" || lot.status === "packed";

  function handleUpdateStatus(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      await updateHarvestLotStatus(lot.lot_id, newStatus, location || undefined, notes || undefined);
      window.location.reload();
    });
  }

  function handleAddBin(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      await updateHarvestLotStatus(lot.lot_id, "bin_tagged", lot.field_location ?? undefined, notes || undefined, binId || undefined);
      window.location.reload();
    });
  }

  function handleMarkLoaded() {
    startTransition(async () => {
      await updateHarvestLotStatus(lot.lot_id, "in_transit", lot.field_location ?? undefined);
      window.location.reload();
    });
  }

  function handleMarkAtShed() {
    startTransition(async () => {
      await updateHarvestLotStatus(lot.lot_id, "at_shed", lot.field_location ?? undefined);
      window.location.reload();
    });
  }

  function handleMarkUsedInOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!usedOrderId.trim()) return;
    startTransition(async () => {
      const { markLotUsedInOrder } = await import("@/actions/route-trace/lots");
      await markLotUsedInOrder(
        lot.lot_id,
        usedOrderId.trim(),
        usedQty ? Number(usedQty) : undefined,
        usedNotes || undefined
      );
      window.location.reload();
    });
  }

  return (
    <div className="space-y-5">
      {/* Header card */}
      <div className="rounded-2xl border border-stone-200 bg-white shadow-sm">
        <div className="flex items-start justify-between border-b border-stone-100 px-6 py-5">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-stone-900">{lot.lot_number}</h1>
              <StatusBadge status={lot.status} />
            </div>
            <p className="mt-1.5 text-sm text-stone-500">
              {lot.crop_type}{lot.variety ? ` · ${lot.variety}` : ""} · Harvested {lot.harvest_date}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap flex-col items-end">
            {(isInTransit || canMarkLoaded) && (
              <div className="flex gap-2 mb-1">
                {isInTransit && (
                  <button
                    onClick={handleMarkAtShed}
                    disabled={isPending}
                    className="rounded-xl border-2 border-blue-300 bg-blue-50 px-4 py-2.5 text-sm font-bold text-blue-700 hover:bg-blue-100 transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                  >
                    {isPending ? "..." : "🏭"} Mark at Shed
                  </button>
                )}
                {canMarkLoaded && (
                  <button
                    onClick={handleMarkLoaded}
                    disabled={isPending}
                    className="rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-bold text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                  >
                    {isPending ? "..." : "🚚"} Mark Loaded
                  </button>
                )}
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => setShowSticker(true)}
                className="rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-semibold text-stone-600 hover:bg-stone-50 transition-colors"
              >
                🖨 Print Sticker
              </button>
              {nextStatuses.length > 0 && (
                <button
                  onClick={() => { setNewStatus(nextStatuses[0]); setShowStatusModal(true); }}
                  className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
                >
                  Update Status
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-2 md:grid-cols-4">
          {[
            { label: "Field / Location", value: lot.field_location ?? "—" },
            { label: "Field Block", value: lot.field_block ?? "—" },
            { label: "Worker", value: lot.worker_name ?? "—" },
            { label: "Packer", value: lot.packer_name ?? "—" },
            { label: "Quantity", value: lot.quantity_lbs != null ? `${lot.quantity_lbs.toLocaleString()} ${lot.yield_unit ?? "lbs"}` : "—" },
            { label: "Yield Est.", value: lot.yield_estimate_lbs != null ? `${lot.yield_estimate_lbs.toLocaleString()} ${lot.yield_unit ?? "lbs"}` : "—" },
            { label: "Pallets", value: lot.pallets != null ? String(lot.pallets) : "—" },
            { label: "Bin ID", value: lot.bin_id ?? "—" },
            { label: "Container ID", value: lot.container_id ?? "—" },
            { label: "Variety", value: lot.variety ?? "—" },
          ].map((item) => (
            <div key={item.label} className="border-r border-b border-stone-100 px-5 py-4 last:border-r-0 even:right-0">
              <p className="text-xs font-medium text-stone-400 uppercase tracking-wide">{item.label}</p>
              <p className="mt-1 text-sm font-bold text-stone-800">{item.value}</p>
            </div>
          ))}
        </div>

        {lot.notes && (
          <div className="border-t border-stone-100 px-5 py-4">
            <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1">Notes</p>
            <p className="text-sm text-stone-600">{lot.notes}</p>
          </div>
        )}

        {/* Quick actions */}
        <div className="flex gap-3 border-t border-stone-100 px-6 py-4 flex-wrap">
          <button
            onClick={() => setShowBinModal(true)}
            className="rounded-xl border border-amber-200 bg-white px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-50 transition-colors"
          >
            🏷️ Add Bin / Tag
          </button>
          <a
            href={`/api/route-trace/trace-report?lotId=${lot.lot_id}&format=csv`}
            download
            className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-stone-600 hover:bg-stone-50 transition-colors flex items-center gap-1.5"
          >
            📄 Download Report
          </a>
          <Link
            href={`/trace/${lot.lot_number}`}
            target="_blank"
            className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-stone-600 hover:bg-stone-50 transition-colors"
          >
            🔍 View Public Trace
          </Link>
        </div>
      </div>

      {/* Fulfilled orders */}
      <div className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-stone-100 px-6 py-4 bg-stone-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>📦</span>
            <h2 className="text-base font-semibold text-stone-900">Order Fulfillment</h2>
          </div>
          {orders.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-green-100 text-green-700 text-xs font-bold px-2.5 py-0.5">
                {orders.length} {orders.length === 1 ? "order" : "orders"}
              </span>
              <span className="text-xs text-stone-400">
                {orders.reduce((sum, o) => sum + Number(o.item_quantity ?? 0), 0).toLocaleString()} lbs total
              </span>
            </div>
          )}
        </div>

        {/* Used / Remaining balance */}
        {lot.quantity_lbs != null && lot.quantity_lbs > 0 && (
          <div className="px-6 py-4 border-b border-stone-100 bg-gradient-to-r from-stone-50 to-white">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-stone-700">Lot Balance</span>
                {lot.quantity_used_lbs != null && lot.quantity_used_lbs > 0 ? (
                  <span className="rounded-full bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5">
                    Partially Used
                  </span>
                ) : (
                  <span className="rounded-full bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5">
                    Fully Available
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-sm">
                {lot.quantity_used_lbs != null && lot.quantity_used_lbs > 0 && (
                  <span className="text-stone-500">
                    <span className="font-bold text-stone-800">{Number(lot.quantity_used_lbs).toLocaleString()}</span> lbs used
                  </span>
                )}
                <span className="font-bold text-stone-800">
                  {Math.max(0, Number(lot.quantity_lbs) - Number(lot.quantity_used_lbs ?? 0)).toLocaleString()}
                </span>
                <span className="text-stone-400">lbs remaining</span>
              </div>
            </div>
            <div className="w-full bg-stone-100 rounded-full h-3 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, ((Number(lot.quantity_used_lbs ?? 0) / Number(lot.quantity_lbs)) * 100))}%`,
                  background: Number(lot.quantity_used_lbs ?? 0) > 0
                    ? "linear-gradient(90deg, #f59e0b 0%, #d97706 100%)"
                    : "linear-gradient(90deg, #22c55e 0%, #16a34a 100%)",
                }}
              />
            </div>
          </div>
        )}

        {orders.length === 0 ? (
          <div className="px-6 py-5 text-center">
            <p className="text-sm text-stone-400">This lot has not been assigned to any orders yet.</p>
            <button
              onClick={() => setShowUsedModal(true)}
              className="mt-3 rounded-xl bg-stone-100 px-4 py-2 text-sm font-semibold text-stone-600 hover:bg-stone-200 transition-colors"
            >
              Mark as Used in Order
            </button>
          </div>
        ) : (
          <div className="p-5 space-y-3">
            {orders.map((order) => (
              <Link
                key={order.id}
                href={`/admin/orders/${order.id}`}
                className="flex items-center justify-between rounded-xl border border-stone-100 bg-stone-50/50 px-5 py-4 hover:bg-stone-100/60 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 flex-shrink-0">
                    <span className="text-base">📦</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-stone-900">{order.customer_name}</p>
                    <p className="text-xs text-stone-400 mt-0.5">{order.stop_name} · {order.order_date}</p>
                  </div>
                </div>
                <div className="text-right flex items-center gap-3">
                  {order.item_quantity != null && (
                    <div>
                      <p className="text-lg font-black text-stone-900">{Number(order.item_quantity).toLocaleString()}</p>
                      <p className="text-xs text-stone-400">lbs allocated</p>
                    </div>
                  )}
                  {order.lot_quantity_used != null && order.lot_quantity_used > 0 && (
                    <div className="border-l border-stone-200 pl-3">
                      <p className="text-lg font-black text-amber-700">{Number(order.lot_quantity_used).toLocaleString()}</p>
                      <p className="text-xs text-stone-400">lbs used</p>
                    </div>
                  )}
                  <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                    order.fulfillment === "pickup" ? "bg-blue-50 text-blue-600" :
                    order.fulfillment === "ship" ? "bg-green-50 text-green-600" :
                    "bg-stone-100 text-stone-500"
                  }`}>
                    {order.fulfillment ?? "mixed"}
                  </span>
                </div>
              </Link>
            ))}
            <button
              onClick={() => setShowUsedModal(true)}
              className="w-full mt-2 rounded-xl border border-dashed border-stone-300 py-2.5 text-xs font-semibold text-stone-500 hover:bg-stone-50 transition-colors"
            >
              + Mark as Used in Another Order
            </button>
          </div>
        )}
      </div>

      {/* Event timeline */}
      <div className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-stone-100 px-6 py-4 bg-stone-50/50">
          <h2 className="text-base font-semibold text-stone-900">Trace Timeline</h2>
          <p className="mt-0.5 text-xs text-stone-400">Complete history — field to delivery</p>
        </div>
        {lot.events.length === 0 ? (
          <div className="p-8 text-center text-sm text-stone-400">No events recorded yet.</div>
        ) : (
          <div className="p-6">
            <div className="relative">
              {lot.events.map((event, idx) => {
                const cfg = EVENT_CONFIG[event.event_type] ?? { icon: "📋", bg: "bg-stone-100 text-stone-600", label: event.event_type };
                const isLast = idx === lot.events.length - 1;
                return (
                  <div key={event.id} className="flex gap-4">
                    {/* Connector line */}
                    {!isLast && (
                      <div className="absolute left-[18px] top-9 w-px bg-stone-200" style={{ height: `calc(100% - 36px)` }} />
                    )}
                    <div className="relative flex flex-col items-center">
                      <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-base ring-2 ring-white ${cfg.bg}`}>
                        {cfg.icon}
                      </div>
                    </div>
                    <div className={`pb-6 pt-0.5 ${isLast ? "!pb-0" : ""}`}>
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-semibold text-stone-800">{cfg.label}</span>
                        <span className="text-xs text-stone-400">
                          {new Date(event.event_time).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                        </span>
                      </div>
                      {event.location && (
                        <p className="mt-0.5 text-xs text-stone-500">📍 {event.location}</p>
                      )}
                      {event.bin_id && (
                        <p className="mt-0.5 text-xs font-bold text-amber-700">🏷️ Bin: {event.bin_id}</p>
                      )}
                      {event.notes && (
                        <p className="mt-0.5 text-xs text-stone-400 italic">{event.notes}</p>
                      )}
                      {event.created_by_name && (
                        <p className="mt-0.5 text-xs text-stone-300">by {event.created_by_name}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Status update modal */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <form onSubmit={handleUpdateStatus}>
              <div className="border-b border-stone-100 px-6 py-4">
                <h3 className="text-base font-semibold text-stone-900">Update Status</h3>
              </div>
              <div className="space-y-4 p-6">
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-1.5">New Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    required
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-3 text-sm outline-none focus:border-emerald-600"
                  >
                    <option value="">Select status...</option>
                    {STATUS_FLOW.filter((s) => s !== lot.status).map((s) => {
                      const c = EVENT_CONFIG[s];
                      return (
                        <option key={s} value={s}>
                          {c?.icon} {c?.label ?? s}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-1.5">Location</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Warehouse A"
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-3 text-sm outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-1.5">Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any notes..."
                    rows={2}
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-3 text-sm outline-none focus:border-emerald-600 resize-none"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 border-t border-stone-100 px-6 py-4">
                <button type="button" onClick={() => setShowStatusModal(false)} className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-600 hover:bg-stone-50">
                  Cancel
                </button>
                <button type="submit" disabled={isPending || !newStatus} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
                  {isPending ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Bin modal */}
      {showBinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <form onSubmit={handleAddBin}>
              <div className="border-b border-stone-100 px-6 py-4">
                <h3 className="text-base font-semibold text-stone-900">🏷️ Add Bin / Tag</h3>
                <p className="mt-0.5 text-xs text-stone-400">Log a bin or pallet tag event for this lot</p>
              </div>
              <div className="space-y-4 p-6">
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-1.5">Bin or Container ID *</label>
                  <input
                    type="text"
                    value={binId}
                    onChange={(e) => setBinId(e.target.value)}
                    placeholder="e.g. BIN-042"
                    required
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-3 text-sm outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-1.5">Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Weight, count, or other details..."
                    rows={2}
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-3 text-sm outline-none focus:border-emerald-600 resize-none"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 border-t border-stone-100 px-6 py-4">
                <button type="button" onClick={() => setShowBinModal(false)} className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-600 hover:bg-stone-50">
                  Cancel
                </button>
                <button type="submit" disabled={isPending || !binId} className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50">
                  {isPending ? "Adding..." : "Add Bin Tag"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSticker && <StickerPreviewModal lot={lot} onClose={() => setShowSticker(false)} />}

      {/* Mark as Used in Order modal */}
      {showUsedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <form onSubmit={handleMarkUsedInOrder}>
              <div className="border-b border-stone-100 px-6 py-4">
                <h3 className="text-base font-semibold text-stone-900">📦 Mark as Used in Order</h3>
                <p className="mt-0.5 text-xs text-stone-400">Record which order this lot was assigned to</p>
              </div>
              <div className="space-y-4 p-6">
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-1.5">Order ID *</label>
                  <input
                    type="text"
                    value={usedOrderId}
                    onChange={(e) => setUsedOrderId(e.target.value.toUpperCase())}
                    placeholder="e.g. 4f3e2a1b-..."
                    required
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-3 text-sm font-mono outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-1.5">Quantity Used (lbs)</label>
                  <input
                    type="number"
                    value={usedQty}
                    onChange={(e) => setUsedQty(e.target.value)}
                    placeholder="Leave blank to auto-detect from order items"
                    min="0"
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-3 text-sm outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-1.5">Notes</label>
                  <textarea
                    value={usedNotes}
                    onChange={(e) => setUsedNotes(e.target.value)}
                    placeholder="Any notes..."
                    rows={2}
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-3 text-sm outline-none focus:border-emerald-600 resize-none"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 border-t border-stone-100 px-6 py-4">
                <button type="button" onClick={() => setShowUsedModal(false)} className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-600 hover:bg-stone-50">
                  Cancel
                </button>
                <button type="submit" disabled={isPending || !usedOrderId.trim()} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
                  {isPending ? "Saving..." : "Mark as Used"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}