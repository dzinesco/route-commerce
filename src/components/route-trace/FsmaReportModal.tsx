"use client";

import { useState, useEffect } from "react";
import { formatDate } from "@/lib/format-date";

// One-color outline icons
const Icons = {
  clipboard: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
      <path d="M12 11h4M12 16h4M8 11h.01M8 16h.01"/>
    </svg>
  ),
  refresh: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
      <path d="M21 3v5h-5"/>
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
      <path d="M8 16H3v5"/>
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
  check: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5"/>
    </svg>
  ),
  alert: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
      <path d="M12 9v4"/>
      <path d="M12 17h.01"/>
    </svg>
  ),
  clock: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  scale: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/>
      <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/>
      <path d="M7 21h10"/>
      <path d="M12 3v18"/>
      <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>
    </svg>
  ),
  chart: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" x2="12" y1="20" y2="10"/>
      <line x1="18" x2="18" y1="20" y2="4"/>
      <line x1="6" x2="6" y1="20" y2="16"/>
    </svg>
  ),
  search: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/>
      <path d="m21 21-4.3-4.3"/>
    </svg>
  ),
  download: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" x2="12" y1="15" y2="3"/>
    </svg>
  ),
};

interface LotCompliance {
  lot_id: string;
  lot_number: string;
  crop_type: string;
  variety: string | null;
  harvest_date: string;
  field_location: string | null;
  field_block: string | null;
  worker_name: string | null;
  packer_name: string | null;
  quantity_lbs: number | null;
  quantity_used_lbs: number | null;
  yield_estimate_lbs: number | null;
  yield_unit: string | null;
  bin_id: string | null;
  status: string;
  event_count: number;
  has_traceability: boolean;
  compliance_status: "compliant" | "non_compliant" | "pending";
  issues: string[];
}

interface ComplianceSnapshot {
  lots: LotCompliance[];
  summary: {
    total_lots: number;
    compliant: number;
    non_compliant: number;
    pending: number;
    total_weight: number;
    used_weight: number;
    remaining_weight: number;
    crops: string[];
  };
}

const STATUS_BADGE: Record<string, { bg: string; text: string; dot: string }> = {
  compliant: { bg: "bg-green-50", text: "text-green-700", dot: "bg-green-500" },
  non_compliant: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
  pending: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
};

const LOT_STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  active: { label: "Active", bg: "bg-green-50", text: "text-green-700" },
  in_transit: { label: "In Transit", bg: "bg-amber-50", text: "text-amber-700" },
  at_shed: { label: "At Shed", bg: "bg-blue-50", text: "text-blue-700" },
  packed: { label: "Packed", bg: "bg-purple-50", text: "text-purple-700" },
  delivered: { label: "Delivered", bg: "bg-stone-100", text: "text-stone-600" },
};

function ComplianceBadge({ status }: { status: "compliant" | "non_compliant" | "pending" }) {
  const cfg = STATUS_BADGE[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${cfg.bg} ${cfg.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {status === "compliant" ? "Compliant" : status === "non_compliant" ? "Issue" : "Pending"}
    </span>
  );
}

function SummaryCard({ icon, label, value, subtext, color }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtext?: string;
  color: "green" | "red" | "amber" | "blue" | "stone";
}) {
  const colors = {
    green: "bg-green-50 border-green-100 text-green-800",
    red: "bg-red-50 border-red-100 text-red-800",
    amber: "bg-amber-50 border-amber-100 text-amber-800",
    blue: "bg-blue-50 border-blue-100 text-blue-800",
    stone: "bg-stone-50 border-stone-200 text-stone-800",
  };
  return (
    <div className={`rounded-xl border px-4 py-3 ${colors[color]}`}>
      <div className="flex items-center gap-1.5">
        <span className="text-sm">{icon}</span>
        <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">{label}</span>
      </div>
      <p className="text-2xl font-black mt-0.5">{value}</p>
      {subtext && <p className="text-[10px] opacity-60 mt-0.5">{subtext}</p>}
    </div>
  );
}

export default function FsmaReportModal({ brandId }: { brandId: string }) {
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ComplianceSnapshot | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showOnlyIssues, setShowOnlyIssues] = useState(false);

  useEffect(() => {
    if (open && startDate && endDate) {
      fetchComplianceData();
    }
  }, [open, startDate, endDate]);

  async function fetchComplianceData() {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/route-trace/fsma-compliance?brandId=${brandId}&startDate=${startDate}&endDate=${endDate}`
      );
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        setData(null);
      }
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  function handleDownload() {
    const url = `/api/route-trace/fsma-report?brandId=${brandId}&startDate=${startDate}&endDate=${endDate}&format=csv`;
    window.location.href = url;
    setOpen(false);
  }

  const filteredLots = data?.lots.filter((lot) => {
    const matchesSearch =
      !search ||
      lot.lot_number.toLowerCase().includes(search.toLowerCase()) ||
      lot.crop_type.toLowerCase().includes(search.toLowerCase()) ||
      (lot.field_location ?? "").toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === "all" || lot.status === filterStatus;
    const matchesIssues = !showOnlyIssues || lot.compliance_status !== "compliant";
    return matchesSearch && matchesStatus && matchesIssues;
  }) ?? [];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-xl border border-stone-200 bg-white px-5 py-3 text-sm font-semibold text-stone-600 hover:bg-stone-50 transition-colors"
      >
        {Icons.clipboard("h-4 w-4 mr-1.5")} FSMA Report
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
          style={{ backdropFilter: "blur(4px)" }}
        >
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.2) 100%)",
              backdropFilter: "blur(60px) saturate(180%)",
            }}
          />

          {/* Modal card */}
          <div
            className="relative w-full max-w-5xl rounded-2xl max-h-[90vh] flex flex-col"
            style={{
              background: "rgba(255, 255, 255, 0.92)",
              backdropFilter: "blur(40px) saturate(200%)",
              WebkitBackdropFilter: "blur(40px) saturate(200%)",
              border: "1px solid rgba(255, 255, 255, 0.5)",
              boxShadow: `
                0 25px 50px -12px rgba(0, 0, 0, 0.25),
                0 12px 24px -8px rgba(0, 0, 0, 0.15)
              `,
            }}
          >
            {/* Top gradient border */}
            <div
              className="absolute top-0 left-0 right-0 rounded-t-2xl overflow-hidden"
              style={{
                background: "linear-gradient(180deg, rgba(120, 113, 108, 0.1) 0%, transparent 100%)",
                height: "1px",
              }}
            />

            {/* Header */}
            <div
              className="flex items-center justify-between px-6 py-5"
              style={{ borderBottom: "1px solid rgba(0, 0, 0, 0.06)" }}
            >
              <div>
                <h2 className="text-xl font-semibold text-stone-950" style={{ letterSpacing: "-0.02em" }}>
                  <div className="flex items-center gap-2"><span className="text-lg">{Icons.clipboard("h-5 w-5")}</span> FSMA Compliance Snapshot</div>
                </h2>
                <p className="mt-1 text-sm text-stone-500">
                  One-up / one-down traceability report
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full transition-all"
                style={{ background: "rgba(0, 0, 0, 0.04)", color: "rgba(0, 0, 0, 0.4)" }}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6">
              {/* Date Range Selector */}
              <div className="flex items-end gap-4 mb-6">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-stone-500 mb-1.5 uppercase tracking-wider">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-stone-400"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-stone-500 mb-1.5 uppercase tracking-wider">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-stone-400"
                  />
                </div>
                <button
                  onClick={fetchComplianceData}
                  className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 transition-colors"
                >
                  {Icons.refresh("h-4 w-4 mr-1.5")} Refresh
                </button>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="flex items-center gap-3 text-stone-500">
                    <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span className="text-sm font-medium">Loading compliance data…</span>
                  </div>
                </div>
              ) : data ? (
                <>
                  {/* Summary Cards */}
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
                    <SummaryCard
                      icon={Icons.package("h-4 w-4")}
                      label="Total Lots"
                      value={data.summary.total_lots}
                      color="stone"
                    />
                    <SummaryCard
                      icon={Icons.check("h-4 w-4")}
                      label="Compliant"
                      value={data.summary.compliant}
                      subtext={`${data.summary.total_lots > 0 ? Math.round((data.summary.compliant / data.summary.total_lots) * 100) : 0}%`}
                      color="green"
                    />
                    <SummaryCard
                      icon={Icons.alert("h-4 w-4")}
                      label="Issues"
                      value={data.summary.non_compliant}
                      color="red"
                    />
                    <SummaryCard
                      icon={Icons.clock("h-4 w-4")}
                      label="Pending"
                      value={data.summary.pending}
                      color="amber"
                    />
                    <SummaryCard
                      icon={Icons.scale("h-4 w-4")}
                      label="Total Weight"
                      value={data.summary.total_weight > 0 ? `${(data.summary.total_weight / 1000).toFixed(1)}k` : "—"}
                      subtext={data.summary.total_weight > 0 ? "lbs" : ""}
                      color="blue"
                    />
                    <SummaryCard
                      icon={Icons.chart("h-4 w-4")}
                      label="Crops"
                      value={data.summary.crops.length}
                      color="stone"
                    />
                  </div>

                  {/* Filters */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">{Icons.search("h-4 w-4")}</span>
                      <input
                        type="text"
                        placeholder="Search lot number, crop, field…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 rounded-xl border border-stone-200 bg-white text-sm outline-none focus:border-stone-400"
                      />
                    </div>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-stone-400"
                    >
                      <option value="all">All Status</option>
                      <option value="active">Active</option>
                      <option value="in_transit">In Transit</option>
                      <option value="at_shed">At Shed</option>
                      <option value="packed">Packed</option>
                      <option value="delivered">Delivered</option>
                    </select>
                    <label className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showOnlyIssues}
                        onChange={(e) => setShowOnlyIssues(e.target.checked)}
                        className="rounded"
                      />
                      <span className="text-xs font-semibold text-red-700 flex items-center gap-1">{Icons.alert("h-3.5 w-3.5")} Issues only</span>
                    </label>
                  </div>

                  {/* Table */}
                  <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-stone-100 bg-stone-50/50">
                            <th className="px-4 py-3 text-left text-[10px] font-bold text-stone-500 uppercase tracking-widest">
                              Compliance
                            </th>
                            <th className="px-4 py-3 text-left text-[10px] font-bold text-stone-500 uppercase tracking-widest">
                              Lot #
                            </th>
                            <th className="px-4 py-3 text-left text-[10px] font-bold text-stone-500 uppercase tracking-widest">
                              Crop
                            </th>
                            <th className="px-4 py-3 text-left text-[10px] font-bold text-stone-500 uppercase tracking-widest">
                              Harvest Date
                            </th>
                            <th className="px-4 py-3 text-left text-[10px] font-bold text-stone-500 uppercase tracking-widest">
                              Field
                            </th>
                            <th className="px-4 py-3 text-right text-[10px] font-bold text-stone-500 uppercase tracking-widest">
                              Weight
                            </th>
                            <th className="px-4 py-3 text-left text-[10px] font-bold text-stone-500 uppercase tracking-widest">
                              Status
                            </th>
                            <th className="px-4 py-3 text-center text-[10px] font-bold text-stone-500 uppercase tracking-widest">
                              Events
                            </th>
                            <th className="px-4 py-3 text-left text-[10px] font-bold text-stone-500 uppercase tracking-widest">
                              Issues
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredLots.length === 0 ? (
                            <tr>
                              <td colSpan={9} className="px-4 py-12 text-center text-sm text-stone-400">
                                {data.summary.total_lots === 0
                                  ? "No lots found for this date range"
                                  : "No lots match your filters"}
                              </td>
                            </tr>
                          ) : (
                            filteredLots.map((lot) => {
                              const lotStatusCfg = LOT_STATUS_CONFIG[lot.status] ?? LOT_STATUS_CONFIG.active;
                              return (
                                <tr
                                  key={lot.lot_id}
                                  className="border-b border-stone-50 last:border-0 hover:bg-stone-50/40 transition-colors"
                                >
                                  <td className="px-4 py-3">
                                    <ComplianceBadge status={lot.compliance_status} />
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className="font-mono text-sm font-bold text-stone-900">
                                      {lot.lot_number}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className="text-sm font-semibold text-stone-700">
                                      {lot.crop_type}
                                    </span>
                                    {lot.variety && (
                                      <span className="ml-1 text-xs text-stone-400">{lot.variety}</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className="text-sm text-stone-600">
                                      {formatDate(lot.harvest_date)}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className="text-sm text-stone-600">
                                      {lot.field_location ?? "—"}
                                    </span>
                                    {lot.field_block && lot.field_block !== "N/A" && (
                                      <span className="ml-1 text-xs text-stone-400">
                                        · Block {lot.field_block}
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <span className="text-sm font-semibold text-stone-700">
                                      {lot.quantity_lbs
                                        ? Number(lot.quantity_lbs).toLocaleString()
                                        : "—"}
                                    </span>
                                    <span className="text-[10px] text-stone-400 ml-1">
                                      {lot.yield_unit ?? "lbs"}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${lotStatusCfg.bg} ${lotStatusCfg.text}`}>
                                      <span className="h-1 w-1 rounded-full bg-current" />
                                      {lotStatusCfg.label}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <span className={`inline-flex items-center justify-center rounded-full h-6 w-6 text-xs font-bold ${
                                      lot.event_count > 0 ? "bg-emerald-50 text-emerald-700" : "bg-stone-100 text-stone-500"
                                    }`}>
                                      {lot.event_count}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3">
                                    {lot.issues.length > 0 ? (
                                      <div className="flex flex-wrap gap-1">
                                        {lot.issues.map((issue, i) => (
                                          <span
                                            key={i}
                                            className="inline-flex items-center rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-600"
                                          >
                                            {issue}
                                          </span>
                                        ))}
                                      </div>
                                    ) : (
                                      <span className="text-xs text-stone-400">—</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Results count */}
                  <p className="mt-3 text-xs text-stone-400 text-center">
                    Showing {filteredLots.length} of {data.summary.total_lots} lots
                    {data.summary.crops.length > 0 && ` • Crops: ${data.summary.crops.join(", ")}`}
                  </p>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="text-stone-300 mb-3">{Icons.clipboard("h-12 w-12")}</div>
                  <p className="text-sm text-stone-500">No compliance data available</p>
                  <p className="text-xs text-stone-400 mt-1">Select a date range and try again</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div
              className="flex items-center justify-between px-6 py-4"
              style={{ borderTop: "1px solid rgba(0, 0, 0, 0.06)" }}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs text-stone-400">
                  FSMA Food Safety Modernization Act — Produce Traceability
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-600 hover:bg-stone-50 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={handleDownload}
                  disabled={loading || !data}
                  className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  <span className="flex items-center gap-1.5 text-sm font-semibold">{Icons.download("h-4 w-4")} Download CSV</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
