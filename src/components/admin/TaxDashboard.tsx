"use client";

import { useState, useCallback } from "react";
import { formatDate } from "@/lib/date-utils";
import {
  exportTaxReport,
  exportTaxByState,
  type TaxOrderRow,
  type TaxByStateRow,
} from "@/lib/reports-export";
import {
  getTaxSummaryAction,
  getTaxableOrdersAction,
  type TaxSummaryData,
} from "@/actions/tax";
import { AdminButton, AdminFilterTabs } from "@/components/admin/design-system";

type DatePreset = "month" | "quarter" | "this_year" | "custom";

type DateRange = { start: string; end: string };

function buildRange(preset: DatePreset, customStart?: string, customEnd?: string): DateRange {
  const now = new Date();
  const toDateStr = (d: Date) => d.toISOString().slice(0, 10);
  const today = toDateStr(now);

  switch (preset) {
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

function quarterLabel(start: string, end: string): string {
  const s = new Date(start + "T00:00:00");
  const q = Math.floor(s.getMonth() / 3) + 1;
  return `Q${q} ${s.getFullYear()}`;
}

type TaxSummaryDataLocal = TaxSummaryData;

function SummaryCard({
  label,
  value,
  prefix,
  suffix,
  highlight,
}: {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-xl border px-4 py-4 ${highlight ? "border-amber-300 bg-amber-900/30" : "border-zinc-800 bg-zinc-900"}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${highlight ? "text-amber-700" : "text-zinc-100"}`}>
        {prefix ?? ""}{typeof value === "number" ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : value}{suffix ?? ""}
      </p>
    </div>
  );
}

function ExportBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <AdminButton
      onClick={onClick}
      variant="secondary"
      size="sm"
    >
      Export CSV
    </AdminButton>
  );
}

function ReportTable({ headers, rows, renderRow }: {
  headers: string[];
  rows: unknown[];
  renderRow: (row: unknown, i: number) => React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900">
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

const TABS = [
  { value: "summary", label: "Tax Summary" },
  { value: "orders", label: "Taxable Orders" },
];

export default function TaxDashboard({
  brands,
  initialBrandId,
  isPlatformAdmin,
}: {
  brands: { id: string; name: string }[];
  initialBrandId: string | null;
  isPlatformAdmin: boolean;
}) {
  const [preset, setPreset] = useState<DatePreset>("quarter");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [selectedBrandId, setSelectedBrandId] = useState<string>(initialBrandId ?? "");
  const [activeTab, setActiveTab] = useState("summary");
  const [summary, setSummary] = useState<TaxSummaryDataLocal | null>(null);
  const [orders, setOrders] = useState<TaxOrderRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const range: DateRange = buildRange(preset, customStart, customEnd);

  const fetchTaxSummary = useCallback(async () => {
    if (!selectedBrandId) return;
    setLoading(true);
    setError(null);

    try {
      const result = await getTaxSummaryAction({
        brandId: selectedBrandId,
        startDate: range.start,
        endDate: range.end,
      });
      if (!result.success) throw new Error(result.error);
      setSummary(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tax summary");
    } finally {
      setLoading(false);
    }
  }, [selectedBrandId, range]);

  const fetchTaxableOrders = useCallback(async () => {
    if (!selectedBrandId) return;
    setLoading(true);
    setError(null);

    try {
      const result = await getTaxableOrdersAction({
        brandId: selectedBrandId,
        startDate: range.start,
        endDate: range.end,
      });
      if (!result.success) throw new Error(result.error);
      setOrders(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, [selectedBrandId, range]);

  function handleFetch() {
    if (activeTab === "summary") fetchTaxSummary();
    else fetchTaxableOrders();
  }

  // Auto-fetch when tab/brand/range changes
  if (summary === null && activeTab === "summary" && selectedBrandId && !loading) {
    fetchTaxSummary();
  }
  if (orders.length === 0 && activeTab === "orders" && selectedBrandId && !loading) {
    fetchTaxableOrders();
  }

  function handleExportCSV() {
    if (activeTab === "summary" && summary) {
      const rows: TaxByStateRow[] = summary.tax_by_state.map((s) => ({
        state: s.state,
        total_tax: s.total_tax,
        gross_sales: s.gross_sales,
        order_count: s.order_count,
      }));
      const csv = exportTaxByState(rows);
      downloadCSV(csv, `tax-by-state-${range.start}.csv`);
    } else if (activeTab === "orders" && orders.length > 0) {
      const csv = exportTaxReport(orders);
      downloadCSV(csv, `taxable-orders-${range.start}.csv`);
    }
  }

  function downloadCSV(csv: string, filename: string) {
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  const effectiveRate = summary && summary.total_gross_sales > 0
    ? (summary.total_tax_collected / summary.total_gross_sales) * 100
    : 0;

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl bg-red-900/30 border border-red-200 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* ── Filters ── */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card-bg)] px-5 py-4">
        <div className="flex gap-1">
          {(["month", "quarter", "this_year", "custom"] as DatePreset[]).map((p) => (
            <AdminButton
              key={p}
              onClick={() => setPreset(p)}
              variant={preset === p ? "primary" : "secondary"}
              size="sm"
            >
              {p === "month" ? "This Month" : p === "quarter" ? "This Quarter" : p === "this_year" ? "This Year" : "Custom"}
            </AdminButton>
          ))}
        </div>

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

        {isPlatformAdmin && (
          <select
            value={selectedBrandId}
            onChange={(e) => {
              setSelectedBrandId(e.target.value);
              setSummary(null);
              setOrders([]);
            }}
            className="rounded-lg border border-zinc-600 px-3 py-1.5 text-xs"
          >
            <option value="">All Brands</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        )}

        <AdminButton
          onClick={handleFetch}
          disabled={loading || !selectedBrandId}
          variant="primary"
          size="sm"
          isLoading={loading}
        >
          Refresh
        </AdminButton>

        <span className="ml-auto text-xs text-zinc-500">
          {preset === "quarter" ? quarterLabel(range.start, range.end) :
           preset === "this_year" ? `${new Date().getFullYear()} YTD` :
           `${range.start} → ${range.end}`}
        </span>
      </div>

      {/* ── Tab bar ── */}
      <AdminFilterTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        tabs={TABS}
        size="md"
        showCounts={false}
      />

      {/* ── TAX SUMMARY TAB ── */}
      {activeTab === "summary" && (
        <div className="space-y-4">
          {summary && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <SummaryCard
                  label="Total Tax Collected"
                  value={summary.total_tax_collected}
                  prefix="$"
                  highlight
                />
                <SummaryCard
                  label="Total Gross Sales"
                  value={summary.total_gross_sales}
                  prefix="$"
                />
                <SummaryCard
                  label="Effective Tax Rate"
                  value={effectiveRate}
                  suffix="%"
                />
                <SummaryCard
                  label="Taxable Orders"
                  value={summary.order_count}
                />
              </div>

              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-zinc-300">Tax by State</h3>
                {summary.tax_by_state.length > 0 && (
                  <ExportBtn label="Export CSV" onClick={handleExportCSV} />
                )}
              </div>
              <ReportTable
                headers={["State", "Total Tax", "Gross Sales", "Orders", "Eff. Rate"]}
                rows={summary.tax_by_state}
                renderRow={(row) => {
                  const r = row as { state: string; total_tax: number; gross_sales: number; order_count: number };
                  const rate = r.gross_sales > 0 ? (r.total_tax / r.gross_sales) * 100 : 0;
                  return (
                    <tr key={r.state} className="border-t border-slate-100 hover:bg-zinc-800">
                      <td className="px-3 py-2 font-medium text-zinc-100">{r.state}</td>
                      <td className="px-3 py-2 text-right text-amber-700 font-medium">${r.total_tax.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right">${r.gross_sales.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right">{r.order_count}</td>
                      <td className="px-3 py-2 text-right text-zinc-500">{rate.toFixed(2)}%</td>
                    </tr>
                  );
                }}
              />
            </>
          )}

          {!summary && !loading && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-6 py-12 text-center text-slate-400">
              Click Refresh to load tax summary
            </div>
          )}
        </div>
      )}

      {/* ── TAXABLE ORDERS TAB ── */}
      {activeTab === "orders" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-300">Taxable Orders</h3>
            {orders.length > 0 && (
              <ExportBtn label="Export CSV" onClick={handleExportCSV} />
            )}
          </div>
          <ReportTable
            headers={["Order ID", "Date", "Customer", "City", "State", "Taxable Amt", "Tax", "Rate", "Location"]}
            rows={orders}
            renderRow={(row) => {
              const r = row as TaxOrderRow;
              return (
                <tr key={r.order_id} className="border-t border-slate-100 hover:bg-zinc-800">
                  <td className="px-3 py-2 font-mono text-xs text-zinc-400">{r.order_id.slice(0, 8)}</td>
                  <td className="px-3 py-2 text-zinc-400">{r.date}</td>
                  <td className="px-3 py-2 font-medium text-zinc-100">{r.customer_name}</td>
                  <td className="px-3 py-2 text-zinc-400">{r.city}</td>
                  <td className="px-3 py-2 text-zinc-400">{r.state}</td>
                  <td className="px-3 py-2 text-right">${Number(r.taxable_amount).toFixed(2)}</td>
                  <td className="px-3 py-2 text-right text-amber-700 font-medium">${Number(r.tax_amount).toFixed(2)}</td>
                  <td className="px-3 py-2 text-right text-zinc-500">{Number(r.tax_rate).toFixed(4)}</td>
                  <td className="px-3 py-2 text-zinc-500 text-xs">{r.tax_location}</td>
                </tr>
              );
            }}
          />
        </div>
      )}
    </div>
  );
}