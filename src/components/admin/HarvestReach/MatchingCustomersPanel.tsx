"use client";

import { useState, useEffect, useRef } from "react";
import { type SegmentRuleV2, type PreviewResult } from "@/actions/harvest-reach/segments";

type Props = {
  brandId: string;
  rules: SegmentRuleV2;
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
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800">Matching Customers</h3>
        {preview && (
          <span className="inline-flex items-center rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-700">
            {total.toLocaleString()} total
          </span>
        )}
      </div>

      {rules.filters.length === 0 ? (
        <div className="flex-1 flex items-center justify-center py-12">
          <p className="text-sm text-slate-400 text-center">
            Add filters to see matching customers
          </p>
        </div>
      ) : loading ? (
        <div className="flex-1 flex items-center justify-center py-12">
          <div className="flex items-center gap-2.5 text-slate-400">
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-sm">Loading…</span>
          </div>
        </div>
      ) : (
        <>
          <input
            type="search"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="border border-zinc-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-slate-900"
          />

          {paged.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No customers match these filters.</p>
          ) : (
            <div className="flex-1 overflow-y-auto max-h-[460px] flex flex-col gap-1">
              {paged.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-zinc-800 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center text-xs font-medium text-stone-600 flex-shrink-0">
                    {c.name ? c.name.slice(0, 2).toUpperCase() : "??"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{c.name || "(no name)"}</p>
                    <p className="text-xs text-slate-400 truncate">{c.email}</p>
                  </div>
                  {c.tags.length > 0 && (
                    <div className="flex gap-1 flex-shrink-0">
                      {c.tags.slice(0, 2).map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center rounded-full bg-blue-900/30 text-blue-400 px-2 py-0.5 text-xs"
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
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <span className="text-xs text-slate-400">
                Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, searched.length)} of {searched.length}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-3 py-1 text-xs rounded-lg border border-zinc-800 text-zinc-400 hover:bg-zinc-800 disabled:opacity-40"
                >
                  Prev
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={(page + 1) * PAGE_SIZE >= searched.length}
                  className="px-3 py-1 text-xs rounded-lg border border-zinc-800 text-zinc-400 hover:bg-zinc-800 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}