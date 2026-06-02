"use client";

import { useState } from "react";
import Link from "next/link";
import QRScanModal from "./QRScanModal";
import QuickNewLotModal from "./QuickNewLotModal";
import FsmaReportModal from "./FsmaReportModal";
import {
  RouteTraceStats,
  HaulingLot,
  FieldYieldSummary,
  InventoryByCrop,
  RecentLotEvent,
} from "@/actions/route-trace/lots";

// SVG Icons - consistent stroke style with one-color outlines
const Icons = {
  plant: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 20h10"/>
      <path d="M10 20c5.5-2.5.8-6.4 3-10"/>
      <path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"/>
      <path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"/>
    </svg>
  ),
  truck: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 17h4"/>
      <path d="M3 17h2m14 0h2M5 17H3"/>
      <rect x="1" y="3" width="15" height="13" rx="1"/>
      <path d="M16 8h4l3 3v5h-7V8z"/>
      <circle cx="5.5" cy="18.5" r="2.5"/>
      <circle cx="18.5" cy="18.5" r="2.5"/>
    </svg>
  ),
  warehouse: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18"/>
      <path d="M5 21V7l8-4v18"/>
      <path d="M19 21V11l-6-4"/>
      <path d="M9 9v.01M9 12v.01M9 15v.01M9 18v.01"/>
    </svg>
  ),
  wheat: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 22l10-10"/>
      <path d="M16 8l-4 4"/>
      <path d="M22 2L12 12"/>
      <path d="M22 6l-6 6"/>
      <path d="M7 17l-5 5"/>
      <path d="M12 2l3 3"/>
    </svg>
  ),
  clipboard: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
      <path d="M12 11h4"/>
      <path d="M12 16h4"/>
      <path d="M8 11h.01"/>
      <path d="M8 16h.01"/>
    </svg>
  ),
  box: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
      <path d="m3.3 7 8.7 5 8.7-5"/>
      <path d="M12 22V12"/>
    </svg>
  ),
  check: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5"/>
    </svg>
  ),
  camera: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
      <circle cx="12" cy="13" r="3"/>
    </svg>
  ),
  zap: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>
    </svg>
  ),
  chart: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18"/>
      <path d="M18 17V9"/>
      <path d="M13 17V5"/>
      <path d="M8 17v-3"/>
    </svg>
  ),
  search: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/>
      <path d="m21 21-4.3-4.3"/>
    </svg>
  ),
  plus: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14"/>
      <path d="M12 5v14"/>
    </svg>
  ),
  arrowRight: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14"/>
      <path d="m12 5 7 7-7 7"/>
    </svg>
  ),
  tag: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2H9a5 5 0 0 0-5 5v10a5 5 0 0 0 5 5h6a5 5 0 0 0 5-5v-3"/>
      <circle cx="15" cy="9" r="1"/>
    </svg>
  ),
  file: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <path d="M14 2v6h6"/>
      <path d="M16 13H8"/>
      <path d="M16 17H8"/>
      <path d="M10 9H8"/>
    </svg>
  ),
  fileText: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <path d="M14 2v6h6"/>
      <path d="M16 13H8"/>
      <path d="M16 17H8"/>
      <path d="M10 9H8"/>
    </svg>
  ),
};

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; bg: string; text: string; iconColor: string }> = {
  active_count: { label: "Active Lots", icon: Icons.plant("w-4 h-4"), bg: "bg-[#e8f5e9]", text: "text-[#2e7d32]", iconColor: "#4caf50" },
  in_transit_count: { label: "In Transit", icon: Icons.truck("w-4 h-4"), bg: "bg-[#fff8e1]", text: "text-[#f57c00]", iconColor: "#ffb74d" },
  at_shed_count: { label: "At Shed", icon: Icons.warehouse("w-4 h-4"), bg: "bg-[#e3f2fd]", text: "text-[#1565c0]", iconColor: "#64b5f6" },
  total_lots_today: { label: "Harvested Today", icon: Icons.wheat("w-4 h-4"), bg: "bg-[var(--admin-accent-light)]", text: "text-[var(--admin-accent-text)]", iconColor: "var(--admin-accent)" },
};

const EVENT_ICON: Record<string, React.ReactNode> = {
  harvested: Icons.plant("w-4 h-4"),
  field_packed: Icons.box("w-4 h-4"),
  bin_tagged: Icons.tag("w-4 h-4"),
  in_transit: Icons.truck("w-4 h-4"),
  at_shed: Icons.warehouse("w-4 h-4"),
  packed: Icons.clipboard("w-4 h-4"),
  delivered: Icons.check("w-4 h-4"),
  marked_used: Icons.fileText("w-4 h-4"),
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

type LotWithAction = HaulingLot & { suggestedAction: string; suggestedIcon: React.ReactNode };

function buildHaulingBoard(lots: HaulingLot[]): Record<string, LotWithAction[]> {
  const board: Record<string, LotWithAction[]> = {
    in_transit: [],
    at_shed: [],
    packed: [],
  };

  for (const lot of lots) {
    let suggestedAction = "";
    let suggestedIcon: React.ReactNode = null;
    if (lot.status === "active" || lot.status === "in_transit") {
      suggestedAction = "Mark Loaded";
      suggestedIcon = Icons.truck("w-4 h-4");
    } else if (lot.status === "at_shed") {
      suggestedAction = "Mark Received";
      suggestedIcon = Icons.warehouse("w-4 h-4");
    } else if (lot.status === "packed") {
      suggestedAction = "Mark Delivered";
      suggestedIcon = Icons.check("w-4 h-4");
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
    <div className="rounded-2xl border border-[var(--admin-border)] bg-white shadow-[var(--admin-shadow-md)] overflow-hidden transition-all duration-200 hover:shadow-[var(--admin-shadow-lg)]">
      <div className="border-b border-[var(--admin-border-light)] px-5 py-3.5 flex items-center justify-between bg-[var(--admin-bg-subtle)]">
        <div className="flex items-center gap-2">
          <span className="text-[var(--admin-accent)]">{Icons.zap("w-4 h-4")}</span>
          <h2 className="text-sm font-semibold text-[var(--admin-text-primary)]">Recent Activity</h2>
        </div>
        <span className="text-[10px] text-[var(--admin-text-muted)] font-medium">Last 10 events</span>
      </div>
      <div className="divide-y divide-[var(--admin-border-light)]">
        {events.map((evt) => (
          <div key={evt.event_id} className="px-5 py-3.5 hover:bg-[var(--admin-bg-subtle)]/40 transition-all duration-150 flex items-start gap-3.5 cursor-pointer hover:pl-6">
            <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm ${
              evt.event_type === "harvested" || evt.event_type === "field_packed" ? "bg-[var(--admin-accent-light)] text-[var(--admin-accent-text)]" :
              evt.event_type === "in_transit" || evt.event_type === "bin_tagged" ? "bg-amber-100 text-amber-700" :
              evt.event_type === "at_shed" ? "bg-blue-100 text-blue-700" :
              evt.event_type === "packed" ? "bg-purple-100 text-purple-700" :
              "bg-stone-100 text-stone-600"
            }`}>
              {EVENT_ICON[evt.event_type] ?? Icons.fileText("w-4 h-4")}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-semibold text-[var(--admin-text-primary)] leading-tight">
                  {EVENT_LABEL[evt.event_type] ?? evt.event_type}
                </p>
                <span className="text-[10px] text-[var(--admin-text-muted)] flex-shrink-0 font-medium">
                  {timeAgo(evt.event_time)}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs font-bold text-[var(--admin-text-secondary)]">{evt.crop_type}</span>
                <span className="text-[var(--admin-border)]">·</span>
                <Link
                  href={`/admin/route-trace/lots/${evt.lot_id}`}
                  className="text-xs font-mono font-bold text-[var(--admin-accent)] hover:opacity-80"
                >
                  {evt.lot_number}
                </Link>
                {evt.location && (
                  <>
                    <span className="text-[var(--admin-border)]">·</span>
                    <span className="text-xs text-[var(--admin-text-muted)] truncate">{evt.location}</span>
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
  icon: React.ReactNode;
  bgHeader: string;
  lots: LotWithAction[];
  emptyMessage: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--admin-border)] bg-white shadow-[var(--admin-shadow-md)] overflow-hidden flex-1 min-w-[260px] transition-all duration-200 hover:shadow-[var(--admin-shadow-lg)]">
      <div className={`px-4 py-3 border-b border-[var(--admin-border-light)] flex items-center gap-2 ${bgHeader}`}>
        <span className="text-[var(--admin-text-secondary)]">{icon}</span>
        <h3 className="text-sm font-semibold text-[var(--admin-text-primary)]">{title}</h3>
        <span className="ml-auto rounded-full bg-white/80 text-[var(--admin-text-secondary)] text-xs font-bold px-2 py-0.5 shadow-sm">
          {lots.length}
        </span>
      </div>
      {lots.length === 0 ? (
        <div className="p-5 text-center text-xs text-[var(--admin-text-muted)]">
          <div className="flex flex-col items-center gap-2">
            <svg className="w-8 h-8 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            {emptyMessage}
          </div>
        </div>
      ) : (
        <div className="divide-y divide-[var(--admin-border-light)]">
          {lots.map((lot) => (
            <div key={lot.lot_id} className="px-4 py-3 hover:bg-[var(--admin-bg-subtle)]/50 transition-all duration-150 group">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link
                    href={`/admin/route-trace/lots/${lot.lot_id}`}
                    className="font-mono text-sm font-bold text-[var(--admin-text-primary)] hover:text-[var(--admin-accent)] truncate block"
                  >
                    {lot.lot_number}
                  </Link>
                  <p className="text-xs text-[var(--admin-text-muted)] mt-0.5 truncate">
                    {lot.crop_type} · {lot.field_location ?? "No field"}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    {lot.bin_id && (
                      <span className="inline-flex rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold px-1.5 py-0.5">
                        BIN {lot.bin_id}
                      </span>
                    )}
                    {lot.pallets && (
                      <span className="inline-flex text-[10px] text-[var(--admin-text-muted)] font-medium">{lot.pallets} PLT</span>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  {lot.quantity_lbs && (
                    <p className="text-sm font-semibold text-[var(--admin-text-secondary)]">
                      {Number(lot.quantity_lbs).toLocaleString()}
                      <span className="text-[10px] text-[var(--admin-text-muted)] font-normal ml-0.5">{lot.yield_unit ?? "lbs"}</span>
                    </p>
                  )}
                </div>
              </div>
              {lot.suggestedAction && (
                <div className="mt-2">
                  <Link
                    href={`/admin/route-trace/lots/${lot.lot_id}`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--admin-bg-subtle)] px-2.5 py-1.5 text-xs font-semibold text-[var(--admin-text-secondary)] hover:bg-[var(--admin-border-light)] transition-colors"
                  >
                    {lot.suggestedIcon} {lot.suggestedAction}
                  </Link>
                </div>
              )}
              {lot.destination_stop_name && (
                <p className="mt-1 text-[10px] text-[var(--admin-text-muted)]">→ {lot.destination_stop_name}</p>
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
    <div className="rounded-2xl border border-[var(--admin-border)] bg-white overflow-hidden shadow-[var(--admin-shadow-md)] transition-all duration-200 hover:shadow-[var(--admin-shadow-lg)]">
      <div className="border-b border-[var(--admin-border-light)] px-6 py-4 flex items-center justify-between bg-[var(--admin-bg-subtle)]">
        <div className="flex items-center gap-2">
          <span className="text-[var(--admin-text-secondary)]">{Icons.box("w-4 h-4")}</span>
          <h2 className="text-sm font-semibold text-[var(--admin-text-primary)]">Inventory by Crop</h2>
        </div>
        <span className="text-[10px] text-[var(--admin-text-muted)]">Harvested · In Transit · At Shed · Packed</span>
      </div>
      <div className="divide-y divide-[var(--admin-border-light)]">
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
            <div key={crop} className="px-6 py-4 transition-all duration-150 hover:bg-[var(--admin-bg-subtle)]/30">
              <div className="flex items-center justify-between mb-1">
                <div>
                  <p className="text-sm font-bold text-[var(--admin-text-primary)]">{crop}</p>
                  <p className="text-[10px] text-[var(--admin-text-muted)]">{lotCount} lot{lotCount !== 1 ? "s" : ""}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xl font-black text-[var(--admin-text-primary)]">
                      {totalActual > 0 ? Number(totalActual).toLocaleString() : "—"}
                    </p>
                    <p className="text-[10px] text-[var(--admin-text-muted)]">{rows[0]?.yield_unit ?? "lbs"} actual</p>
                  </div>
                  {totalEstimate > 0 && (
                    <div className="text-right">
                      <p className="text-sm font-semibold text-[var(--admin-text-muted)]">
                        {Number(totalEstimate).toLocaleString()}
                        <span className="text-[10px] text-[var(--admin-text-muted)] ml-0.5">est</span>
                      </p>
                      <p className={`text-xs font-bold ${variance !== null ? (variance >= 0 ? "text-green-600" : "text-red-600") : "text-[var(--admin-text-muted)]"}`}>
                        {variance !== null ? `${variance > 0 ? "+" : ""}${variance}%` : "—"}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-1">
                <div className="flex-1 bg-[var(--admin-bg-subtle)] rounded-lg px-2 py-1.5 text-center min-w-0">
                  <p className="text-sm font-black text-[var(--admin-text-primary)]">{active > 0 ? Number(active).toLocaleString() : "—"}</p>
                  <p className="text-[9px] text-[var(--admin-text-muted)]">{Icons.plant("w-3 h-3")}</p>
                </div>
                <div className="flex-1 bg-[var(--admin-bg-subtle)] rounded-lg px-2 py-1.5 text-center min-w-0">
                  <p className="text-sm font-black text-[var(--admin-text-primary)]">{inTransit > 0 ? Number(inTransit).toLocaleString() : "—"}</p>
                  <p className="text-[9px] text-[var(--admin-text-muted)]">{Icons.truck("w-3 h-3")}</p>
                </div>
                <div className="flex-1 bg-[var(--admin-bg-subtle)] rounded-lg px-2 py-1.5 text-center min-w-0">
                  <p className="text-sm font-black text-[var(--admin-text-primary)]">{atShed > 0 ? Number(atShed).toLocaleString() : "—"}</p>
                  <p className="text-[9px] text-[var(--admin-text-muted)]">{Icons.warehouse("w-3 h-3")}</p>
                </div>
                <div className="flex-1 bg-[var(--admin-bg-subtle)] rounded-lg px-2 py-1.5 text-center min-w-0">
                  <p className="text-sm font-black text-[var(--admin-text-primary)]">{packed > 0 ? Number(packed).toLocaleString() : "—"}</p>
                  <p className="text-[9px] text-[var(--admin-text-muted)]">{Icons.box("w-3 h-3")}</p>
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
    <div className="rounded-2xl border border-[var(--admin-border)] bg-white overflow-hidden shadow-[var(--admin-shadow-md)] transition-all duration-200 hover:shadow-[var(--admin-shadow-lg)]">
      <div className="border-b border-[var(--admin-border-light)] px-6 py-4 flex items-center justify-between bg-[var(--admin-bg-subtle)]">
        <div className="flex items-center gap-2">
          <span className="text-[var(--admin-text-secondary)]">{Icons.chart("w-4 h-4")}</span>
          <h2 className="text-sm font-semibold text-[var(--admin-text-primary)]">Field Yield Summary</h2>
        </div>
      </div>
      <table className="w-full">
        <thead>
          <tr className="border-b border-[var(--admin-border-light)]">
            <th className="px-6 py-3 text-left text-[10px] font-bold text-[var(--admin-text-muted)] uppercase tracking-widest">Field</th>
            <th className="px-6 py-3 text-right text-[10px] font-bold text-[var(--admin-text-muted)] uppercase tracking-widest">Est. Yield</th>
            <th className="px-6 py-3 text-right text-[10px] font-bold text-[var(--admin-text-muted)] uppercase tracking-widest">Actual</th>
            <th className="px-6 py-3 text-right text-[10px] font-bold text-[var(--admin-text-muted)] uppercase tracking-widest">Lots</th>
          </tr>
        </thead>
        <tbody>
          {fieldYield.map((row, idx) => (
            <tr key={idx} className="border-b border-[var(--admin-border-light)] last:border-0 hover:bg-[var(--admin-bg-subtle)]/40 transition-all duration-150">
              <td className="px-6 py-3.5">
                <p className="text-sm font-semibold text-[var(--admin-text-primary)]">{row.field_location}</p>
                {row.field_block !== "N/A" && <p className="text-[10px] text-[var(--admin-text-muted)]">Block {row.field_block}</p>}
              </td>
              <td className="px-6 py-3.5 text-right">
                <span className="text-sm font-semibold text-[var(--admin-text-muted)]">
                  {row.total_yield_estimate > 0 ? `${Number(row.total_yield_estimate).toLocaleString()} ${row.yield_unit ?? "lbs"}` : "—"}
                </span>
              </td>
              <td className="px-6 py-3.5 text-right">
                <span className="text-sm text-[var(--admin-text-secondary)]">
                  {row.total_quantity_lbs > 0 ? `${Number(row.total_quantity_lbs).toLocaleString()} ${row.yield_unit ?? "lbs"}` : "—"}
                </span>
              </td>
              <td className="px-6 py-3.5 text-right">
                <span className="inline-flex items-center rounded-full bg-[var(--admin-accent-light)] text-[var(--admin-accent-text)] px-2.5 py-0.5 text-xs font-bold">
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
  const [showScan, setShowScan] = useState(false);
  const [showQuickNew, setShowQuickNew] = useState(false);
  const [search, setSearch] = useState("");
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
    <div className="space-y-4 sm:space-y-5">
      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
        {statEntries.map(({ key, value }) => {
          const cfg = STATUS_CONFIG[key];
          return (
            <div key={key} className={`rounded-xl sm:rounded-2xl ${cfg.bg} border border-transparent px-3 sm:px-5 py-3 sm:py-4 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5`}>
              <div className="flex items-center gap-1 sm:gap-1.5">
                <span className={`${cfg.iconColor} scale-75 sm:scale-100`}>{cfg.icon}</span>
                <span className="text-[8px] sm:text-[10px] font-bold text-[var(--admin-text-muted)] uppercase tracking-wider truncate">{cfg.label}</span>
              </div>
              <p className={`mt-1 sm:mt-1.5 text-xl sm:text-3xl font-black ${cfg.text}`}>{value}</p>
            </div>
          );
        })}
        {/* Total lots — spans across */}
        <div className="rounded-xl sm:rounded-2xl bg-[var(--admin-card-bg)] border border-[var(--admin-border)] px-3 sm:px-5 py-3 sm:py-4 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 shadow-[var(--admin-shadow-sm)]">
          <div className="flex items-center gap-1 sm:gap-1.5">
            <span className="text-[var(--admin-text-secondary)]">{Icons.clipboard("w-3.5 h-3.5 sm:w-4 sm:h-4")}</span>
            <span className="text-[8px] sm:text-[10px] font-bold text-[var(--admin-text-muted)] uppercase tracking-wider truncate">Total Lots</span>
          </div>
          <p className="mt-1 sm:mt-1.5 text-xl sm:text-3xl font-black text-[var(--admin-text-secondary)]">{stats.total_lots ?? 0}</p>
        </div>
      </div>

      {/* ── Activity feed ── */}
      <ActivityFeed events={recentActivity} />

      {/* ── Compliance summary ── */}
      {inventoryByCrop.length > 0 && (
        <div className="rounded-xl sm:rounded-2xl border border-blue-200 bg-blue-50/50 px-4 sm:px-5 py-3 sm:py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg sm:rounded-xl bg-blue-100">
              <span className="text-blue-600">{Icons.file("w-4 h-4")}</span>
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-blue-900">Compliance Summary</p>
              <p className="text-[10px] sm:text-[10px] text-blue-600/70 hidden sm:block">This period</p>
            </div>
          </div>
          <div className="flex items-center gap-4 sm:gap-6 w-full sm:w-auto justify-between sm:justify-end">
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
      <div className="flex gap-2 sm:gap-2.5 flex-wrap">
        <button
          onClick={() => setShowQuickNew(true)}
          className="rounded-xl bg-[var(--admin-accent)] px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold text-white hover:opacity-90 active:opacity-80 transition-colors flex items-center gap-1.5 sm:gap-2 shadow-[var(--admin-shadow-sm)]"
        >
          {Icons.plus("w-3.5 h-3.5 sm:w-4 sm:h-4")} <span className="hidden xs:inline">Quick New Lot</span><span className="xs:hidden">New Lot</span>
        </button>
        <button
          onClick={() => setShowScan(true)}
          className="rounded-xl bg-[var(--admin-text-secondary)] px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold text-white hover:opacity-90 transition-colors flex items-center gap-1.5 sm:gap-2"
        >
          {Icons.camera("w-3.5 h-3.5 sm:w-4 sm:h-4")} <span className="hidden sm:inline">Scan QR</span>
        </button>
        <FsmaReportModal brandId={brandId} />
        <Link
          href="/admin/route-trace/lots"
          className="rounded-xl border border-[var(--admin-border)] bg-white px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-[var(--admin-text-secondary)] hover:bg-[var(--admin-bg-subtle)] transition-colors flex items-center gap-1.5 sm:gap-2"
        >
          All Lots {Icons.arrowRight("w-3.5 h-3.5 sm:w-4 sm:h-4")}
        </Link>
      </div>

      {/* ── Hauling board ── */}
      {hasAnyLots && (
        <div>
          <div className="flex flex-col xs:flex-row items-start xs:items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 sm:gap-2.5">
              <h2 className="text-xs sm:text-sm font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider">Hauling Board</h2>
              <span className="rounded-full bg-[var(--admin-bg-subtle)] text-[var(--admin-text-muted)] text-[10px] font-bold px-2 py-0.5">
                {totalHaulingLots} lots
              </span>
            </div>
            <div className="flex items-center gap-2 w-full xs:w-auto">
              <div className="relative flex-1 xs:flex-initial">
                <span className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 text-[var(--admin-text-muted)]">{Icons.search("w-3 h-3 sm:w-3.5 sm:h-3.5")}</span>
                <input
                  type="text"
                  placeholder="Lot, crop, field…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full xs:w-32 sm:w-40 pl-7 sm:pl-8 pr-3 py-1.5 sm:py-2 rounded-lg border border-[var(--admin-border)] bg-white text-xs text-[var(--admin-text-primary)] placeholder:text-[var(--admin-text-muted)] focus:outline-none focus:border-[var(--admin-accent)]"
                />
              </div>
              <select
                value={searchCrop}
                onChange={(e) => setSearchCrop(e.target.value)}
                className="rounded-lg border border-[var(--admin-border)] bg-white text-xs text-[var(--admin-text-primary)] px-2 py-1.5 sm:py-2 focus:outline-none focus:border-[var(--admin-accent)] flex-shrink-0"
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
              icon={Icons.truck("w-4 h-4")}
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
              icon={Icons.warehouse("w-4 h-4")}
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
              icon={Icons.clipboard("w-4 h-4")}
              bgHeader="bg-[var(--admin-accent-light)]"
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

      {/* ── Field Yield Table ── */}
      <FieldYieldTable fieldYield={fieldYield} />

      {/* ── Quick New Lot Modal ── */}
      {showQuickNew && (
        <QuickNewLotModal
          brandId={brandId}
          onCreated={(lotId) => {
            // Refresh would happen here in production
            console.log("Lot created:", lotId);
          }}
          onClose={() => setShowQuickNew(false)}
        />
      )}

      {/* ── QR Scan Modal ── */}
      {showScan && (
        <QRScanModal
          onClose={() => setShowScan(false)}
        />
      )}
    </div>
  );
}