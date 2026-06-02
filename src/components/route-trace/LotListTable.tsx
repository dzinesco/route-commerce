"use client";

import { useState } from "react";
import Link from "next/link";
import StatusBadge from "./StatusBadge";
import { HaulingLot, updateHarvestLotStatus } from "@/actions/route-trace/lots";

// One-color outline icons matching the design system
const Icons = {
  clipboard: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
      <path d="M12 11h4M12 16h4M8 11h.01M8 16h.01"/>
    </svg>
  ),
  search: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/>
      <path d="m21 21-4.3-4.3"/>
    </svg>
  ),
  plus: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5v14"/>
    </svg>
  ),
  truck: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/>
      <path d="M15 18H9"/>
      <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/>
      <circle cx="17" cy="18" r="2"/>
      <circle cx="7" cy="18" r="2"/>
    </svg>
  ),
  package: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16.5 9.4 7.55 4.24"/>
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
      <polyline points="3.29 7 12 12 20.71 7"/>
      <line x1="12" x2="12" y1="22" y2="12"/>
    </svg>
  ),
  printer: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
      <path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6"/>
      <rect x="6" y="14" width="12" height="8" rx="1"/>
    </svg>
  ),
  file: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" x2="8" y1="13" y2="13"/>
      <line x1="16" x2="8" y1="17" y2="17"/>
      <line x1="10" x2="8" y1="9" y2="9"/>
    </svg>
  ),
  camera: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  ),
};

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
  onCreateNew,
}: {
  initialLots: HaulingLot[];
  brandId: string;
  onCreateNew?: () => void;
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
      setSelected(new Set(filtered.map((l) => l.lot_id)));
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
    <div className="space-y-5">
      {/* Search and filters */}
      <div className="rounded-2xl border border-stone-200 bg-white">
        <div className="border-b border-stone-100 px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--admin-accent-light)] shadow-sm">
                {Icons.clipboard("w-5 h-5 text-[var(--admin-accent)]")}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-stone-900">All Lots</h2>
                <p className="text-sm text-stone-500">{filtered.length} lot{filtered.length !== 1 ? "s" : ""}</p>
              </div>
            </div>
            <button
              onClick={onCreateNew}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 transition-colors shadow-sm"
            >
              {Icons.plus("h-4 w-4")}
              <span>New Lot</span>
            </button>
          </div>
        </div>
        <div className="p-6 space-y-4">
          {/* Filter bar */}
          <div className="flex gap-1 rounded-xl border border-stone-200 bg-stone-50 p-1">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors flex-1 ${
                  filter === f.value
                    ? "bg-emerald-600 text-white"
                    : "text-stone-600 hover:bg-white"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          {/* Search */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">{Icons.search("h-4 w-4")}</span>
              <input
                type="text"
                placeholder="Search lot #, crop, field, or bin..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full rounded-xl border border-stone-200 bg-stone-50 pl-9 pr-4 py-3 text-base outline-none focus:border-emerald-600 focus:bg-white transition-colors"
              />
            </div>
            <button
              onClick={() => { setShowBulk(!showBulk); setSelected(new Set()); }}
              className={`rounded-xl border px-4 py-3 text-sm font-semibold transition-colors flex items-center gap-2 ${
                showBulk ? "border-emerald-600 bg-emerald-600 text-white" : "border-stone-200 text-stone-600 hover:bg-stone-50"
              }`}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points={showBulk ? "9 11 12 14 22 4" : "3 6 9 12 15 18"}/>
              </svg>
              <span className="hidden sm:inline">Bulk {showBulk ? "On" : "Off"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="rounded-2xl border-2 border-emerald-600 bg-emerald-600 px-5 py-3 flex items-center justify-between">
          <span className="text-sm font-bold text-white">{selected.size} lot{selected.size !== 1 ? "s" : ""} selected</span>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleBulkMarkLoaded}
              className="rounded-xl bg-amber-600 hover:bg-amber-500 px-4 py-2 text-sm font-bold text-white transition-colors flex items-center gap-1.5"
            >
              {Icons.truck("h-4 w-4")}
              <span>Mark Loaded</span>
            </button>
            <button
              onClick={handleBulkMarkUsed}
              className="rounded-xl bg-amber-600 hover:bg-amber-500 px-4 py-2 text-sm font-bold text-white transition-colors flex items-center gap-1.5"
            >
              {Icons.package("h-4 w-4")}
              <span>Mark as Used</span>
            </button>
            <button
              onClick={() => handleBulkStickers("field")}
              className="rounded-xl bg-white/20 hover:bg-white/30 px-4 py-2 text-sm font-bold text-white transition-colors flex items-center gap-1.5"
            >
              {Icons.printer("h-4 w-4")}
              <span>Field Stickers</span>
            </button>
            <button
              onClick={() => handleBulkStickers("shed")}
              className="rounded-xl bg-white/20 hover:bg-white/30 px-4 py-2 text-sm font-bold text-white transition-colors flex items-center gap-1.5"
            >
              {Icons.printer("h-4 w-4")}
              <span>Shed Stickers</span>
            </button>
            <button
              onClick={handleBulkExport}
              className="rounded-xl bg-white/20 hover:bg-white/30 px-4 py-2 text-sm font-bold text-white transition-colors flex items-center gap-1.5"
            >
              {Icons.file("h-4 w-4")}
              <span>{selected.size === 1 ? "Report" : `${selected.size} Reports`}</span>
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
          <div className="text-stone-300 mb-3">{Icons.search("h-10 w-10")}</div>
          <p className="text-sm text-stone-500">No lots found</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden shadow-sm">
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
                <tr key={lot.lot_id} className={`border-b border-stone-50 last:border-0 hover:bg-stone-50/50 transition-colors ${selected.has(lot.lot_id) ? "bg-green-50" : ""}`}>
                  {showBulk && (
                    <td className="px-5 py-4">
                      <input
                        type="checkbox"
                        checked={selected.has(lot.lot_id)}
                        onChange={() => toggleSelect(lot.lot_id)}
                        className="h-4 w-4 rounded border-stone-300"
                      />
                    </td>
                  )}
                  <td className="px-5 py-4">
                    <Link href={`/admin/route-trace/lots/${lot.lot_id}`} className="font-mono text-sm font-black text-stone-900 hover:text-blue-600">
                      {lot.lot_number}
                    </Link>
                  </td>
                  <td className="px-5 py-4">
                    <div className="text-sm font-semibold text-stone-700">{lot.crop_type}</div>
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
                    <Link href={`/admin/route-trace/lots/${lot.lot_id}`} className="text-sm font-semibold text-blue-600 hover:text-blue-800">
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