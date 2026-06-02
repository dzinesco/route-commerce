"use client";

import { useState, useCallback } from "react";
import {
  type SegmentRuleV2,
  type SegmentFilter,
  type SegmentFilterType,
  type SegmentFilterParams,
} from "@/actions/harvest-reach/segments";

// Icon components
const Icons = {
  x: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18M6 6l12 12"/>
    </svg>
  ),
};

type Props = {
  brandId: string;
  rules: SegmentRuleV2;
  onChange: (rules: SegmentRuleV2) => void;
  onSave: () => void;
  hasActiveSegment: boolean;
};

const FILTER_TYPES: { value: SegmentFilterType; label: string }[] = [
  { value: "all_customers", label: "All Customers" },
  { value: "stop", label: "Past Stop" },
  { value: "upcoming_stop", label: "Upcoming Stop" },
  { value: "product", label: "Product Purchased" },
  { value: "zip_code", label: "ZIP / City" },
  { value: "customer_history", label: "Order History" },
  { value: "tags", label: "Tags" },
];

const ORDER_HISTORY_OPTIONS = [
  { value: "all", label: "All customers" },
  { value: "first_order", label: "First-time buyers" },
  { value: "repeat", label: "Repeat buyers" },
];

function emptyFilter(type: SegmentFilterType): SegmentFilter {
  const params: SegmentFilterParams = {};
  if (type === "product") params.days_back = 90;
  if (type === "customer_history") { params.order_history = "all"; params.days_back = 90; }
  if (type === "stop" || type === "upcoming_stop") { params.date_from = ""; params.date_to = ""; }
  if (type === "zip_code") { params.zip_codes = []; params.city = ""; }
  if (type === "tags") params.tags = [];
  return { type, params };
}

export default function SegmentBuilderPanel({ brandId, rules, onChange, onSave, hasActiveSegment }: Props) {
  const setCombinator = useCallback((combinator: "AND" | "OR") => {
    onChange({ ...rules, combinator });
  }, [rules, onChange]);

  function updateFilter(index: number, updates: Partial<SegmentFilter>) {
    const newFilters = rules.filters.map((f, i) =>
      i === index ? { ...f, ...updates, params: { ...f.params, ...(updates.params ?? {}) } } : f
    );
    onChange({ ...rules, filters: newFilters });
  }

  function removeFilter(index: number) {
    onChange({ ...rules, filters: rules.filters.filter((_, i) => i !== index) });
  }

  function addFilter(type: SegmentFilterType) {
    onChange({ ...rules, filters: [...rules.filters, emptyFilter(type)] });
  }

  return (
    <div className="rounded-xl border border-[var(--admin-border)] bg-white p-4 sm:p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--admin-text-primary)]">Filter Rules</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--admin-text-muted)]">Match</span>
          <div className="flex rounded-lg border border-[var(--admin-border)] bg-[var(--admin-card)] p-0.5">
            {(["AND", "OR"] as const).map((c) => (
              <button
                key={c}
                onClick={() => setCombinator(c)}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                  rules.combinator === c
                    ? "bg-emerald-600 text-white"
                    : "text-[var(--admin-text-muted)] hover:bg-[var(--admin-card-hover)]"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <span className="text-xs text-[var(--admin-text-muted)]">of the following</span>
        </div>
      </div>

      {/* Filter blocks */}
      <div className="flex flex-col gap-3">
        {rules.filters.length === 0 && (
          <div className="py-8 text-center">
            <p className="text-sm text-[var(--admin-text-muted)]">
              No filters yet. Add a filter below to start building your segment.
            </p>
          </div>
        )}
        {rules.filters.map((filter, index) => (
          <FilterBlock
            key={index}
            brandId={brandId}
            filter={filter}
            onChange={(updates) => updateFilter(index, updates)}
            onRemove={() => removeFilter(index)}
          />
        ))}
      </div>

      {/* Add filter chips */}
      <div className="flex gap-2 flex-wrap">
        {FILTER_TYPES.map((ft) => (
          <button
            key={ft.value}
            onClick={() => addFilter(ft.value)}
            className="px-3 py-1.5 text-xs font-medium rounded-full border border-[var(--admin-border)] text-[var(--admin-text-muted)] hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition-colors"
          >
            + {ft.label}
          </button>
        ))}
      </div>

      {/* Save button */}
      <div className="pt-1 border-t border-[var(--admin-border)]">
        <button
          onClick={onSave}
          disabled={rules.filters.length === 0}
          className="w-full py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {hasActiveSegment ? "Update Segment" : "Save Segment"}
        </button>
      </div>
    </div>
  );
}

// ─── Filter Block ─────────────────────────────────────────────

type FilterBlockProps = {
  brandId: string;
  filter: SegmentFilter;
  onChange: (updates: Partial<SegmentFilter>) => void;
  onRemove: () => void;
};

function FilterBlock({ brandId, filter, onChange, onRemove }: FilterBlockProps) {
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
  const [stops, setStops] = useState<{ id: string; city: string; date: string }[]>([]);
  const [productsLoaded, setProductsLoaded] = useState(false);
  const [stopsLoaded, setStopsLoaded] = useState(false);

  function loadProducts() {
    if (productsLoaded) return;
    import("@/actions/harvest-reach/products").then((m) => {
      m.getProductsForSegmentPicker(brandId).then((data) => {
        setProducts(data);
        setProductsLoaded(true);
      });
    });
  }

  function loadStops(past: boolean) {
    if (stopsLoaded) return;
    import("@/actions/harvest-reach/stops").then((m) => {
      m.getStopsForSegmentPicker(brandId).then((data) => {
        setStops(data.filter((s) => past ? s.is_past : s.is_upcoming));
        setStopsLoaded(true);
      });
    });
  }

  return (
    <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <select
          value={filter.type}
          onChange={(e) =>
            onChange({ type: e.target.value as SegmentFilterType, params: emptyFilter(e.target.value as SegmentFilterType).params })
          }
          className="text-sm font-medium border border-[var(--admin-border)] rounded-lg px-2.5 py-1.5 bg-white text-[var(--admin-text-primary)] outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        >
          {FILTER_TYPES.map((ft) => (
            <option key={ft.value} value={ft.value}>{ft.label}</option>
          ))}
        </select>
        <button
          onClick={onRemove}
          className="p-1.5 rounded-lg hover:bg-red-50 text-[var(--admin-text-muted)] hover:text-red-500 transition-colors"
          aria-label="Remove filter"
        >
          {Icons.x("w-4 h-4")}
        </button>
      </div>

      <div className="flex flex-col gap-2.5">
        {/* Stop / Upcoming Stop */}
        {(filter.type === "stop" || filter.type === "upcoming_stop") && (
          <>
            <select
              value={filter.params.stop_id ?? ""}
              onChange={(e) => onChange({ params: { ...filter.params, stop_id: e.target.value } })}
              onMouseEnter={() => loadStops(filter.type === "stop")}
              className="border border-[var(--admin-border)] rounded-lg px-3 py-2 text-sm bg-white w-full outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="">Select {filter.type === "stop" ? "past" : "upcoming"} stop…</option>
              {stops.map((s) => (
                <option key={s.id} value={s.id}>{s.city} — {s.date}</option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={filter.params.date_from ?? ""}
                onChange={(e) => onChange({ params: { ...filter.params, date_from: e.target.value } })}
                className="border border-[var(--admin-border)] rounded-lg px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              <input
                type="date"
                value={filter.params.date_to ?? ""}
                onChange={(e) => onChange({ params: { ...filter.params, date_to: e.target.value } })}
                className="border border-[var(--admin-border)] rounded-lg px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </>
        )}

        {/* Product */}
        {filter.type === "product" && (
          <>
            <select
              value={filter.params.product_id ?? ""}
              onChange={(e) => {
                onChange({ params: { ...filter.params, product_id: e.target.value } });
                if (e.target.value) loadProducts();
              }}
              onMouseEnter={loadProducts}
              className="border border-[var(--admin-border)] rounded-lg px-3 py-2 text-sm bg-white w-full outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="">Select a product…</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <div className="flex items-center gap-2">
              <label className="text-xs text-[var(--admin-text-muted)]">In the last</label>
              <input
                type="number"
                min={1}
                max={365}
                value={filter.params.days_back ?? 90}
                onChange={(e) => onChange({ params: { ...filter.params, days_back: parseInt(e.target.value) } })}
                className="border border-[var(--admin-border)] rounded-lg px-2.5 py-1.5 text-sm w-20 bg-white outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              <span className="text-xs text-[var(--admin-text-muted)]">days</span>
            </div>
          </>
        )}

        {/* ZIP / City */}
        {filter.type === "zip_code" && (
          <>
            <input
              type="text"
              placeholder="ZIP codes (comma-separated)"
              value={(filter.params.zip_codes ?? []).join(", ")}
              onChange={(e) =>
                onChange({
                  params: {
                    ...filter.params,
                    zip_codes: e.target.value.split(",").map((z) => z.trim()).filter(Boolean),
                  },
                })
              }
              className="border border-[var(--admin-border)] rounded-lg px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
            <input
              type="text"
              placeholder="City (optional)"
              value={filter.params.city ?? ""}
              onChange={(e) => onChange({ params: { ...filter.params, city: e.target.value } })}
              className="border border-[var(--admin-border)] rounded-lg px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </>
        )}

        {/* Customer History */}
        {filter.type === "customer_history" && (
          <div className="flex flex-col gap-2">
            <select
              value={filter.params.order_history ?? "all"}
              onChange={(e) =>
                onChange({ params: { ...filter.params, order_history: e.target.value as "all" | "first_order" | "repeat" } })
              }
              className="border border-[var(--admin-border)] rounded-lg px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              {ORDER_HISTORY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <div className="flex items-center gap-2">
              <label className="text-xs text-[var(--admin-text-muted)]">In the last</label>
              <input
                type="number"
                min={1}
                max={365}
                value={filter.params.days_back ?? 90}
                onChange={(e) => onChange({ params: { ...filter.params, days_back: parseInt(e.target.value) } })}
                className="border border-[var(--admin-border)] rounded-lg px-2.5 py-1.5 text-sm w-20 bg-white outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              <span className="text-xs text-[var(--admin-text-muted)]">days</span>
            </div>
          </div>
        )}

        {/* Tags */}
        {filter.type === "tags" && (
          <input
            type="text"
            placeholder="Tags (comma-separated)"
            value={(filter.params.tags ?? []).join(", ")}
            onChange={(e) =>
              onChange({
                params: {
                  ...filter.params,
                  tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean),
                },
              })
            }
            className="border border-[var(--admin-border)] rounded-lg px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        )}

        {/* All customers */}
        {filter.type === "all_customers" && (
          <p className="text-xs text-[var(--admin-text-muted)]">Matches all customers in your brand.</p>
        )}
      </div>
    </div>
  );
}