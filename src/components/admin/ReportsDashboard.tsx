"use client";

import { useState, useCallback, useEffect } from "react";
import {
  getReportsSummary,
  getOrdersByStopReport,
  getSalesByProductReport,
  getFulfillmentReport,
  getPickupStatusByStop,
  getContactGrowthReport,
  getCampaignActivityReport,
} from "@/actions/reports";
import {
  exportOrdersByStop,
  exportSalesByProduct,
  exportPickupStatus,
  exportContactGrowth,
  exportFulfillment,
  exportCampaignActivity,
  type ReportsSummary,
  type OrderByStop,
  type SalesByProduct,
  type FulfillmentRow,
  type PickupStatusByStop,
  type ContactGrowthRow,
  type CampaignActivityRow,
} from "@/lib/reports-export";
import { formatDate, formatDateRange } from "@/lib/date-utils";

type DatePreset = "week" | "month" | "quarter" | "this_year" | "custom";

type DateRange = { start: string; end: string };

function buildRange(preset: DatePreset, customStart?: string, customEnd?: string): DateRange {
  const now = new Date();
  const toDateStr = (d: Date) => d.toISOString().slice(0, 10);
  const today = toDateStr(now);

  switch (preset) {
    case "week": {
      const s = new Date(now);
      s.setDate(s.getDate() - 6);
      return { start: toDateStr(s), end: today };
    }
    case "month": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: toDateStr(start), end: today };
    }
    case "quarter": {
      const q = Math.floor(now.getMonth() / 3);
      const start = new Date(now.getFullYear(), q * 3, 1);
      return { start: toDateStr(start), end: today };
    }
    case "this_year": {
      const start = new Date(now.getFullYear(), 0, 1);
      return { start: toDateStr(start), end: today };
    }
    case "custom":
      return { start: customStart ?? today, end: customEnd ?? today };
  }
}

// ── Quarter label helper ──────────────────────────────────────────────────────
function quarterLabel(startISO: string): string {
  const s = new Date(startISO + "T00:00:00");
  const q = Math.floor(s.getMonth() / 3) + 1;
  return `Q${q} ${s.getFullYear()}`;
}

function monthLabel(startISO: string): string {
  const s = new Date(startISO + "T00:00:00");
  return s.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

// ── Summary card ─────────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  prefix,
  suffix,
}: {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-4">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-zinc-100">
        {prefix ?? ""}{typeof value === "number" ? value.toLocaleString() : value}{suffix ?? ""}
      </p>
    </div>
  );
}

// ── CSV export button ───────────────────────────────────────────────────────

function ExportBtn({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-lg border border-zinc-600 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:bg-zinc-800"
    >
      Export CSV
    </button>
  );
}

function ExplainBtn({
  onClick,
  loading,
}: {
  onClick: () => void;
  loading: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="rounded-lg border border-violet-300 bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700 hover:bg-violet-100 disabled:opacity-50"
    >
      {loading ? "Analyzing..." : "🤖 Explain this Report"}
    </button>
  );
}

// ── Generic table ───────────────────────────────────────────────────────────

function ReportTable({ headers, rows, renderRow }: {
  headers: string[];
  rows: unknown[];
  renderRow: (row: unknown, i: number) => React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800 bg-slate-50">
            {headers.map((h) => (
              <th key={h} className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={headers.length} className="px-3 py-6 text-center text-slate-400">
                No data
              </td>
            </tr>
          ) : (
            rows.map((_, i) => renderRow(_, i))
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── Tab definitions ─────────────────────────────────────────────────────────

type Tab = {
  id: string;
  label: string;
};

const TABS: Tab[] = [
  { id: "overview", label: "Overview" },
  { id: "orders-by-stop", label: "Orders by Stop" },
  { id: "sales-by-product", label: "Sales by Product" },
  { id: "fulfillment", label: "Fulfillment" },
  { id: "pickup-status", label: "Pickup Status" },
  { id: "contact-growth", label: "Contact Growth" },
  { id: "campaigns", label: "Campaigns" },
];

// ── Main component ──────────────────────────────────────────────────────────

export default function ReportsDashboard({
  brands,
  initialBrandId,
  isPlatformAdmin,
  brandId,
}: {
  brands: { id: string; name: string }[];
  initialBrandId: string | null;
  isPlatformAdmin: boolean;
  brandId?: string | null;
}) {
  const [preset, setPreset] = useState<DatePreset>("quarter");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [selectedBrandId, setSelectedBrandId] = useState<string>(initialBrandId ?? "");
  const [activeTab, setActiveTab] = useState("overview");
  const [summary, setSummary] = useState<ReportsSummary | null>(null);
  const [ordersByStop, setOrdersByStop] = useState<OrderByStop[]>([]);
  const [salesByProduct, setSalesByProduct] = useState<SalesByProduct[]>([]);
  const [fulfillment, setFulfillment] = useState<FulfillmentRow[]>([]);
  const [pickupStatus, setPickupStatus] = useState<PickupStatusByStop[]>([]);
  const [contactGrowth, setContactGrowth] = useState<ContactGrowthRow[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignActivityRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [explainingTab, setExplainingTab] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<{ summary: string; keyInsights: string[]; suggestedActions: string[] } | null>(null);
  const [explainError, setExplainError] = useState<string | null>(null);

  const range: DateRange = buildRange(preset, customStart, customEnd);

  // Stable memoized fetchAll — re-fetches when range or brand changes
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);

    const brandId = selectedBrandId || null;

    try {
      const [sum, obs, sbp, ful, ps, cg, cam] = await Promise.all([
        getReportsSummary(range, selectedBrandId || null),
        getOrdersByStopReport(range, selectedBrandId || null),
        getSalesByProductReport(range, selectedBrandId || null),
        getFulfillmentReport(range, selectedBrandId || null),
        getPickupStatusByStop(range, selectedBrandId || null),
        getContactGrowthReport(range, selectedBrandId || null),
        getCampaignActivityReport(range, selectedBrandId || null),
      ]);
      setSummary(sum);
      setOrdersByStop(obs);
      setSalesByProduct(sbp);
      setFulfillment(ful);
      setPickupStatus(ps);
      setContactGrowth(cg);
      setCampaigns(cam);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reports");
    } finally {
      setLoading(false);
    }
   
  }, [range, selectedBrandId]);

  const handleFetch = () => {
    fetchAll();
  };

  // ── AI Report Explainer ────────────────────────────────────────────────────────

  async function handleExplain() {
    setExplainingTab(activeTab);
    setExplanation(null);
    setExplainError(null);

    const tabDataMap: Record<string, unknown[]> = {
      "orders-by-stop": ordersByStop,
      "sales-by-product": salesByProduct,
      "fulfillment": fulfillment,
      "pickup-status": pickupStatus,
      "contact-growth": contactGrowth,
      "campaigns": campaigns,
    };

    const data = tabDataMap[activeTab] ?? [];

    try {
      const res = await fetch("/api/ai/report-explainer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportType: activeTab,
          dateRange: range,
          brandId: brandId ?? selectedBrandId,
          reportData: data,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? "Analysis failed");
      setExplanation(result);
    } catch (err) {
      setExplainError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setExplainingTab(null);
    }
  }

  // Close explanation panel
  function closeExplanation() {
    setExplanation(null);
    setExplainError(null);
  }

  function handleExportCSV(exportFn: () => string, filename: string) {
    const csv = exportFn();
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Auto-fetch when brand changes
  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBrandId]);

  return (
    <div className="space-y-6">
      {/* ── Error banner ─────────────────────────────────────────────────── */}
      {error && (
        <div className="rounded-xl bg-red-900/30 border border-red-200 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* ── Filters ────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl bg-zinc-900 border border-zinc-800 px-5 py-4">
        {/* Date preset */}
        <div className="flex gap-1.5">
          {(["week", "month", "quarter", "this_year", "custom"] as DatePreset[]).map((p) => (
            <button
              key={p}
              onClick={() => setPreset(p)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                preset === p
                  ? "bg-blue-600 text-white shadow-black/20"
                  : "bg-zinc-950 text-zinc-400 hover:bg-slate-200"
              }`}
            >
              {p === "week" ? "This Week" : p === "month" ? "This Month" : p === "quarter" ? "This Quarter" : p === "this_year" ? "This Year" : "Custom"}
            </button>
          ))}
        </div>

        {/* Custom date inputs */}
        {preset === "custom" && (
          <div className="flex gap-2 items-center">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="rounded-lg border border-zinc-600 px-3 py-1.5 text-xs"
            />
            <span className="text-slate-400 text-xs">to</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="rounded-lg border border-zinc-600 px-3 py-1.5 text-xs"
            />
          </div>
        )}

        {/* Brand filter (platform_admin only) */}
        {isPlatformAdmin && (
          <select
            value={selectedBrandId}
            onChange={(e) => setSelectedBrandId(e.target.value)}
            className="rounded-lg border border-zinc-600 px-3 py-1.5 text-xs"
          >
            <option value="">All Brands</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        )}

        <button
          onClick={handleFetch}
          disabled={loading}
          className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Loading..." : "Refresh"}
        </button>

        <span className="ml-auto text-sm font-medium text-zinc-500">
          {preset === "quarter" ? quarterLabel(range.start) :
           preset === "this_year" ? `${new Date().getFullYear()} YTD` :
           preset === "month" ? monthLabel(range.start) :
           preset === "custom" ? `${range.start} → ${range.end}` :
           formatDateRange(range.start, range.end)}
        </span>
      </div>

      {/* ── Tab bar ────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 border-b border-zinc-800">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              activeTab === tab.id
                ? "border-blue-600 text-blue-400"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab content ──────────────────────────────────────────────────────── */}

      {/* OVERVIEW */}
      {activeTab === "overview" && summary && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <SummaryCard label="Gross Sales" value={summary.gross_sales} prefix="$" />
            <SummaryCard label="Total Orders" value={summary.total_orders} />
            <SummaryCard label="Avg Order Value" value={summary.avg_order_value} prefix="$" />
            <SummaryCard label="Contacts Added" value={summary.contacts_added} />
            <SummaryCard label="Pickup Orders" value={summary.pickup_orders} />
            <SummaryCard label="Shipping Orders" value={summary.shipping_orders} />
            <SummaryCard label="Pending Pickups" value={summary.pending_pickups} />
            <SummaryCard label="Completed Pickups" value={summary.completed_pickups} />
            <SummaryCard label="Campaigns Sent" value={summary.campaigns_sent} />
            <SummaryCard label="Messages Logged" value={summary.messages_logged} />
          </div>
          <p className="text-xs text-slate-400">
            {formatDateRange(range.start, range.end)}
            {selectedBrandId ? ` · Brand: ${brands.find(b => b.id === selectedBrandId)?.name ?? selectedBrandId}` : " · All Brands"}
          </p>
        </div>
      )}

      {activeTab === "overview" && !summary && !loading && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-6 py-12 text-center text-slate-400">
          Click Refresh to load summary data
        </div>
      )}

      {/* ORDERS BY STOP */}
      {activeTab === "orders-by-stop" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-300">Orders by Stop</h3>
            <div className="flex gap-2">
              <ExplainBtn onClick={handleExplain} loading={explainingTab === "orders-by-stop"} />
              {ordersByStop.length > 0 && (
                <ExportBtn
                  label="Export CSV"
                  onClick={() => handleExportCSV(() => exportOrdersByStop(ordersByStop), `orders-by-stop-${range.start}.csv`)}
                />
              )}
            </div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
            <ReportTable
              headers={["Stop", "City", "State", "Date", "Orders", "Gross Sales", "Pending", "Completed"]}
              rows={ordersByStop}
              renderRow={(row) => {
                const r = row as OrderByStop;
                return (
                  <tr key={r.stop_name + r.date} className="border-t border-slate-100 hover:bg-zinc-800">
                    <td className="px-3 py-2 font-medium text-zinc-100">{r.stop_name}</td>
                    <td className="px-3 py-2 text-zinc-400">{r.city}</td>
                    <td className="px-3 py-2 text-zinc-400">{r.state}</td>
                    <td className="px-3 py-2 text-zinc-400">{formatDate(r.date)}</td>
                    <td className="px-3 py-2 text-right font-medium">{r.order_count}</td>
                    <td className="px-3 py-2 text-right">${r.gross_sales.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right text-amber-400">{r.pending_count}</td>
                    <td className="px-3 py-2 text-right text-green-600">{r.completed_count}</td>
                  </tr>
                );
              }}
            />
          </div>
        </div>
      )}

      {/* SALES BY PRODUCT */}
      {activeTab === "sales-by-product" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-300">Sales by Product</h3>
            <div className="flex gap-2">
              <ExplainBtn onClick={handleExplain} loading={explainingTab === "sales-by-product"} />
              {salesByProduct.length > 0 && (
                <ExportBtn
                  label="Export CSV"
                  onClick={() => handleExportCSV(() => exportSalesByProduct(salesByProduct), `sales-by-product-${range.start}.csv`)}
                />
              )}
            </div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
            <ReportTable
              headers={["Product", "Units Sold", "Gross Revenue", "Avg Price"]}
              rows={salesByProduct}
              renderRow={(row) => {
                const r = row as SalesByProduct;
                return (
                  <tr key={r.product_name} className="border-t border-slate-100 hover:bg-zinc-800">
                    <td className="px-3 py-2 font-medium text-zinc-100">{r.product_name}</td>
                    <td className="px-3 py-2 text-right">{r.units_sold}</td>
                    <td className="px-3 py-2 text-right font-medium">${r.gross_revenue.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right text-zinc-500">${r.avg_price}</td>
                  </tr>
                );
              }}
            />
          </div>
        </div>
      )}

      {/* FULFILLMENT */}
      {activeTab === "fulfillment" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-300">Fulfillment Breakdown</h3>
            <div className="flex gap-2">
              <ExplainBtn onClick={handleExplain} loading={explainingTab === "fulfillment"} />
              {fulfillment.length > 0 && (
                <ExportBtn
                  label="Export CSV"
                  onClick={() => handleExportCSV(() => exportFulfillment(fulfillment), `fulfillment-${range.start}.csv`)}
                />
              )}
            </div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
            <ReportTable
              headers={["Fulfillment Type", "Order Count", "Revenue", "% of Total"]}
              rows={fulfillment}
              renderRow={(row) => {
                const r = row as FulfillmentRow;
                return (
                  <tr key={r.fulfillment_type} className="border-t border-slate-100 hover:bg-zinc-800">
                    <td className="px-3 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        r.fulfillment_type === "pickup" ? "bg-blue-900/40 text-blue-700" :
                        r.fulfillment_type === "shipping" ? "bg-purple-100 text-purple-700" :
                        "bg-zinc-950 text-zinc-300"
                      }`}>{r.fulfillment_type}</span>
                    </td>
                    <td className="px-3 py-2 text-right">{r.order_count}</td>
                    <td className="px-3 py-2 text-right font-medium">${r.revenue.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right text-zinc-500">{r.pct_of_total}%</td>
                  </tr>
                );
              }}
            />
          </div>
        </div>
      )}

      {/* PICKUP STATUS */}
      {activeTab === "pickup-status" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-300">Pickup Status by Stop</h3>
            <div className="flex gap-2">
              <ExplainBtn onClick={handleExplain} loading={explainingTab === "pickup-status"} />
              {pickupStatus.length > 0 && (
                <ExportBtn
                  label="Export CSV"
                  onClick={() => handleExportCSV(() => exportPickupStatus(pickupStatus), `pickup-status-${range.start}.csv`)}
                />
              )}
            </div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
            <ReportTable
              headers={["Stop", "City", "Date", "Total Orders", "Pending", "Completed", "Canceled"]}
              rows={pickupStatus}
              renderRow={(row) => {
                const r = row as PickupStatusByStop;
                return (
                  <tr key={r.stop_name + r.date} className="border-t border-slate-100 hover:bg-zinc-800">
                    <td className="px-3 py-2 font-medium text-zinc-100">{r.stop_name}</td>
                    <td className="px-3 py-2 text-zinc-400">{r.city}</td>
                    <td className="px-3 py-2 text-zinc-400">{formatDate(r.date)}</td>
                    <td className="px-3 py-2 text-right font-medium">{r.total_orders}</td>
                    <td className="px-3 py-2 text-right text-amber-400">{r.pending}</td>
                    <td className="px-3 py-2 text-right text-green-600">{r.completed}</td>
                    <td className="px-3 py-2 text-right text-slate-400">{r.canceled}</td>
                  </tr>
                );
              }}
            />
          </div>
        </div>
      )}

      {/* CONTACT GROWTH */}
      {activeTab === "contact-growth" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-300">Contact Growth</h3>
            <div className="flex gap-2">
              <ExplainBtn onClick={handleExplain} loading={explainingTab === "contact-growth"} />
              {contactGrowth.length > 0 && (
                <ExportBtn
                  label="Export CSV"
                  onClick={() => handleExportCSV(() => exportContactGrowth(contactGrowth), `contact-growth-${range.start}.csv`)}
                />
              )}
            </div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
            <ReportTable
              headers={["Date", "New Contacts", "Imports", "Total"]}
              rows={contactGrowth}
              renderRow={(row) => {
                const r = row as ContactGrowthRow;
                return (
                  <tr key={r.date} className="border-t border-slate-100 hover:bg-zinc-800">
                    <td className="px-3 py-2 text-zinc-300">{r.date}</td>
                    <td className="px-3 py-2 text-right">{r.new_contacts}</td>
                    <td className="px-3 py-2 text-right text-blue-400">{r.imports}</td>
                    <td className="px-3 py-2 text-right font-medium">{r.total}</td>
                  </tr>
                );
              }}
            />
          </div>
        </div>
      )}

      {/* CAMPAIGNS */}
      {activeTab === "campaigns" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-300">Campaign Activity</h3>
            <div className="flex gap-2">
              <ExplainBtn onClick={handleExplain} loading={explainingTab === "campaigns"} />
              {campaigns.length > 0 && (
                <ExportBtn
                  label="Export CSV"
                  onClick={() => handleExportCSV(() => exportCampaignActivity(campaigns), `campaigns-${range.start}.csv`)}
                />
              )}
            </div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
            <ReportTable
              headers={["Campaign", "Status", "Type", "Sent At", "Messages Logged"]}
              rows={campaigns}
              renderRow={(row) => {
                const r = row as CampaignActivityRow;
                return (
                  <tr key={r.campaign_name} className="border-t border-slate-100 hover:bg-zinc-800">
                    <td className="px-3 py-2 font-medium text-zinc-100">{r.campaign_name}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        r.status === "sent" ? "bg-green-900/40 text-green-400" :
                        r.status === "draft" ? "bg-zinc-950 text-zinc-400" :
                        "bg-amber-100 text-amber-700"
                      }`}>{r.status}</span>
                    </td>
                    <td className="px-3 py-2 text-zinc-500 text-xs">{r.campaign_type}</td>
                    <td className="px-3 py-2 text-zinc-500 text-xs">{r.sent_at ?? "—"}</td>
                    <td className="px-3 py-2 text-right">{r.messages_logged}</td>
                  </tr>
                );
              }}
            />
          </div>
        </div>
      )}

      {/* ── AI Explanation Panel ──────────────────────────────────────────────── */}
      {explanation && (
        <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white shadow-lg overflow-hidden">
          <div className="bg-violet-600 px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🤖</span>
              <h3 className="font-semibold text-white">AI Report Analysis</h3>
              <span className="text-xs text-violet-200 ml-1">· {activeTab.replace("-", " ")}</span>
            </div>
            <button onClick={closeExplanation} className="text-violet-200 hover:text-white p-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="p-5 space-y-4">
            <div className="rounded-xl bg-zinc-900 border border-violet-100 p-4">
              <p className="text-xs font-semibold text-violet-500 uppercase tracking-wider mb-2">Summary</p>
              <p className="text-sm text-zinc-300 leading-relaxed">{explanation.summary}</p>
            </div>
            <div className="rounded-xl bg-zinc-900 border border-violet-100 p-4">
              <p className="text-xs font-semibold text-violet-500 uppercase tracking-wider mb-2">Key Insights</p>
              <ul className="space-y-2">
                {explanation.keyInsights.map((insight, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                    <span className="text-violet-500 mt-0.5 flex-shrink-0">→</span>
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl bg-zinc-900 border border-violet-100 p-4">
              <p className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-2">Suggested Actions</p>
              <ul className="space-y-2">
                {explanation.suggestedActions.map((action, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                    <span className="text-green-500 mt-0.5 flex-shrink-0">✓</span>
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg bg-amber-900/30 border border-amber-200 p-3 text-xs text-amber-700">
              ⚠️ AI-generated suggestions — review before use. Not a substitute for business judgment.
            </div>
          </div>
        </div>
      )}

      {explainError && (
        <div className="rounded-xl bg-red-900/30 border border-red-200 px-4 py-3 text-sm text-red-400">
          {explainError}
        </div>
      )}
    </div>
  );
}