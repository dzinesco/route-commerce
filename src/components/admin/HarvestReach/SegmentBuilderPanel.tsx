"use client";

import { useState, useCallback } from "react";
import {
  type SegmentRuleV2,
  type SegmentFilter,
  type SegmentFilterType,
  type SegmentFilterParams,
} from "@/actions/harvest-reach/segments";
import { AdminButton } from "@/components/admin/design-system";

// Icon components
const Icons = {
  x: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18M6 6l12 12"/>
    </svg>
  ),
  plus: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  layers: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2"/>
      <polyline points="2 17 12 22 22 17"/>
      <polyline points="2 12 12 17 22 12"/>
    </svg>
  ),
  filter: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
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

const FILTER_TYPES: { value: SegmentFilterType; label: string; icon: string; color: string }[] = [
  { value: "all_customers", label: "All Customers", icon: "users", color: "bg-slate-500" },
  { value: "stop", label: "Past Stop", icon: "map-pin", color: "bg-amber-500" },
  { value: "upcoming_stop", label: "Upcoming Stop", icon: "calendar", color: "bg-emerald-500" },
  { value: "product", label: "Product Purchased", icon: "package", color: "bg-violet-500" },
  { value: "zip_code", label: "ZIP / City", icon: "map", color: "bg-cyan-500" },
  { value: "customer_history", label: "Order History", icon: "clock", color: "bg-rose-500" },
  { value: "tags", label: "Tags", icon: "tag", color: "bg-indigo-500" },
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
  const [hoveredFilter, setHoveredFilter] = useState<string | null>(null);

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
    <div className="rounded-2xl border border-[var(--admin-border)] bg-white overflow-hidden">
      {/* Card header with icon */}
      <div className="px-5 py-4 border-b border-[var(--admin-border)] bg-gradient-to-r from-[var(--admin-card)] to-[var(--admin-bg)]">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--admin-accent)] to-[var(--admin-accent-dark,var(--admin-accent))] text-white shadow-lg shadow-[var(--admin-accent)]/20">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--admin-text-primary)]">Filter Rules</h3>
            <p className="text-xs text-[var(--admin-text-muted)]">Define which customers match</p>
          </div>
        </div>
      </div>

      {/* Combinator toggle */}
      <div className="px-5 py-3 border-b border-[var(--admin-border)] bg-stone-50/50">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-[var(--admin-text-muted)] uppercase tracking-wide">Match</span>
          <div className="flex rounded-xl border border-[var(--admin-border)] bg-white p-0.5 shadow-sm">
            {(["AND", "OR"] as const).map((c) => (
              <button
                key={c}
                onClick={() => setCombinator(c)}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 ${
                  rules.combinator === c
                    ? "bg-gradient-to-br from-[var(--admin-accent)] to-[var(--admin-accent-dark,var(--admin-accent))] text-white shadow-md"
                    : "text-[var(--admin-text-muted)] hover:bg-stone-100"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <span className="text-xs font-medium text-[var(--admin-text-muted)] uppercase tracking-wide">of the following</span>
        </div>
      </div>

      {/* Filter blocks */}
      <div className="p-5 space-y-4">
        {rules.filters.length === 0 && (
          <div className="py-12 text-center">
            <div className="relative mx-auto mb-4 w-16 h-16">
              <div className="absolute inset-0 bg-stone-100 rounded-2xl blur-xl" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-stone-100 border-2 border-dashed border-stone-300">
                <svg className="h-6 w-6 text-stone-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
                </svg>
              </div>
            </div>
            <p className="text-sm text-[var(--admin-text-muted)]">
              No filters yet. Add a filter below to start building your segment.
            </p>
          </div>
        )}
        {rules.filters.map((filter, index) => (
          <FilterBlock
            key={`${filter.type}-${index}`}
            brandId={brandId}
            filter={filter}
            onChange={(updates) => updateFilter(index, updates)}
            onRemove={() => removeFilter(index)}
          />
        ))}
      </div>

      {/* Add filter chips */}
      <div className="px-5 pb-5">
        <div className="text-xs font-semibold text-[var(--admin-text-muted)] uppercase tracking-wide mb-3">Add Filter</div>
        <div className="flex flex-wrap gap-2">
          {FILTER_TYPES.map((ft) => (
            <button
              key={ft.value}
              onClick={() => addFilter(ft.value)}
              onMouseEnter={() => setHoveredFilter(ft.value)}
              onMouseLeave={() => setHoveredFilter(null)}
              className={`group flex items-center gap-2 px-3.5 py-2 rounded-xl border text-sm font-medium transition-all duration-200 ${
                hoveredFilter === ft.value
                  ? "border-[var(--admin-accent)] bg-[var(--admin-accent-light)] text-[var(--admin-accent)]"
                  : "border-[var(--admin-border)] bg-white text-[var(--admin-text-secondary)] hover:border-stone-300 hover:bg-stone-50"
              }`}
            >
              <span className={`flex h-5 w-5 items-center justify-center rounded-md text-white ${ft.color}`}>
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
              </span>
              {ft.label}
            </button>
          ))}
        </div>
      </div>

      {/* Save button */}
      <div className="px-5 py-4 border-t border-[var(--admin-border)] bg-gradient-to-r from-[var(--admin-bg)] to-[var(--admin-card)]">
        <AdminButton
          onClick={onSave}
          disabled={rules.filters.length === 0}
          fullWidth
          icon={
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
              <polyline points="17 21 17 13 7 13 7 21"/>
              <polyline points="7 3 7 8 15 8"/>
            </svg>
          }
        >
          {hasActiveSegment ? "Update Segment" : "Save Segment"}
        </AdminButton>
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

  const filterConfig = FILTER_TYPES.find(f => f.value === filter.type);
  const filterColor = filterConfig?.color ?? "bg-stone-500";

  return (
    <div className="rounded-xl border border-[var(--admin-border)] bg-gradient-to-br from-[var(--admin-card)] to-[var(--admin-bg)] p-4 flex flex-col gap-4 transition-all duration-200 hover:shadow-md">
      {/* Filter header with type selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={`flex h-8 w-8 items-center justify-center rounded-lg text-white ${filterColor}`}>
            {filter.type === "all_customers" && (
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            )}
            {filter.type === "stop" && (
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
              </svg>
            )}
            {filter.type === "upcoming_stop" && (
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            )}
            {filter.type === "product" && (
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16.5 9.4 7.55 4.24"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.29 7 12 12 20.71 7"/><line x1="12" y1="22" x2="12" y2="12"/>
              </svg>
            )}
            {filter.type === "zip_code" && (
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
              </svg>
            )}
            {filter.type === "customer_history" && (
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
            )}
            {filter.type === "tags" && (
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>
              </svg>
            )}
          </span>
          <select
            value={filter.type}
            onChange={(e) =>
              onChange({ type: e.target.value as SegmentFilterType, params: emptyFilter(e.target.value as SegmentFilterType).params })
            }
            className="text-sm font-semibold border border-[var(--admin-border)] rounded-lg px-3 py-1.5 bg-white text-[var(--admin-text-primary)] outline-none focus:ring-2 focus:ring-[var(--admin-accent)] focus:border-[var(--admin-accent)] cursor-pointer"
          >
            {FILTER_TYPES.map((ft) => (
              <option key={ft.value} value={ft.value}>{ft.label}</option>
            ))}
          </select>
        </div>
        <button
          onClick={onRemove}
          className="p-2 rounded-lg hover:bg-red-50 text-[var(--admin-text-muted)] hover:text-red-500 transition-colors"
          aria-label="Remove filter"
        >
          {Icons.x("w-4 h-4")}
        </button>
      </div>

      <div className="flex flex-col gap-3 pl-11">
        {/* Stop / Upcoming Stop */}
        {(filter.type === "stop" || filter.type === "upcoming_stop") && (
          <>
            <select
              value={filter.params.stop_id ?? ""}
              onChange={(e) => onChange({ params: { ...filter.params, stop_id: e.target.value } })}
              onMouseEnter={() => loadStops(filter.type === "stop")}
              className="border border-[var(--admin-border)] rounded-lg px-3 py-2.5 text-sm bg-white w-full outline-none focus:ring-2 focus:ring-[var(--admin-accent)] focus:border-[var(--admin-accent)]"
            >
              <option value="">Select {filter.type === "stop" ? "past" : "upcoming"} stop…</option>
              {stops.map((s) => (
                <option key={s.id} value={s.id}>{s.city} — {s.date}</option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[var(--admin-text-muted)] mb-1 block">From</label>
                <input
                  type="date"
                  value={filter.params.date_from ?? ""}
                  onChange={(e) => onChange({ params: { ...filter.params, date_from: e.target.value } })}
                  className="border border-[var(--admin-border)] rounded-lg px-3 py-2.5 text-sm bg-white w-full outline-none focus:ring-2 focus:ring-[var(--admin-accent)] focus:border-[var(--admin-accent)]"
                />
              </div>
              <div>
                <label className="text-xs text-[var(--admin-text-muted)] mb-1 block">To</label>
                <input
                  type="date"
                  value={filter.params.date_to ?? ""}
                  onChange={(e) => onChange({ params: { ...filter.params, date_to: e.target.value } })}
                  className="border border-[var(--admin-border)] rounded-lg px-3 py-2.5 text-sm bg-white w-full outline-none focus:ring-2 focus:ring-[var(--admin-accent)] focus:border-[var(--admin-accent)]"
                />
              </div>
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
              className="border border-[var(--admin-border)] rounded-lg px-3 py-2.5 text-sm bg-white w-full outline-none focus:ring-2 focus:ring-[var(--admin-accent)] focus:border-[var(--admin-accent)]"
            >
              <option value="">Select a product…</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <div className="flex items-center gap-2">
              <label className="text-xs text-[var(--admin-text-muted)] whitespace-nowrap">In the last</label>
              <input
                type="number"
                min={1}
                max={365}
                value={filter.params.days_back ?? 90}
                onChange={(e) => onChange({ params: { ...filter.params, days_back: parseInt(e.target.value) } })}
                className="border border-[var(--admin-border)] rounded-lg px-3 py-2 text-sm w-20 bg-white outline-none focus:ring-2 focus:ring-[var(--admin-accent)] focus:border-[var(--admin-accent)]"
              />
              <span className="text-xs text-[var(--admin-text-muted)] whitespace-nowrap">days</span>
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
              className="border border-[var(--admin-border)] rounded-lg px-3 py-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-[var(--admin-accent)] focus:border-[var(--admin-accent)]"
            />
            <input
              type="text"
              placeholder="City (optional)"
              value={filter.params.city ?? ""}
              onChange={(e) => onChange({ params: { ...filter.params, city: e.target.value } })}
              className="border border-[var(--admin-border)] rounded-lg px-3 py-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-[var(--admin-accent)] focus:border-[var(--admin-accent)]"
            />
          </>
        )}

        {/* Customer History */}
        {filter.type === "customer_history" && (
          <div className="flex flex-col gap-3">
            <select
              value={filter.params.order_history ?? "all"}
              onChange={(e) =>
                onChange({ params: { ...filter.params, order_history: e.target.value as "all" | "first_order" | "repeat" } })
              }
              className="border border-[var(--admin-border)] rounded-lg px-3 py-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-[var(--admin-accent)] focus:border-[var(--admin-accent)]"
            >
              {ORDER_HISTORY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <div className="flex items-center gap-2">
              <label className="text-xs text-[var(--admin-text-muted)] whitespace-nowrap">In the last</label>
              <input
                type="number"
                min={1}
                max={365}
                value={filter.params.days_back ?? 90}
                onChange={(e) => onChange({ params: { ...filter.params, days_back: parseInt(e.target.value) } })}
                className="border border-[var(--admin-border)] rounded-lg px-3 py-2 text-sm w-20 bg-white outline-none focus:ring-2 focus:ring-[var(--admin-accent)] focus:border-[var(--admin-accent)]"
              />
              <span className="text-xs text-[var(--admin-text-muted)] whitespace-nowrap">days</span>
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
            className="border border-[var(--admin-border)] rounded-lg px-3 py-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-[var(--admin-accent)] focus:border-[var(--admin-accent)]"
          />
        )}

        {/* All customers */}
        {filter.type === "all_customers" && (
          <p className="text-xs text-[var(--admin-text-muted)] bg-stone-50 rounded-lg px-3 py-2">Matches all customers in your brand.</p>
        )}
      </div>
    </div>
  );
}