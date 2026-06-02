"use client";

import { useState, useEffect, useRef } from "react";
import { type SegmentRuleV2, type PreviewResult } from "@/actions/harvest-reach/segments";
import { AdminSearchInput, AdminButton } from "@/components/admin/design-system";

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
  userCircle: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
    </svg>
  ),
};

const DEBOUNCE_MS = 300;

export default function MatchingCustomersPanel({ brandId, rules, onCountChange }: Props) {
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [customerCount, setCustomerCount] = useState<number | undefined>(undefined);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (rules.filters.length === 0) {
      setPreview(null);
      setCustomerCount(undefined);
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
      const count = result?.count ?? 0;
      setCustomerCount(count);
      onCountChange?.(count);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timerRef.current);
  }, [brandId, rules, onCountChange]);

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
    <div className="rounded-2xl border border-[var(--admin-border)] bg-white overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[var(--admin-border)] bg-gradient-to-r from-[var(--admin-card)] to-[var(--admin-bg)]">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-400 to-violet-500 text-white shadow-lg shadow-violet-500/20">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-[var(--admin-text-primary)]">Matching Customers</h3>
            <p className="text-xs text-[var(--admin-text-muted)]">Preview your segment audience</p>
          </div>
          {preview && total > 0 && (
            <span className="inline-flex items-center rounded-full bg-gradient-to-br from-violet-100 to-violet-50 px-3 py-1 text-xs font-bold text-violet-700 border border-violet-200">
              {total.toLocaleString()} total
            </span>
          )}
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 p-5 flex flex-col">
        {rules.filters.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center py-12">
              {/* Decorative background */}
              <div className="relative mx-auto mb-5 w-16 h-16">
                <div className="absolute inset-0 bg-violet-100 rounded-2xl blur-xl opacity-50" />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-50 border-2 border-dashed border-violet-200">
                  <svg className="h-6 w-6 text-violet-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                </div>
              </div>
              <p className="text-sm text-[var(--admin-text-muted)]">
                Add filters to see matching customers
              </p>
            </div>
          </div>
        ) : loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex items-center gap-3 text-[var(--admin-text-muted)]">
              {Icons.spinner("h-5 w-5 animate-spin")}
              <span className="text-sm font-medium">Calculating matches…</span>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <AdminSearchInput
                placeholder="Search by name or email…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                onClear={() => setSearch("")}
              />
            </div>

            {paged.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mx-auto mb-3">
                    <svg className="h-6 w-6 text-stone-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                    </svg>
                  </div>
                  <p className="text-sm text-[var(--admin-text-muted)]">No customers match these filters.</p>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto flex flex-col gap-1.5 scrollbar-thin">
                {paged.map((c, idx) => (
                  <div
                    key={c.id}
                    className="group flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[var(--admin-card-hover)] transition-all duration-150 border border-transparent hover:border-[var(--admin-border)]"
                    style={{ animationDelay: `${idx * 20}ms` }}
                  >
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--admin-accent-light)] to-[var(--admin-accent)]/20 flex items-center justify-center text-xs font-bold text-[var(--admin-accent)] flex-shrink-0">
                      {c.name ? c.name.slice(0, 2).toUpperCase() : "??"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[var(--admin-text-primary)] truncate">{c.name || "(no name)"}</p>
                      <p className="text-xs text-[var(--admin-text-muted)] truncate">{c.email}</p>
                    </div>
                    {c.tags.length > 0 && (
                      <div className="flex gap-1 flex-shrink-0">
                        {c.tags.slice(0, 2).map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center rounded-full bg-gradient-to-r from-indigo-50 to-violet-50 text-indigo-700 px-2.5 py-0.5 text-xs font-medium border border-indigo-100"
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
              <div className="flex items-center justify-between pt-4 mt-4 border-t border-[var(--admin-border)]">
                <span className="text-xs text-[var(--admin-text-muted)]">
                  Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, searched.length)} of {searched.length}
                </span>
                <div className="flex gap-2">
                  <AdminButton
                    variant="secondary"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    icon={Icons.chevronLeft("h-4 w-4")}
                    iconPosition="left"
                  >
                    Prev
                  </AdminButton>
                  <AdminButton
                    variant="secondary"
                    size="sm"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={(page + 1) * PAGE_SIZE >= searched.length}
                    icon={Icons.chevronRight("h-4 w-4")}
                    iconPosition="right"
                  >
                    Next
                  </AdminButton>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

type Props = {
  brandId: string;
  rules: SegmentRuleV2;
  onCountChange?: (count: number) => void;
};