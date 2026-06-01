"use client";

import { useState, useCallback } from "react";
import {
  type SegmentRuleV2,
  type SegmentFilter,
  type SegmentFilterType,
  type SegmentFilterParams,
} from "@/actions/harvest-reach/segments";

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
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5 flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800">Filter Rules</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">Match</span>
          <div className="flex rounded-lg border border-zinc-800 bg-slate-50 p-0.5">
            {(["AND", "OR"] as const).map((c) => (
              <button
                key={c}
                onClick={() => setCombinator(c)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  rules.combinator === c
                    ? "bg-stone-900 text-white"
                    : "text-zinc-400 hover:bg-zinc-900"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <span className="text-xs text-zinc-500">of the following</span>
        </div>
      </div>

      {/* Filter blocks */}
      <div className="flex flex-col gap-3">
        {rules.filters.length === 0 && (
          <div className="py-8 text-center">
            <p className="text-sm text-slate-400">
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
            className="px-3 py-1.5 text-xs font-medium rounded-full border border-zinc-600 text-zinc-400 hover:bg-zinc-800 hover:border-slate-400 transition-colors"
          >
            + {ft.label}
          </button>
        ))}
      </div>

      {/* Save button */}
      <div className="pt-1 border-t border-slate-100">
        <button
          onClick={onSave}
          disabled={rules.filters.length === 0}
          className="w-full py-2.5 rounded-lg bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
    <div className="rounded-xl border border-zinc-800 p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <select
          value={filter.type}
          onChange={(e) =>
            onChange({ type: e.target.value as SegmentFilterType, params: emptyFilter(e.target.value as SegmentFilterType).params })
          }
          className="text-sm font-medium border border-zinc-800 rounded-lg px-2.5 py-1.5 bg-zinc-900 outline-none focus:border-slate-900"
        >
          {FILTER_TYPES.map((ft) => (
            <option key={ft.value} value={ft.value}>{ft.label}</option>
          ))}
        </select>
        <button
          onClick={onRemove}
          className="text-slate-400 hover:text-red-500 transition-colors"
          aria-label="Remove filter"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
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
              className="border border-zinc-800 rounded-lg px-3 py-2 text-sm bg-zinc-900 w-full outline-none focus:border-slate-900"
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
                className="border border-zinc-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-slate-900"
              />
              <input
                type="date"
                value={filter.params.date_to ?? ""}
                onChange={(e) => onChange({ params: { ...filter.params, date_to: e.target.value } })}
                className="border border-zinc-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-slate-900"
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
              className="border border-zinc-800 rounded-lg px-3 py-2 text-sm bg-zinc-900 w-full outline-none focus:border-slate-900"
            >
              <option value="">Select a product…</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <div className="flex items-center gap-2">
              <label className="text-xs text-zinc-500">In the last</label>
              <input
                type="number"
                min={1}
                max={365}
                value={filter.params.days_back ?? 90}
                onChange={(e) => onChange({ params: { ...filter.params, days_back: parseInt(e.target.value) } })}
                className="border border-zinc-800 rounded-lg px-2.5 py-1.5 text-sm w-20 outline-none focus:border-slate-900"
              />
              <span className="text-xs text-zinc-500">days</span>
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
              className="border border-zinc-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-slate-900"
            />
            <input
              type="text"
              placeholder="City (optional)"
              value={filter.params.city ?? ""}
              onChange={(e) => onChange({ params: { ...filter.params, city: e.target.value } })}
              className="border border-zinc-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-slate-900"
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
              className="border border-zinc-800 rounded-lg px-3 py-2 text-sm bg-zinc-900 outline-none focus:border-slate-900"
            >
              {ORDER_HISTORY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <div className="flex items-center gap-2">
              <label className="text-xs text-zinc-500">In the last</label>
              <input
                type="number"
                min={1}
                max={365}
                value={filter.params.days_back ?? 90}
                onChange={(e) => onChange({ params: { ...filter.params, days_back: parseInt(e.target.value) } })}
                className="border border-zinc-800 rounded-lg px-2.5 py-1.5 text-sm w-20 outline-none focus:border-slate-900"
              />
              <span className="text-xs text-zinc-500">days</span>
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
            className="border border-zinc-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-slate-900"
          />
        )}

        {/* All customers */}
        {filter.type === "all_customers" && (
          <p className="text-xs text-slate-400">Matches all customers in your brand.</p>
        )}
      </div>
    </div>
  );
}