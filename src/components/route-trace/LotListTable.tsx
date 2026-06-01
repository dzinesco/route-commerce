"use client";

import { useState } from "react";
import Link from "next/link";
import StatusBadge from "./StatusBadge";
import { HarvestLot, updateHarvestLotStatus } from "@/actions/route-trace/lots";

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "active", label: "Active" },
  { value: "in_transit", label: "In Transit" },
  { value: "at_shed", label: "At Shed" },
  { value: "packed", label: "Packed" },
  { value: "delivered", label: "Delivered" },
];

function getAgeStatus(harvestDate: string): { label: string; className: string; days: number } | null {
  const harvested = new Date(harvestDate + "T00:00:00");
  const now = new Date();
  const days = Math.floor((now.getTime() - harvested.getTime()) / (1000 * 60 * 60 * 24));
  if (days < 0) return null;
  if (days <= 3) return { label: `${days}d`, className: "bg-green-100 text-green-700", days };
  if (days <= 7) return { label: `${days}d`, className: "bg-amber-100 text-amber-700", days };
  if (days <= 14) return { label: `${days}d`, className: "bg-orange-100 text-orange-700", days };
  return { label: `${days}d`, className: "bg-red-100 text-red-700", days };
}

export default function LotListTable({
  initialLots,
  brandId,
}: {
  initialLots: HarvestLot[];
  brandId: string;
}) {
  const [filter, setFilter] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showBulk, setShowBulk] = useState(false);

  const filtered = initialLots.filter((lot) => {
    if (filter && lot.status !== filter) return false;
    if (query) {
      const q = query.toLowerCase();
      if (
        !lot.lot_number.toLowerCase().includes(q) &&
        !lot.crop_type.toLowerCase().includes(q) &&
        !(lot.field_location ?? "").toLowerCase().includes(q) &&
        !(lot.bin_id ?? "").toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((l) => l.id)));
    }
  }

  async function handleBulkStickers(type: "field" | "shed") {
    if (selected.size === 0) return;
    const ids = [...selected];
    for (const id of ids) {
      window.open(`/api/route-trace/sticker-pdf?lotId=${id}&type=${type}&size=4x2&copies=1`, "_blank");
    }
  }

  function handleBulkExport() {
    if (selected.size === 0) return;
    const ids = [...selected];
    ids.forEach((id) => {
      window.location.href = `/api/route-trace/trace-report?lotId=${id}&format=csv`;
    });
  }

  function handleBulkMarkUsed() {
    if (selected.size === 0) return;
    const ids = [...selected];
    if (ids.length === 1) {
      window.location.href = `/admin/route-trace/lots/${ids[0]}`;
    } else {
      window.location.href = `/admin/route-trace/lots?bulk_mark=${ids.join(",")}`;
    }
  }

  async function handleBulkMarkLoaded() {
    if (selected.size === 0) return;
    const ids = [...selected];
    for (const id of ids) {
      await updateHarvestLotStatus(id, "in_transit");
    }
    window.location.reload();
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-1 rounded-xl border border-stone-200 bg-white p-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                filter === f.value
                  ? "bg-stone-900 text-white"
                  : "text-stone-600 hover:bg-stone-50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Search lot #, crop, field, or bin..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-56 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-stone-900"
          />
          <button
            onClick={() => { setShowBulk(!showBulk); setSelected(new Set()); }}
            className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors ${
              showBulk ? "border-stone-900 bg-stone-900 text-white" : "border-stone-200 text-stone-600 hover:bg-stone-50"
            }`}
          >
            ☑ Bulk {showBulk ? "On" : "Off"}
          </button>
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="rounded-2xl border-2 border-stone-900 bg-stone-900 px-5 py-3 flex items-center justify-between">
          <span className="text-sm font-bold text-white">{selected.size} lot{selected.size !== 1 ? "s" : ""} selected</span>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleBulkMarkLoaded}
              className="rounded-xl bg-amber-600 hover:bg-amber-500 px-4 py-2 text-sm font-bold text-white transition-colors"
            >
              🚚 Mark Loaded
            </button>
            <button
              onClick={handleBulkMarkUsed}
              className="rounded-xl bg-amber-600 hover:bg-amber-500 px-4 py-2 text-sm font-bold text-white transition-colors"
            >
              📦 Mark as Used
            </button>
            <button
              onClick={() => handleBulkStickers("field")}
              className="rounded-xl bg-white/20 hover:bg-white/30 px-4 py-2 text-sm font-bold text-white transition-colors"
            >
              🖨 Field Stickers
            </button>
            <button
              onClick={() => handleBulkStickers("shed")}
              className="rounded-xl bg-white/20 hover:bg-white/30 px-4 py-2 text-sm font-bold text-white transition-colors"
            >
              🖨 Shed Stickers
            </button>
            <button
              onClick={handleBulkExport}
              className="rounded-xl bg-white/20 hover:bg-white/30 px-4 py-2 text-sm font-bold text-white transition-colors"
            >
              📄 {selected.size === 1 ? "Report" : `${selected.size} Reports`}
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="rounded-xl border border-white/30 px-4 py-2 text-sm font-medium text-white/70 hover:text-white transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-stone-200 bg-white py-16 text-center">
          <p className="text-sm text-stone-400">No lots found</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50">
                {showBulk && (
                  <th className="px-5 py-3.5 w-10">
                    <input
                      type="checkbox"
                      checked={selected.size === filtered.length && filtered.length > 0}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-stone-300"
                    />
                  </th>
                )}
                {["Lot #", "Crop / Variety", "Harvest Date", "Age", "Field", "Bins", "Qty", "Status"].map((h) => (
                  <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-stone-400 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((lot) => (
                <tr key={lot.id} className={`border-b border-stone-50 last:border-0 hover:bg-stone-50/50 transition-colors ${selected.has(lot.id) ? "bg-green-50" : ""}`}>
                  {showBulk && (
                    <td className="px-5 py-4">
                      <input
                        type="checkbox"
                        checked={selected.has(lot.id)}
                        onChange={() => toggleSelect(lot.id)}
                        className="h-4 w-4 rounded border-stone-300"
                      />
                    </td>
                  )}
                  <td className="px-5 py-4">
                    <Link href={`/admin/route-trace/lots/${lot.id}`} className="font-mono text-sm font-black text-stone-900 hover:text-blue-600">
                      {lot.lot_number}
                    </Link>
                  </td>
                  <td className="px-5 py-4">
                    <div className="text-sm font-semibold text-stone-700">{lot.crop_type}</div>
                    {lot.variety && <div className="text-xs text-stone-400">{lot.variety}</div>}
                  </td>
                  <td className="px-5 py-4">
                    {(() => {
                      const age = getAgeStatus(lot.harvest_date);
                      return age ? (
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${age.className}`}>
                          {age.label}
                        </span>
                      ) : (
                        <span className="text-stone-300 text-xs">—</span>
                      );
                    })()}
                  </td>
                  <td className="px-5 py-4">
                    <div className="text-sm text-stone-700">{lot.field_location ?? "—"}</div>
                    {lot.field_block && <div className="text-xs text-stone-400">Block: {lot.field_block}</div>}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex gap-1 flex-wrap">
                      {lot.bin_id && (
                        <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
                          {lot.bin_id}
                        </span>
                      )}
                      {lot.pallets != null && (
                        <span className="inline-flex rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600">
                          {lot.pallets} PLT
                        </span>
                      )}
                      {!lot.bin_id && lot.pallets == null && <span className="text-stone-300 text-xs">—</span>}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-stone-600">
                    {lot.quantity_lbs != null ? `${lot.quantity_lbs.toLocaleString()} ${lot.yield_unit ?? "lbs"}` : "—"}
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={lot.status} />
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link href={`/admin/route-trace/lots/${lot.id}`} className="text-sm font-semibold text-blue-600 hover:text-blue-800">
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}