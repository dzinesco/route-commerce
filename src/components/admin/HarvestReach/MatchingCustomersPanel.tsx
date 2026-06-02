"use client";

import { useState, useEffect, useRef } from "react";
import { type SegmentRuleV2, type PreviewResult } from "@/actions/harvest-reach/segments";

// Icon components
const Icons = {
  users: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  search: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/>
      <path d="m21 21-4.3-4.3"/>
    </svg>
  ),
  spinner: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/>
      <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round">
        <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/>
      </path>
    </svg>
  ),
  chevronLeft: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 18-6-6 6-6"/>
    </svg>
  ),
  chevronRight: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6"/>
    </svg>
  ),
};

const DEBOUNCE_MS = 300;

export default function MatchingCustomersPanel({ brandId, rules }: Props) {
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (rules.filters.length === 0) {
      setPreview(null);
      return;
    }
    setLoading(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      const { previewSegmentWithCustomers } = await import("@/actions/harvest-reach/segments");
      const result = await previewSegmentWithCustomers(brandId, rules);
      setPreview(result);
      setLoading(false);
      setPage(0);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timerRef.current);
  }, [brandId, rules]);

  const PAGE_SIZE = 50;
  const filtered = preview?.sample_customers ?? [];
  const searched = search
    ? filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.email.toLowerCase().includes(search.toLowerCase())
      )
    : filtered;
  const total = preview?.count ?? 0;
  const paged = searched.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="rounded-xl border border-[var(--admin-border)] bg-white p-4 sm:p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--admin-text-primary)]">Matching Customers</h3>
        {preview && (
          <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
            {total.toLocaleString()} total
          </span>
        )}
      </div>

      {rules.filters.length === 0 ? (
        <div className="flex-1 flex items-center justify-center py-12">
          <div className="text-center">
            {Icons.users("w-10 h-10 text-[var(--admin-text-muted)] mx-auto mb-3")}
            <p className="text-sm text-[var(--admin-text-muted)]">
              Add filters to see matching customers
            </p>
          </div>
        </div>
      ) : loading ? (
        <div className="flex-1 flex items-center justify-center py-12">
          <div className="flex items-center gap-2.5 text-[var(--admin-text-muted)]">
            {Icons.spinner("h-5 w-5 animate-spin")}
            <span className="text-sm">Loading…</span>
          </div>
        </div>
      ) : (
        <>
          <div className="relative">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              {Icons.search("h-4 w-4 text-[var(--admin-text-muted)]")}
            </div>
            <input
              type="search"
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="w-full pl-10 pr-3 py-2 text-sm border border-[var(--admin-border)] rounded-lg bg-white text-[var(--admin-text-primary)] focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />
          </div>

          {paged.length === 0 ? (
            <p className="text-sm text-[var(--admin-text-muted)] text-center py-6">No customers match these filters.</p>
          ) : (
            <div className="flex-1 overflow-y-auto max-h-[460px] flex flex-col gap-1">
              {paged.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[var(--admin-card-hover)] transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-semibold text-emerald-700 flex-shrink-0">
                    {c.name ? c.name.slice(0, 2).toUpperCase() : "??"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--admin-text-primary)] truncate">{c.name || "(no name)"}</p>
                    <p className="text-xs text-[var(--admin-text-muted)] truncate">{c.email}</p>
                  </div>
                  {c.tags.length > 0 && (
                    <div className="flex gap-1 flex-shrink-0">
                      {c.tags.slice(0, 2).map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center rounded-full bg-blue-100 text-blue-700 px-2 py-0.5 text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {searched.length > PAGE_SIZE && (
            <div className="flex items-center justify-between pt-3 border-t border-[var(--admin-border)]">
              <span className="text-xs text-[var(--admin-text-muted)]">
                Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, searched.length)} of {searched.length}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="inline-flex items-center gap-1 px-3 py-1 text-xs rounded-lg border border-[var(--admin-border)] text-[var(--admin-text-muted)] hover:bg-[var(--admin-card-hover)] disabled:opacity-50 transition-colors"
                >
                  {Icons.chevronLeft("h-4 w-4")}
                  <span>Prev</span>
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={(page + 1) * PAGE_SIZE >= searched.length}
                  className="inline-flex items-center gap-1 px-3 py-1 text-xs rounded-lg border border-[var(--admin-border)] text-[var(--admin-text-muted)] hover:bg-[var(--admin-card-hover)] disabled:opacity-50 transition-colors"
                >
                  <span>Next</span>
                  {Icons.chevronRight("h-4 w-4")}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

type Props = {
  brandId: string;
  rules: SegmentRuleV2;
};