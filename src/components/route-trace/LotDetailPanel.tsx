"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import StatusBadge from "./StatusBadge";
import StickerPreviewModal from "./StickerPreviewModal";
import { LotDetail, LotOrder, updateHarvestLotStatus } from "@/actions/route-trace/lots";

const STATUS_FLOW = ["active", "in_transit", "at_shed", "packed", "delivered"];

// Deep visual config with custom SVG icons - consistent one-color outline style
const EVENT_CONFIG: Record<string, { 
  icon: React.ReactNode; 
  bg: string; 
  accent: string; 
  label: string;
  dot: string;
}> = {
  harvested: { 
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 20h10"/>
        <path d="M10 20c5.5-2.5.8-6.4 3-10"/>
        <path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"/>
        <path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"/>
      </svg>
    ), 
    bg: "bg-[#f1f8e9]", 
    accent: "#558b2f",
    dot: "#8bc34a",
    label: "Harvested" 
  },
  field_packed: { 
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
        <path d="m3.3 7 8.7 5 8.7-5"/>
        <path d="M12 22V12"/>
      </svg>
    ), 
    bg: "bg-[#e8f5e9]", 
    accent: "#2e7d32",
    dot: "#66bb6a",
    label: "Field Packed" 
  },
  bin_tagged: { 
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2H9a5 5 0 0 0-5 5v10a5 5 0 0 0 5 5h6a5 5 0 0 0 5-5v-3"/>
        <circle cx="15" cy="9" r="1"/>
      </svg>
    ), 
    bg: "bg-[#fff3e0]", 
    accent: "#ef6c00",
    dot: "#ffb74d",
    label: "Bin Tagged" 
  },
  in_transit: { 
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 17h4"/>
        <path d="M3 17h2m14 0h2M5 17H3"/>
        <rect x="1" y="3" width="15" height="13" rx="1"/>
        <path d="M16 8h4l3 3v5h-7V8z"/>
        <circle cx="5.5" cy="18.5" r="2.5"/>
        <circle cx="18.5" cy="18.5" r="2.5"/>
      </svg>
    ), 
    bg: "bg-[#fff8e1]", 
    accent: "#f57c00",
    dot: "#ffca28",
    label: "In Transit" 
  },
  at_shed: { 
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 21h18"/>
        <path d="M5 21V7l8-4v18"/>
        <path d="M19 21V11l-6-4"/>
        <path d="M9 9v.01"/>
        <path d="M9 12v.01"/>
        <path d="M9 15v.01"/>
        <path d="M9 18v.01"/>
      </svg>
    ), 
    bg: "bg-[#e3f2fd]", 
    accent: "#1565c0",
    dot: "#42a5f5",
    label: "At Shed" 
  },
  packed: { 
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
        <path d="M12 11h4"/>
        <path d="M12 16h4"/>
        <path d="M8 11h.01"/>
        <path d="M8 16h.01"/>
      </svg>
    ), 
    bg: "bg-[var(--admin-accent-light)]", 
    accent: "var(--admin-accent)",
    dot: "var(--admin-accent)",
    label: "Packed" 
  },
  delivered: { 
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6 9 17l-5-5"/>
      </svg>
    ), 
    bg: "bg-[var(--admin-bg-subtle)]", 
    accent: "var(--admin-text-secondary)",
    dot: "var(--admin-text-muted)",
    label: "Delivered" 
  },
  marked_used: {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <path d="M14 2v6h6"/>
        <path d="M16 13H8"/>
        <path d="M16 17H8"/>
        <path d="M10 9H8"/>
      </svg>
    ),
    bg: "bg-[var(--admin-bg-subtle)]",
    accent: "var(--admin-text-secondary)",
    dot: "var(--admin-text-muted)",
    label: "Used in Order"
  }
};

// Icon components for action buttons
const Icons = {
  truck: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 17h4M3 17h2m14 0h2M5 17H3"/>
      <rect x="1" y="3" width="15" height="13" rx="1"/>
      <path d="M16 8h4l3 3v5h-7V8z"/>
      <circle cx="5.5" cy="18.5" r="2.5"/>
      <circle cx="18.5" cy="18.5" r="2.5"/>
    </svg>
  ),
  warehouse: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4"/>
      <path d="M9 9v.01M9 12v.01M9 15v.01M9 18v.01"/>
    </svg>
  ),
  printer: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9V2h12v7"/>
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
      <rect x="6" y="14" width="12" height="8"/>
    </svg>
  ),
  download: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <path d="M7 10l5 5 5-5"/>
      <path d="M12 15V3"/>
    </svg>
  ),
  externalLink: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
      <path d="M15 3h6v6"/>
      <path d="M10 14 21 3"/>
    </svg>
  ),
  tag: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2H9a5 5 0 0 0-5 5v10a5 5 0 0 0 5 5h6a5 5 0 0 0 5-5v-3"/>
      <circle cx="15" cy="9" r="1"/>
    </svg>
  ),
  package: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
      <path d="m3.3 7 8.7 5 8.7-5"/>
      <path d="M12 22V12"/>
    </svg>
  ),
  mapPin: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  ),
  user: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  arrowRight: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14"/>
      <path d="m12 5 7 7-7 7"/>
    </svg>
  ),
};

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? "w-3.5 h-3.5"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
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
    <div className="space-y-6">
      {/* Header card with depth */}
      <div className="relative">
        {/* Decorative accent bar */}
        <div 
          className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
          style={{ 
            background: `linear-gradient(180deg, var(--admin-accent) 0%, var(--admin-accent-light) 100%)`
          }}
        />
        
        <div className="rounded-2xl border border-[var(--admin-border)] bg-white shadow-[var(--admin-shadow-lg)] overflow-hidden ml-1">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4 p-4 sm:p-6 pb-5">
            <div className="space-y-2 flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <h1 className="text-2xl sm:text-3xl font-black text-[var(--admin-text-primary)] tracking-tight truncate">{lot.lot_number}</h1>
                <StatusBadge status={lot.status} />
              </div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm">
                <span className="font-semibold text-[var(--admin-accent)]">{lot.crop_type}</span>
                {lot.variety && (
                  <>
                    <span className="text-[var(--admin-border)]">·</span>
                    <span className="text-[var(--admin-text-muted)]">{lot.variety}</span>
                  </>
                )}
                <span className="text-[var(--admin-border)]">·</span>
                <span className="text-[var(--admin-text-muted)]">Harvested {lot.harvest_date}</span>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2 sm:flex-nowrap sm:flex-col sm:items-end w-full sm:w-auto">
              {(isInTransit || canMarkLoaded) && (
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                  {isInTransit && (
                    <button
                      onClick={handleMarkAtShed}
                      disabled={isPending}
                      className="group relative rounded-xl border-2 border-[#90caf9] bg-[#e3f2fd] px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold text-[#1565c0] hover:bg-[#bbdefb] transition-all duration-200 disabled:opacity-50 flex items-center gap-1.5 sm:gap-2 shadow-sm hover:shadow-md hover:-translate-y-0.5 flex-1 sm:flex-initial justify-center"
                    >
                      {Icons.warehouse("w-3.5 h-3.5 sm:w-4 sm:h-4")}
                      <span className="hidden sm:inline">Mark at Shed</span>
                      <span className="sm:hidden">At Shed</span>
                    </button>
                  )}
                  {canMarkLoaded && (
                    <button
                      onClick={handleMarkLoaded}
                      disabled={isPending}
                      className="group relative rounded-xl border-2 border-[#ffe082] bg-[#fff8e1] px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold text-[#f57c00] hover:bg-[#ffecb3] transition-all duration-200 disabled:opacity-50 flex items-center gap-1.5 sm:gap-2 shadow-sm hover:shadow-md hover:-translate-y-0.5 flex-1 sm:flex-initial justify-center"
                    >
                      {Icons.truck("w-3.5 h-3.5 sm:w-4 sm:h-4")}
                      <span className="hidden sm:inline">Mark Loaded</span>
                      <span className="sm:hidden">Loaded</span>
                    </button>
                  )}
                </div>
              )}
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setShowSticker(true)}
                  className="group rounded-xl border border-[var(--admin-border)] bg-white px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-[var(--admin-text-secondary)] hover:bg-[var(--admin-bg)] hover:border-[var(--admin-text-muted)] transition-all duration-200 flex items-center gap-1.5 sm:gap-2 shadow-sm hover:shadow-md hover:-translate-y-0.5 flex-1 sm:flex-initial justify-center"
                >
                  {Icons.printer("w-3.5 h-3.5 sm:w-4 sm:h-4")}
                  <span className="hidden xs:inline">Print Sticker</span>
                </button>
                {nextStatuses.length > 0 && (
                  <button
                    onClick={() => { setNewStatus(nextStatuses[0]); setShowStatusModal(true); }}
                    className="group relative rounded-xl bg-[var(--admin-accent)] px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold text-white hover:bg-[var(--admin-accent-hover)] transition-all duration-200 flex items-center gap-1.5 sm:gap-2 shadow-md hover:shadow-lg hover:-translate-y-0.5 flex-1 sm:flex-initial justify-center"
                  >
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="hidden sm:inline">Update Status</span>
                    <span className="sm:hidden">Update</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Info grid with depth */}
          <div className="grid grid-cols-2 lg:grid-cols-5 border-t border-[var(--admin-border-light)]">
            {[
              { label: "Field / Location", value: lot.field_location ?? "—", icon: Icons.mapPin("w-3.5 h-3.5 sm:w-4 sm:h-4") },
              { label: "Field Block", value: lot.field_block ?? "—", icon: null },
              { label: "Worker", value: lot.worker_name ?? "—", icon: Icons.user("w-3.5 h-3.5 sm:w-4 sm:h-4") },
              { label: "Packer", value: lot.packer_name ?? "—", icon: Icons.user("w-3.5 h-3.5 sm:w-4 sm:h-4") },
              { label: "Quantity", value: lot.quantity_lbs != null ? `${lot.quantity_lbs.toLocaleString()} ${lot.yield_unit ?? "lbs"}` : "—", icon: null },
              { label: "Yield Est.", value: lot.yield_estimate_lbs != null ? `${lot.yield_estimate_lbs.toLocaleString()} ${lot.yield_unit ?? "lbs"}` : "—", icon: null },
              { label: "Pallets", value: lot.pallets != null ? String(lot.pallets) : "—", icon: null },
              { label: "Bin ID", value: lot.bin_id ?? "—", icon: Icons.tag("w-3.5 h-3.5 sm:w-4 sm:h-4") },
              { label: "Container", value: lot.container_id ?? "—", icon: null },
              { label: "Variety", value: lot.variety ?? "—", icon: null },
            ].map((item, idx) => (
              <div 
                key={item.label} 
                className={`
                  px-3 sm:px-5 py-3 sm:py-4 
                  ${idx % 2 !== 1 ? 'sm:border-r ' : ''}
                  ${idx % 5 !== 4 ? 'lg:border-r ' : ''}
                  ${idx < 2 ? 'border-b ' : ''}
                  ${idx >= 2 && idx < 4 ? 'sm:border-b ' : ''}
                  border-[var(--admin-border-light)]
                  hover:bg-[var(--admin-bg-subtle)]/50 transition-colors
                `}
              >
                <div className="flex items-center gap-1 sm:gap-1.5 mb-1">
                  {item.icon && <span className="text-[var(--admin-text-muted)]">{item.icon}</span>}
                  <p className="text-[9px] sm:text-[10px] font-bold text-[var(--admin-text-muted)] uppercase tracking-wider truncate">{item.label}</p>
                </div>
                <p className="text-xs sm:text-sm font-bold text-[var(--admin-text-primary)] truncate">{item.value}</p>
              </div>
            ))}
          </div>

          {lot.notes && (
            <div className="border-t border-[var(--admin-border-light)] px-4 sm:px-6 py-3 sm:py-4 bg-[var(--admin-bg-subtle)]/30">
              <div className="flex items-center gap-2 mb-1">
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[var(--admin-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5m-1.414-9.414a2 2 0 1 1 2.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <p className="text-[10px] font-bold text-[var(--admin-text-muted)] uppercase tracking-wider">Notes</p>
              </div>
              <p className="text-xs sm:text-sm text-[var(--admin-text-secondary)]">{lot.notes}</p>
            </div>
          )}

          {/* Quick actions */}
          <div className="flex gap-2 sm:gap-3 border-t border-[var(--admin-border-light)] px-4 sm:px-6 py-3 sm:py-4 bg-[var(--admin-bg-subtle)]/20 flex-wrap">
            <button
              onClick={() => setShowBinModal(true)}
              className="group rounded-xl border border-[var(--admin-border)] bg-white px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-[var(--admin-text-secondary)] hover:bg-[#fff3e0] hover:border-[#ffe082] hover:text-[#f57c00] transition-all duration-200 flex items-center gap-1.5 sm:gap-2 shadow-sm hover:shadow-md hover:-translate-y-0.5 flex-1 sm:flex-initial justify-center"
            >
              {Icons.tag("w-3.5 h-3.5 sm:w-4 sm:h-4")}
              <span>Add Bin</span>
            </button>
            <a
              href={`/api/route-trace/trace-report?lotId=${lot.lot_id}&format=csv`}
              download
              className="group rounded-xl border border-[var(--admin-border)] bg-white px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-[var(--admin-text-secondary)] hover:bg-[var(--admin-bg)] hover:border-[var(--admin-text-muted)] transition-all duration-200 flex items-center gap-1.5 sm:gap-2 shadow-sm hover:shadow-md hover:-translate-y-0.5 flex-1 sm:flex-initial justify-center"
            >
              {Icons.download("w-3.5 h-3.5 sm:w-4 sm:h-4")}
              <span>Download</span>
            </a>
            <Link
              href={`/trace/${lot.lot_number}`}
              target="_blank"
              className="group rounded-xl border border-[var(--admin-border)] bg-white px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-[var(--admin-text-secondary)] hover:bg-[var(--admin-bg)] hover:border-[var(--admin-text-muted)] transition-all duration-200 flex items-center gap-1.5 sm:gap-2 shadow-sm hover:shadow-md hover:-translate-y-0.5 flex-1 sm:flex-initial justify-center"
            >
              {Icons.externalLink("w-3.5 h-3.5 sm:w-4 sm:h-4")}
              <span className="hidden xs:inline">Public Trace</span>
              {Icons.arrowRight("w-3 h-3 opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all")}
            </Link>
          </div>
        </div>
      </div>

      {/* Order Fulfillment with depth */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--admin-accent-light)]/20 to-transparent rounded-2xl blur-xl -z-10" />
        <div className="rounded-2xl border border-[var(--admin-border)] bg-white shadow-[var(--admin-shadow-md)] overflow-hidden">
          <div className="border-b border-[var(--admin-border-light)] px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-[var(--admin-bg-subtle)] to-white">
            <div className="flex flex-col xs:flex-row items-start xs:items-center gap-2 xs:gap-3">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl bg-[var(--admin-accent-light)] shadow-sm">
                  {Icons.package("w-4 h-4 sm:w-5 sm:h-5 text-[var(--admin-accent)]")}
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-[var(--admin-text-primary)]">Order Fulfillment</h2>
                  <p className="text-[10px] sm:text-xs text-[var(--admin-text-muted)] hidden sm:block">Track lot allocation to customer orders</p>
                </div>
              </div>
              {orders.length > 0 && (
                <div className="flex items-center gap-2 sm:gap-3 ml-0 xs:ml-auto">
                  <span className="rounded-full bg-[var(--admin-accent-light)] text-[var(--admin-accent-text)] text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-0.5 sm:py-1">
                    {orders.length} {orders.length === 1 ? "order" : "orders"}
                  </span>
                  <span className="text-[10px] sm:text-xs text-[var(--admin-text-muted)]">
                    {orders.reduce((sum, o) => sum + Number(o.item_quantity ?? 0), 0).toLocaleString()} lbs
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Lot Balance Progress */}
          {lot.quantity_lbs != null && lot.quantity_lbs > 0 && (
            <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-[var(--admin-border-light)] bg-gradient-to-r from-white via-[var(--admin-bg-subtle)]/30 to-white">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs sm:text-sm font-bold text-[var(--admin-text-secondary)]">Lot Balance</span>
                  {lot.quantity_used_lbs != null && lot.quantity_used_lbs > 0 ? (
                    <span className="rounded-full bg-[#fff3e0] text-[#e65100] text-[10px] sm:text-xs font-bold px-2 sm:px-2.5 py-0.5 border border-[#ffe082]">
                      Partially Used
                    </span>
                  ) : (
                    <span className="rounded-full bg-[#e8f5e9] text-[#2e7d32] text-[10px] sm:text-xs font-bold px-2 sm:px-2.5 py-0.5 border border-[#c8e6c9]">
                      Fully Available
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm">
                  {lot.quantity_used_lbs != null && lot.quantity_used_lbs > 0 && (
                    <span className="text-[var(--admin-text-muted)]">
                      <span className="font-bold text-[var(--admin-text-secondary)]">{Number(lot.quantity_used_lbs).toLocaleString()}</span> lbs used
                    </span>
                  )}
                  <span className="font-black text-base sm:text-lg text-[var(--admin-text-primary)]">
                    {Math.max(0, Number(lot.quantity_lbs) - Number(lot.quantity_used_lbs ?? 0)).toLocaleString()}
                  </span>
                  <span className="text-[var(--admin-text-muted)] hidden sm:inline">lbs remaining</span>
                </div>
              </div>
              <div className="relative h-4 bg-[var(--admin-bg-subtle)] rounded-full overflow-hidden shadow-inner">
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${Math.min(100, ((Number(lot.quantity_used_lbs ?? 0) / Number(lot.quantity_lbs)) * 100))}%`,
                    background: Number(lot.quantity_used_lbs ?? 0) > 0
                      ? "linear-gradient(90deg, #ffb74d 0%, #ff9800 50%, #f57c00 100%)"
                      : "linear-gradient(90deg, #81c784 0%, #66bb6a 50%, #4caf50 100%)",
                  }}
                />
                <div 
                  className="absolute inset-0 rounded-full opacity-30"
                  style={{
                    background: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.1) 4px, rgba(255,255,255,0.1) 8px)'
                  }}
                />
              </div>
            </div>
          )}

          {orders.length === 0 ? (
            <div className="px-4 sm:px-6 py-6 sm:py-8 text-center">
              <div className="inline-flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-[var(--admin-bg-subtle)] mb-3">
                {Icons.package("w-5 h-5 sm:w-6 sm:h-6 text-[var(--admin-text-muted)]")}
              </div>
              <p className="text-xs sm:text-sm text-[var(--admin-text-muted)] mb-4">This lot has not been assigned to any orders yet.</p>
              <button
                onClick={() => setShowUsedModal(true)}
                className="rounded-xl bg-[var(--admin-bg-subtle)] px-4 py-2 text-xs sm:text-sm font-semibold text-[var(--admin-text-secondary)] hover:bg-[var(--admin-border-light)] transition-colors border border-[var(--admin-border)]"
              >
                Mark as Used in Order
              </button>
            </div>
          ) : (
            <div className="p-3 sm:p-5 space-y-2 sm:space-y-3">
              {orders.map((order, idx) => (
                <Link
                  key={order.id}
                  href={`/admin/orders/${order.id}`}
                  className="group flex flex-col xs:flex-row items-start xs:items-center justify-between gap-3 rounded-xl border border-[var(--admin-border-light)] bg-gradient-to-r from-white to-[var(--admin-bg-subtle)]/30 px-4 sm:px-5 py-3 sm:py-4 hover:border-[var(--admin-accent)] hover:shadow-[var(--admin-shadow-sm)] transition-all duration-200"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className="flex items-center gap-3 sm:gap-4 w-full xs:w-auto">
                    <div className="relative flex-shrink-0">
                      <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg sm:rounded-xl bg-[#e8f5e9] shadow-sm">
                        {Icons.package("w-4 h-4 sm:w-5 sm:h-5 text-[#4caf50]")}
                      </div>
                      <div 
                        className="absolute -bottom-1 -right-1 h-4 w-4 sm:h-5 sm:w-5 rounded-full bg-white shadow-sm flex items-center justify-center"
                      >
                        <span className="text-[9px] sm:text-[10px] font-black text-[var(--admin-text-secondary)]">{idx + 1}</span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-bold text-[var(--admin-text-primary)] truncate">{order.customer_name}</p>
                      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mt-0.5">
                        <span className="text-[10px] sm:text-xs text-[var(--admin-text-muted)] truncate">{order.stop_name}</span>
                        <span className="text-[var(--admin-border)] hidden sm:inline">·</span>
                        <span className="text-[10px] sm:text-xs text-[var(--admin-text-muted)]">{order.order_date}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-4 w-full xs:w-auto justify-between xs:justify-end pl-12 xs:pl-0">
                    {order.item_quantity != null && (
                      <div className="text-right">
                        <p className="text-base sm:text-lg font-black text-[var(--admin-text-primary)]">{Number(order.item_quantity).toLocaleString()}</p>
                        <p className="text-[9px] sm:text-[10px] text-[var(--admin-text-muted)] font-medium">lbs allocated</p>
                      </div>
                    )}
                    {order.lot_quantity_used != null && order.lot_quantity_used > 0 && (
                      <div className="border-l border-[var(--admin-border-light)] pl-2 sm:pl-4">
                        <p className="text-base sm:text-lg font-black text-[#f57c00]">{Number(order.lot_quantity_used).toLocaleString()}</p>
                        <p className="text-[9px] sm:text-[10px] text-[var(--admin-text-muted)] font-medium">lbs used</p>
                      </div>
                    )}
                    <span className={`flex items-center gap-1 rounded-full px-2 sm:px-3 py-1 text-[10px] sm:text-xs font-bold border flex-shrink-0 ${
                      order.fulfillment === "pickup" ? "bg-[#e3f2fd] text-[#1565c0] border-[#90caf9]" :
                      order.fulfillment === "ship" ? "bg-[#e8f5e9] text-[#2e7d32] border-[#c8e6c9]" :
                      "bg-[var(--admin-bg-subtle)] text-[var(--admin-text-secondary)] border-[var(--admin-border)]"
                    }`}>
                      {order.fulfillment === "pickup" ? (
                        <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                        </svg>
                      ) : order.fulfillment === "ship" ? (
                        <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/>
                        </svg>
                      ) : (
                        <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                        </svg>
                      )}
                      {order.fulfillment ?? "mixed"}
                    </span>
                    {Icons.arrowRight("w-4 h-4 text-[var(--admin-text-muted)] opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all")}
                  </div>
                </Link>
              ))}
              <button
                onClick={() => setShowUsedModal(true)}
                className="w-full mt-2 rounded-xl border-2 border-dashed border-[var(--admin-border)] py-3 text-xs font-bold text-[var(--admin-text-muted)] hover:border-[var(--admin-accent)] hover:text-[var(--admin-accent)] hover:bg-[var(--admin-accent-light)]/30 transition-all duration-200"
              >
                + Mark as Used in Another Order
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Event Timeline with enhanced depth */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--admin-text-primary)]/5 to-transparent rounded-2xl blur-xl -z-10" />
        <div className="rounded-2xl border border-[var(--admin-border)] bg-white shadow-[var(--admin-shadow-md)] overflow-hidden">
          <div className="border-b border-[var(--admin-border-light)] px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-[var(--admin-bg-subtle)] to-white">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl bg-[var(--admin-text-primary)] shadow-sm">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--admin-bg)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-[var(--admin-text-primary)]">Trace Timeline</h2>
                <p className="text-[10px] sm:text-xs text-[var(--admin-text-muted)] hidden sm:block">Complete history — field to delivery</p>
              </div>
            </div>
          </div>
          
          {lot.events.length === 0 ? (
            <div className="p-6 sm:p-8 text-center">
              <div className="inline-flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-[var(--admin-bg-subtle)] mb-3">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--admin-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-xs sm:text-sm text-[var(--admin-text-muted)]">No events recorded yet.</p>
            </div>
          ) : (
            <div className="p-4 sm:p-6">
              <div className="relative">
                {/* Timeline connector - hidden on mobile */}
                <div className="hidden sm:block absolute left-[27px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-[var(--admin-accent)] via-[var(--admin-border)] to-[var(--admin-border-light)]" />
                
                {lot.events.map((event, idx) => {
                  const cfg = EVENT_CONFIG[event.event_type] ?? { 
                    icon: (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="sm:w-[18px] sm:h-[18px]">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M12 8v4M12 16h.01"/>
                      </svg>
                    ), 
                    bg: "bg-[var(--admin-bg-subtle)]", 
                    accent: "var(--admin-text-secondary)",
                    dot: "var(--admin-text-muted)",
                    label: event.event_type 
                  };
                  const isLast = idx === lot.events.length - 1;
                  
                  return (
                    <div 
                      key={event.id} 
                      className={`relative flex gap-3 sm:gap-5 ${isLast ? "" : "pb-6 sm:pb-8"}`}
                      style={{ animationDelay: `${idx * 100}ms` }}
                    >
                      {/* Connector line to next - hidden on mobile */}
                      {!isLast && (
                        <div className="hidden sm:block absolute left-[27px] top-12 bottom-0 w-0.5 bg-gradient-to-b from-[var(--admin-border-light)] to-[var(--admin-bg-subtle)]" />
                      )}
                      
                      {/* Icon bubble */}
                      <div className="relative z-10 flex flex-shrink-0">
                        <div 
                          className={`flex h-10 w-10 sm:h-14 sm:w-14 items-center justify-center rounded-lg sm:rounded-2xl shadow-md ${cfg.bg} border-2 border-white`}
                          style={{ boxShadow: `0 4px 12px -2px ${cfg.accent}30` }}
                        >
                          <span className="text-[var(--admin-accent)]" style={{ color: cfg.accent }}>{cfg.icon}</span>
                        </div>
                        {/* Pulse dot */}
                        {isLast && (
                          <span 
                            className="absolute -bottom-0.5 -right-0.5 sm:-bottom-1 sm:-right-1 h-3 w-3 sm:h-4 sm:w-4 rounded-full border-2 border-white"
                            style={{ backgroundColor: cfg.dot }}
                          >
                            <span className="absolute inset-0 rounded-full animate-ping opacity-75" style={{ backgroundColor: cfg.dot, animationDuration: "2s" }} />
                          </span>
                        )}
                      </div>
                      
                      {/* Content */}
                      <div className={`flex-1 min-w-0 pt-0.5 sm:pt-1.5 ${isLast ? "" : "pb-4 sm:pb-4"}`}>
                        <div className="flex flex-wrap items-baseline gap-1.5 sm:gap-3">
                          <span className="text-sm sm:text-base font-bold text-[var(--admin-text-primary)]">{cfg.label}</span>
                          <span className="text-[10px] sm:text-xs text-[var(--admin-text-muted)] font-medium">
                            {new Date(event.event_time).toLocaleDateString("en-US", { 
                              weekday: 'short',
                              month: "short", 
                              day: "numeric", 
                              hour: "numeric", 
                              minute: "2-digit" 
                            })}
                          </span>
                        </div>
                        
                        {/* Event details */}
                        <div className="mt-2 space-y-1.5">
                          {event.location && (
                            <div className="flex items-center gap-2 text-xs text-[var(--admin-text-secondary)]">
                              <span className="text-[var(--admin-accent)]">{Icons.mapPin("w-3.5 h-3.5")}</span>
                              <span>{event.location}</span>
                            </div>
                          )}
                          {event.bin_id && (
                            <div className="inline-flex items-center gap-2 rounded-lg bg-[#fff3e0] px-2.5 py-1 text-xs font-bold text-[#e65100] border border-[#ffe082]">
                              {Icons.tag("w-3.5 h-3.5")}
                              <span>Bin: {event.bin_id}</span>
                            </div>
                          )}
                          {event.notes && (
                            <p className="text-xs text-[var(--admin-text-muted)] italic pl-0.5 border-l-2 border-[var(--admin-border-light)]">
                              {event.notes}
                            </p>
                          )}
                          {event.created_by_name && (
                            <div className="flex items-center gap-1.5 text-xs text-[var(--admin-border)]">
                              {Icons.user("w-3 h-3")}
                              <span>by {event.created_by_name}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status update modal */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <form onSubmit={handleUpdateStatus}>
              <div className="border-b border-[var(--admin-border-light)] px-6 py-4 bg-gradient-to-r from-[var(--admin-bg-subtle)] to-white">
                <h3 className="text-base font-bold text-[var(--admin-text-primary)]">Update Status</h3>
                <p className="text-xs text-[var(--admin-text-muted)] mt-0.5">Move this lot to the next stage</p>
              </div>
              <div className="space-y-4 p-6">
                <div>
                  <label className="block text-sm font-semibold text-[var(--admin-text-secondary)] mb-1.5">New Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    required
                    className="w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-bg-subtle)]/50 px-3 py-3 text-sm text-[var(--admin-text-primary)] outline-none focus:border-[var(--admin-accent)] focus:ring-2 focus:ring-[var(--admin-accent)]/20 transition-all"
                  >
                    <option value="">Select status...</option>
                    {STATUS_FLOW.filter((s) => s !== lot.status).map((s) => {
                      const c = EVENT_CONFIG[s];
                      return (
                        <option key={s} value={s}>
                          {c?.label ?? s}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[var(--admin-text-secondary)] mb-1.5">Location</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Warehouse A"
                    className="w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-bg-subtle)]/50 px-3 py-3 text-sm text-[var(--admin-text-primary)] outline-none focus:border-[var(--admin-accent)] focus:ring-2 focus:ring-[var(--admin-accent)]/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[var(--admin-text-secondary)] mb-1.5">Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any notes..."
                    rows={2}
                    className="w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-bg-subtle)]/50 px-3 py-3 text-sm text-[var(--admin-text-primary)] outline-none focus:border-[var(--admin-accent)] focus:ring-2 focus:ring-[var(--admin-accent)]/20 transition-all resize-none"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 border-t border-[var(--admin-border-light)] px-6 py-4 bg-[var(--admin-bg-subtle)]/30">
                <button type="button" onClick={() => setShowStatusModal(false)} className="rounded-xl border border-[var(--admin-border)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--admin-text-secondary)] hover:bg-[var(--admin-bg)] transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isPending || !newStatus} className="rounded-xl bg-[var(--admin-accent)] px-4 py-2.5 text-sm font-bold text-white hover:bg-[var(--admin-accent-hover)] disabled:opacity-50 transition-colors shadow-md hover:shadow-lg">
                  {isPending ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Bin modal */}
      {showBinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <form onSubmit={handleAddBin}>
              <div className="border-b border-[var(--admin-border-light)] px-6 py-4 bg-gradient-to-r from-[#fff8e1] to-white">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#ffe082]">
                    {Icons.tag("w-4 h-4 text-[#f57c00]")}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[var(--admin-text-primary)]">Add Bin / Tag</h3>
                    <p className="text-xs text-[var(--admin-text-muted)]">Log a bin or pallet tag event</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4 p-6">
                <div>
                  <label className="block text-sm font-semibold text-[var(--admin-text-secondary)] mb-1.5">Bin or Container ID *</label>
                  <input
                    type="text"
                    value={binId}
                    onChange={(e) => setBinId(e.target.value)}
                    placeholder="e.g. BIN-042"
                    required
                    className="w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-bg-subtle)]/50 px-3 py-3 text-sm text-[var(--admin-text-primary)] outline-none focus:border-[#ffb74d] focus:ring-2 focus:ring-[#ffe082]/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[var(--admin-text-secondary)] mb-1.5">Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Weight, count, or other details..."
                    rows={2}
                    className="w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-bg-subtle)]/50 px-3 py-3 text-sm text-[var(--admin-text-primary)] outline-none focus:border-[#ffb74d] focus:ring-2 focus:ring-[#ffe082]/20 transition-all resize-none"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 border-t border-[var(--admin-border-light)] px-6 py-4 bg-[var(--admin-bg-subtle)]/30">
                <button type="button" onClick={() => setShowBinModal(false)} className="rounded-xl border border-[var(--admin-border)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--admin-text-secondary)] hover:bg-[var(--admin-bg)] transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isPending || !binId} className="rounded-xl bg-[#f57c00] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#e65100] disabled:opacity-50 transition-colors shadow-md hover:shadow-lg">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <form onSubmit={handleMarkUsedInOrder}>
              <div className="border-b border-[var(--admin-border-light)] px-6 py-4 bg-gradient-to-r from-[#e8f5e9] to-white">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#c8e6c9]">
                    {Icons.package("w-4 h-4 text-[#2e7d32]")}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[var(--admin-text-primary)]">Mark as Used in Order</h3>
                    <p className="text-xs text-[var(--admin-text-muted)]">Record which order this lot was assigned to</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4 p-6">
                <div>
                  <label className="block text-sm font-semibold text-[var(--admin-text-secondary)] mb-1.5">Order ID *</label>
                  <input
                    type="text"
                    value={usedOrderId}
                    onChange={(e) => setUsedOrderId(e.target.value.toUpperCase())}
                    placeholder="e.g. 4f3e2a1b-..."
                    required
                    className="w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-bg-subtle)]/50 px-3 py-3 text-sm font-mono text-[var(--admin-text-primary)] outline-none focus:border-[#66bb6a] focus:ring-2 focus:ring-[#c8e6c9]/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[var(--admin-text-secondary)] mb-1.5">Quantity Used (lbs)</label>
                  <input
                    type="number"
                    value={usedQty}
                    onChange={(e) => setUsedQty(e.target.value)}
                    placeholder="Leave blank to auto-detect"
                    min="0"
                    className="w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-bg-subtle)]/50 px-3 py-3 text-sm text-[var(--admin-text-primary)] outline-none focus:border-[#66bb6a] focus:ring-2 focus:ring-[#c8e6c9]/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[var(--admin-text-secondary)] mb-1.5">Notes</label>
                  <textarea
                    value={usedNotes}
                    onChange={(e) => setUsedNotes(e.target.value)}
                    placeholder="Any notes..."
                    rows={2}
                    className="w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-bg-subtle)]/50 px-3 py-3 text-sm text-[var(--admin-text-primary)] outline-none focus:border-[#66bb6a] focus:ring-2 focus:ring-[#c8e6c9]/20 transition-all resize-none"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 border-t border-[var(--admin-border-light)] px-6 py-4 bg-[var(--admin-bg-subtle)]/30">
                <button type="button" onClick={() => setShowUsedModal(false)} className="rounded-xl border border-[var(--admin-border)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--admin-text-secondary)] hover:bg-[var(--admin-bg)] transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isPending || !usedOrderId.trim()} className="rounded-xl bg-[#4caf50] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#388e3c] disabled:opacity-50 transition-colors shadow-md hover:shadow-lg">
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
