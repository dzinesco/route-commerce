"use client";

import { useState } from "react";
import Link from "next/link";
import RouteTraceNav from "./RouteTraceNav";
import QRScanModal from "./QRScanModal";
import QuickNewLotDrawer from "./QuickNewLotDrawer";
import FsmaReportModal from "./FsmaReportModal";
import {
  RouteTraceStats,
  HaulingLot,
  FieldYieldSummary,
  InventoryByCrop,
  RecentLotEvent,
} from "@/actions/route-trace/lots";

const STATUS_CONFIG: Record<string, { label: string; icon: string; bg: string; text: string }> = {
  active_count: { label: "Active Lots", icon: "🌱", bg: "bg-green-50", text: "text-green-700" },
  in_transit_count: { label: "In Transit", icon: "🚚", bg: "bg-amber-50", text: "text-amber-700" },
  at_shed_count: { label: "At Shed", icon: "🏭", bg: "bg-blue-50", text: "text-blue-700" },
  total_lots_today: { label: "Harvested Today", icon: "🌾", bg: "bg-stone-50", text: "text-stone-700" },
};

const EVENT_ICON_SHORT: Record<string, string> = {
  harvested: "🌱",
  field_packed: "📦",
  bin_tagged: "🏷",
  in_transit: "🚚",
  at_shed: "🏭",
  packed: "📋",
  delivered: "✅",
  marked_used: "📋",
};

const EVENT_LABEL: Record<string, string> = {
  harvested: "Harvested",
  field_packed: "Field Packed",
  bin_tagged: "Bin Tagged",
  in_transit: "In Transit",
  at_shed: "Received at Shed",
  packed: "Packed",
  delivered: "Delivered",
  marked_used: "Used in Order",
};

type LotWithAction = HaulingLot & { suggestedAction: string; suggestedIcon: string };

function buildHaulingBoard(lots: HaulingLot[]): Record<string, LotWithAction[]> {
  const board: Record<string, LotWithAction[]> = {
    in_transit: [],
    at_shed: [],
    packed: [],
  };

  for (const lot of lots) {
    let suggestedAction = "";
    let suggestedIcon = "";
    if (lot.status === "active" || lot.status === "in_transit") {
      suggestedAction = "Mark Loaded";
      suggestedIcon = "🚚";
    } else if (lot.status === "at_shed") {
      suggestedAction = "Mark Received";
      suggestedIcon = "🏭";
    } else if (lot.status === "packed") {
      suggestedAction = "Mark Delivered";
      suggestedIcon = "✅";
    }

    const entry: LotWithAction = { ...lot, suggestedAction, suggestedIcon };

    if (board[lot.status]) {
      board[lot.status].push(entry);
    }
  }

  return board;
}

// ── Activity Feed ────────────────────────────────────────────────────────────────
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function ActivityFeed({ events }: { events: RecentLotEvent[] }) {
  if (events.length === 0) return null;

  return (
    <div className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-stone-100 px-5 py-3.5 flex items-center justify-between bg-stone-50/40">
        <div className="flex items-center gap-2">
          <span className="text-sm">⚡</span>
          <h2 className="text-sm font-semibold text-stone-900">Recent Activity</h2>
        </div>
        <span className="text-[10px] text-stone-400 font-medium">Last 10 events</span>
      </div>
      <div className="divide-y divide-stone-50">
        {events.map((evt) => (
          <div key={evt.event_id} className="px-5 py-3.5 hover:bg-stone-50/40 transition-colors flex items-start gap-3.5">
            <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm ${
              evt.event_type === "harvested" || evt.event_type === "field_packed" ? "bg-green-100 text-green-700" :
              evt.event_type === "in_transit" || evt.event_type === "bin_tagged" ? "bg-amber-100 text-amber-700" :
              evt.event_type === "at_shed" ? "bg-blue-100 text-blue-700" :
              evt.event_type === "packed" ? "bg-purple-100 text-purple-700" :
              "bg-stone-100 text-stone-600"
            }`}>
              {EVENT_ICON_SHORT[evt.event_type] ?? "📋"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-semibold text-stone-800 leading-tight">
                  {EVENT_LABEL[evt.event_type] ?? evt.event_type}
                </p>
                <span className="text-[10px] text-stone-400 flex-shrink-0 font-medium">
                  {timeAgo(evt.event_time)}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs font-bold text-stone-600">{evt.crop_type}</span>
                <span className="text-stone-300">·</span>
                <Link
                  href={`/admin/route-trace/lots/${evt.lot_id}`}
                  className="text-xs font-mono font-bold text-blue-600 hover:text-blue-800"
                >
                  {evt.lot_number}
                </Link>
                {evt.location && (
                  <>
                    <span className="text-stone-300">·</span>
                    <span className="text-xs text-stone-400 truncate">{evt.location}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Hauling Column ─────────────────────────────────────────────────────────────
function HaulingColumn({
  title,
  icon,
  bgHeader,
  lots,
  emptyMessage,
}: {
  title: string;
  icon: string;
  bgHeader: string;
  lots: LotWithAction[];
  emptyMessage: string;
}) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden flex-1 min-w-[260px]">
      <div className={`px-4 py-3 border-b border-stone-100 flex items-center gap-2 ${bgHeader}`}>
        <span className="text-lg">{icon}</span>
        <h3 className="text-sm font-semibold text-stone-900">{title}</h3>
        <span className="ml-auto rounded-full bg-white/80 text-stone-600 text-xs font-bold px-2 py-0.5">
          {lots.length}
        </span>
      </div>
      {lots.length === 0 ? (
        <div className="p-5 text-center text-xs text-stone-400">{emptyMessage}</div>
      ) : (
        <div className="divide-y divide-stone-100">
          {lots.map((lot) => (
            <div key={lot.lot_id} className="px-4 py-3 hover:bg-stone-50/40 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link
                    href={`/admin/route-trace/lots/${lot.lot_id}`}
                    className="font-mono text-sm font-bold text-stone-900 hover:text-blue-600 truncate block"
                  >
                    {lot.lot_number}
                  </Link>
                  <p className="text-xs text-stone-500 mt-0.5 truncate">
                    {lot.crop_type} · {lot.field_location ?? "No field"}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    {lot.bin_id && (
                      <span className="inline-flex rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold px-1.5 py-0.5">
                        BIN {lot.bin_id}
                      </span>
                    )}
                    {lot.pallets && (
                      <span className="inline-flex text-[10px] text-stone-400 font-medium">{lot.pallets} PLT</span>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  {lot.quantity_lbs && (
                    <p className="text-sm font-semibold text-stone-700">
                      {Number(lot.quantity_lbs).toLocaleString()}
                      <span className="text-[10px] text-stone-400 font-normal ml-0.5">{lot.yield_unit ?? "lbs"}</span>
                    </p>
                  )}
                </div>
              </div>
              {lot.suggestedAction && (
                <div className="mt-2">
                  <Link
                    href={`/admin/route-trace/lots/${lot.lot_id}`}
                    className="inline-flex items-center gap-1 rounded-lg bg-stone-100 px-2.5 py-1.5 text-xs font-semibold text-stone-600 hover:bg-stone-200 transition-colors"
                  >
                    {lot.suggestedIcon} {lot.suggestedAction}
                  </Link>
                </div>
              )}
              {lot.destination_stop_name && (
                <p className="mt-1 text-[10px] text-stone-400">→ {lot.destination_stop_name}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Inventory by Crop ──────────────────────────────────────────────────────────
function InventoryByCropSection({ inventoryByCrop }: { inventoryByCrop: InventoryByCrop[] }) {
  if (inventoryByCrop.length === 0) return null;

  const byCrop: Record<string, InventoryByCrop[]> = {};
  for (const row of inventoryByCrop) {
    if (!byCrop[row.crop_type]) byCrop[row.crop_type] = [];
    byCrop[row.crop_type].push(row);
  }

  const cropEntries = Object.entries(byCrop).slice(0, 12);

  return (
    <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden shadow-sm">
      <div className="border-b border-stone-100 px-6 py-4 flex items-center justify-between bg-stone-50/40">
        <div className="flex items-center gap-2">
          <span>📦</span>
          <h2 className="text-sm font-semibold text-stone-900">Inventory by Crop</h2>
        </div>
        <span className="text-[10px] text-stone-400">Harvested · In Transit · At Shed · Packed</span>
      </div>
      <div className="divide-y divide-stone-100">
        {cropEntries.map(([crop, rows]) => {
          const totalActual = rows.reduce((s, r) => s + Number(r.total_lbs ?? 0), 0);
          const totalEstimate = rows.reduce((s, r) => s + Number(r.total_estimate ?? 0), 0);
          const lotCount = rows.reduce((s, r) => s + Number(r.lot_count ?? 0), 0);
          const variance = totalEstimate > 0 ? Math.round(((totalActual - totalEstimate) / totalEstimate) * 100) : null;
          const byStatus: Record<string, number> = {};
          for (const r of rows) byStatus[r.status] = Number(r.total_lbs ?? 0);
          const active = byStatus["active"] ?? 0;
          const inTransit = byStatus["in_transit"] ?? 0;
          const atShed = byStatus["at_shed"] ?? 0;
          const packed = byStatus["packed"] ?? 0;

          return (
            <div key={crop} className="px-6 py-4">
              <div className="flex items-center justify-between mb-1">
                <div>
                  <p className="text-sm font-bold text-stone-900">{crop}</p>
                  <p className="text-[10px] text-stone-400">{lotCount} lot{lotCount !== 1 ? "s" : ""}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xl font-black text-stone-900">
                      {totalActual > 0 ? Number(totalActual).toLocaleString() : "—"}
                    </p>
                    <p className="text-[10px] text-stone-400">{rows[0]?.yield_unit ?? "lbs"} actual</p>
                  </div>
                  {totalEstimate > 0 && (
                    <div className="text-right">
                      <p className="text-sm font-semibold text-stone-600">
                        {Number(totalEstimate).toLocaleString()}
                        <span className="text-[10px] text-stone-400 ml-0.5">est</span>
                      </p>
                      <p className={`text-xs font-bold ${variance !== null ? (variance >= 0 ? "text-green-600" : "text-red-600") : "text-stone-400"}`}>
                        {variance !== null ? `${variance > 0 ? "+" : ""}${variance}%` : "—"}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-1">
                <div className="flex-1 bg-stone-50 rounded-lg px-2 py-1.5 text-center min-w-0">
                  <p className="text-sm font-black text-stone-800">{active > 0 ? Number(active).toLocaleString() : "—"}</p>
                  <p className="text-[9px] text-stone-400">🌱</p>
                </div>
                <div className="flex-1 bg-stone-50 rounded-lg px-2 py-1.5 text-center min-w-0">
                  <p className="text-sm font-black text-stone-800">{inTransit > 0 ? Number(inTransit).toLocaleString() : "—"}</p>
                  <p className="text-[9px] text-stone-400">🚚</p>
                </div>
                <div className="flex-1 bg-stone-50 rounded-lg px-2 py-1.5 text-center min-w-0">
                  <p className="text-sm font-black text-stone-800">{atShed > 0 ? Number(atShed).toLocaleString() : "—"}</p>
                  <p className="text-[9px] text-stone-400">🏭</p>
                </div>
                <div className="flex-1 bg-stone-50 rounded-lg px-2 py-1.5 text-center min-w-0">
                  <p className="text-sm font-black text-stone-800">{packed > 0 ? Number(packed).toLocaleString() : "—"}</p>
                  <p className="text-[9px] text-stone-400">📦</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Field Yield Table ─────────────────────────────────────────────────────────
function FieldYieldTable({ fieldYield }: { fieldYield: FieldYieldSummary[] }) {
  if (fieldYield.length === 0) return null;

  return (
    <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden shadow-sm">
      <div className="border-b border-stone-100 px-6 py-4 flex items-center justify-between bg-stone-50/40">
        <div className="flex items-center gap-2">
          <span>📊</span>
          <h2 className="text-sm font-semibold text-stone-900">Field Yield Summary</h2>
        </div>
      </div>
      <table className="w-full">
        <thead>
          <tr className="border-b border-stone-100">
            <th className="px-6 py-3 text-left text-[10px] font-bold text-stone-400 uppercase tracking-widest">Field</th>
            <th className="px-6 py-3 text-right text-[10px] font-bold text-stone-400 uppercase tracking-widest">Est. Yield</th>
            <th className="px-6 py-3 text-right text-[10px] font-bold text-stone-400 uppercase tracking-widest">Actual</th>
            <th className="px-6 py-3 text-right text-[10px] font-bold text-stone-400 uppercase tracking-widest">Lots</th>
          </tr>
        </thead>
        <tbody>
          {fieldYield.map((row, idx) => (
            <tr key={idx} className="border-b border-stone-50 last:border-0 hover:bg-stone-50/30 transition-colors">
              <td className="px-6 py-3.5">
                <p className="text-sm font-semibold text-stone-800">{row.field_location}</p>
                {row.field_block !== "N/A" && <p className="text-[10px] text-stone-400">Block {row.field_block}</p>}
              </td>
              <td className="px-6 py-3.5 text-right">
                <span className="text-sm font-semibold text-stone-600">
                  {row.total_yield_estimate > 0 ? `${Number(row.total_yield_estimate).toLocaleString()} ${row.yield_unit ?? "lbs"}` : "—"}
                </span>
              </td>
              <td className="px-6 py-3.5 text-right">
                <span className="text-sm text-stone-700">
                  {row.total_quantity_lbs > 0 ? `${Number(row.total_quantity_lbs).toLocaleString()} ${row.yield_unit ?? "lbs"}` : "—"}
                </span>
              </td>
              <td className="px-6 py-3.5 text-right">
                <span className="inline-flex items-center rounded-full bg-green-50 text-green-700 px-2.5 py-0.5 text-xs font-bold">
                  {row.active_lots}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function RouteTraceDashboard({
  stats,
  recentLots,
  haulingLots,
  fieldYield,
  inventoryByCrop,
  recentActivity,
  brandId,
}: {
  stats: RouteTraceStats;
  recentLots: HaulingLot[];
  haulingLots: HaulingLot[];
  fieldYield: FieldYieldSummary[];
  inventoryByCrop: InventoryByCrop[];
  recentActivity: RecentLotEvent[];
  brandId: string;
}) {
  const [search, setSearch] = useState("");
  const [showScan, setShowScan] = useState(false);
  const [showQuickNew, setShowQuickNew] = useState(false);
  const [searchCrop, setSearchCrop] = useState("");

  const haulingBoard = buildHaulingBoard(haulingLots);

  const totalHaulingLots = haulingBoard.in_transit.length + haulingBoard.at_shed.length + haulingBoard.packed.length;
  const hasAnyLots = totalHaulingLots > 0;

  const statEntries = [
    { key: "active_count", value: stats.active_count ?? 0 },
    { key: "in_transit_count", value: stats.in_transit_count ?? 0 },
    { key: "at_shed_count", value: stats.at_shed_count ?? 0 },
    { key: "total_lots_today", value: stats.total_lots_today ?? 0 },
  ] as const;

  return (
    <div className="space-y-5">
      <RouteTraceNav activeTab="dashboard" />

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statEntries.map(({ key, value }) => {
          const cfg = STATUS_CONFIG[key];
          return (
            <div key={key} className={`rounded-2xl ${cfg.bg} border border-transparent px-5 py-4`}>
              <div className="flex items-center gap-1.5">
                <span className="text-lg">{cfg.icon}</span>
                <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">{cfg.label}</span>
              </div>
              <p className={`mt-1.5 text-3xl font-black ${cfg.text}`}>{value}</p>
            </div>
          );
        })}
        {/* Total lots — spans across */}
        <div className="rounded-2xl bg-stone-100 border border-stone-200 px-5 py-4">
          <div className="flex items-center gap-1.5">
            <span className="text-lg">📋</span>
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Total Lots</span>
          </div>
          <p className="mt-1.5 text-3xl font-black text-stone-700">{stats.total_lots ?? 0}</p>
        </div>
      </div>

      {/* ── Activity feed ── */}
      <ActivityFeed events={recentActivity} />

      {/* ── Compliance summary ── */}
      {inventoryByCrop.length > 0 && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50/50 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100">
              <span className="text-sm">📋</span>
            </div>
            <div>
              <p className="text-sm font-bold text-blue-900">Compliance Summary</p>
              <p className="text-[10px] text-blue-600/70">This period</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            {(() => {
              const totalLots = inventoryByCrop.reduce((s, r) => s + Number(r.lot_count ?? 0), 0);
              const totalLbs = inventoryByCrop.reduce((s, r) => s + Number(r.total_lbs ?? 0), 0);
              const cropCount = inventoryByCrop.length;
              return [
                { label: "Total Lots", value: totalLots.toLocaleString() },
                { label: "Total lbs", value: totalLbs > 0 ? totalLbs.toLocaleString() : "—" },
                { label: "Crops", value: String(cropCount) },
              ];
            })().map((m) => (
              <div key={m.label} className="text-center">
                <p className="text-lg font-black text-blue-800">{m.value}</p>
                <p className="text-[10px] text-blue-500/70 font-bold">{m.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Inventory by crop ── */}
      <InventoryByCropSection inventoryByCrop={inventoryByCrop} />

      {/* ── Quick actions ── */}
      <div className="flex gap-2.5 flex-wrap">
        <button
          onClick={() => setShowQuickNew(true)}
          className="rounded-xl bg-green-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-green-700 active:bg-green-800 transition-colors flex items-center gap-2 shadow-sm"
        >
          🌱 Quick New Lot
        </button>
        <button
          onClick={() => setShowScan(true)}
          className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 transition-colors flex items-center gap-2"
        >
          📷 Scan QR
        </button>
        <button
          onClick={() => {
            const end = new Date();
            const start = new Date();
            start.setDate(start.getDate() - 30);
            const fmt = (d: Date) => d.toISOString().split("T")[0];
            window.location.href = `/api/route-trace/fsma-report?brandId=${brandId}&startDate=${fmt(start)}&endDate=${fmt(end)}&format=csv`;
          }}
          className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-bold text-blue-700 hover:bg-blue-100 transition-colors flex items-center gap-2"
        >
          📊 Compliance Snapshot
        </button>
        <Link
          href="/admin/route-trace/lots/new"
          className="rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-600 hover:bg-stone-50 transition-colors"
        >
          + New Lot
        </Link>
        <Link
          href="/admin/route-trace/lots"
          className="rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-600 hover:bg-stone-50 transition-colors"
        >
          All Lots →
        </Link>
        <FsmaReportModal brandId={brandId} />
      </div>

      {/* ── Hauling board ── */}
      {hasAnyLots && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <h2 className="text-sm font-bold text-stone-700 uppercase tracking-wider">Hauling Board</h2>
              <span className="rounded-full bg-stone-100 text-stone-600 text-[10px] font-bold px-2.5 py-0.5">
                {totalHaulingLots} lots
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-xs">🔍</span>
              <input
                type="text"
                placeholder="Lot, crop, field…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-lg border border-stone-200 bg-white text-xs text-stone-700 placeholder:text-stone-400 focus:outline-none focus:border-stone-400 w-40"
              />
              <select
                value={searchCrop}
                onChange={(e) => setSearchCrop(e.target.value)}
                className="rounded-lg border border-stone-200 bg-white text-xs text-stone-700 px-2 py-1.5 focus:outline-none focus:border-stone-400"
              >
                <option value="">All Crops</option>
                {[...new Set(haulingLots.map((l) => l.crop_type))].sort().map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <HaulingColumn
              title="In Transit"
              icon="🚚"
              bgHeader="bg-amber-50"
              lots={haulingBoard.in_transit.filter(
                (l) =>
                  (!search ||
                    l.lot_number.toLowerCase().includes(search.toLowerCase()) ||
                    l.crop_type.toLowerCase().includes(search.toLowerCase()) ||
                    (l.field_location ?? "").toLowerCase().includes(search.toLowerCase())) &&
                  (!searchCrop || l.crop_type === searchCrop)
              )}
              emptyMessage="No lots in transit"
            />
            <HaulingColumn
              title="At Shed"
              icon="🏭"
              bgHeader="bg-blue-50"
              lots={haulingBoard.at_shed.filter(
                (l) =>
                  (!search ||
                    l.lot_number.toLowerCase().includes(search.toLowerCase()) ||
                    l.crop_type.toLowerCase().includes(search.toLowerCase()) ||
                    (l.field_location ?? "").toLowerCase().includes(search.toLowerCase())) &&
                  (!searchCrop || l.crop_type === searchCrop)
              )}
              emptyMessage="No lots at shed"
            />
            <HaulingColumn
              title="Packed"
              icon="📦"
              bgHeader="bg-purple-50"
              lots={haulingBoard.packed.filter(
                (l) =>
                  (!search ||
                    l.lot_number.toLowerCase().includes(search.toLowerCase()) ||
                    l.crop_type.toLowerCase().includes(search.toLowerCase()) ||
                    (l.field_location ?? "").toLowerCase().includes(search.toLowerCase())) &&
                  (!searchCrop || l.crop_type === searchCrop)
              )}
              emptyMessage="No lots packed"
            />
          </div>
        </div>
      )}

      {/* ── Field Yield Summary ── */}
      <FieldYieldTable fieldYield={fieldYield} />

      {/* ── Recent Lots ── */}
      <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden shadow-sm">
        <div className="border-b border-stone-100 px-5 py-3.5 flex items-center justify-between bg-stone-50/40">
          <h2 className="text-sm font-semibold text-stone-900">Recent Lots</h2>
          <Link href="/admin/route-trace/lots" className="text-[11px] text-blue-600 hover:text-blue-800 font-bold">
            View all →
          </Link>
        </div>
        {recentLots.length === 0 ? (
          <div className="p-10 text-center">
            <div className="text-3xl mb-3">🌱</div>
            <p className="text-sm text-stone-500">No lots yet. Create your first lot to get started.</p>
            <Link
              href="/admin/route-trace/lots/new"
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors"
            >
              + Create First Lot
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-stone-100">
                <th className="px-5 py-3 text-left text-[10px] font-bold text-stone-400 uppercase tracking-widest">Lot #</th>
                <th className="px-5 py-3 text-left text-[10px] font-bold text-stone-400 uppercase tracking-widest">Crop</th>
                <th className="px-5 py-3 text-left text-[10px] font-bold text-stone-400 uppercase tracking-widest">Harvest Date</th>
                <th className="px-5 py-3 text-left text-[10px] font-bold text-stone-400 uppercase tracking-widest">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentLots.map((lot) => (
                <tr key={lot.lot_id} className="border-b border-stone-50 last:border-0 hover:bg-stone-50/40 transition-colors">
                  <td className="px-5 py-3.5">
                    <Link href={`/admin/route-trace/lots/${lot.lot_id}`} className="font-mono text-sm font-bold text-stone-900 hover:text-blue-600">
                      {lot.lot_number}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-sm font-semibold text-stone-700">{lot.crop_type}</td>
                  <td className="px-5 py-3.5 text-sm text-stone-500">{lot.harvest_date}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                      lot.status === "active" ? "bg-green-50 text-green-700" :
                      lot.status === "in_transit" ? "bg-amber-50 text-amber-700" :
                      lot.status === "at_shed" ? "bg-blue-50 text-blue-700" :
                      lot.status === "packed" ? "bg-purple-50 text-purple-700" :
                      "bg-stone-50 text-stone-600"
                    }`}>
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {lot.status.replace("_", " ")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showScan && <QRScanModal onClose={() => setShowScan(false)} />}
      {showQuickNew && (
        <QuickNewLotDrawer
          brandId=""
          onCreated={(lotId) => {
            setShowQuickNew(false);
            window.location.href = `/admin/route-trace/lots/${lotId}`;
          }}
          onClose={() => setShowQuickNew(false)}
        />
      )}
    </div>
  );
}