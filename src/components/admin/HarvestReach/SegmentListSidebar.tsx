"use client";

import { useState } from "react";
import type { Segment } from "@/actions/harvest-reach/segments";

// Icon components
const Icons = {
  plus: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  trash: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
      <line x1="10" y1="11" x2="10" y2="17"/>
      <line x1="14" y1="11" x2="14" y2="17"/>
    </svg>
  ),
  search: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/>
      <path d="m21 21-4.3-4.3"/>
    </svg>
  ),
};

type Props = {
  segments: Segment[];
  activeSegmentId?: string;
  onSelect: (segment: Segment) => void;
  onNew: () => void;
  onDelete: (segmentId: string) => void;
};

export default function SegmentListSidebar({ segments, activeSegmentId, onSelect, onNew, onDelete }: Props) {
  const [search, setSearch] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const filtered = segments.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="rounded-xl border border-[var(--admin-border)] bg-white p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--admin-text-primary)]">Saved Segments</h3>
        <button
          onClick={onNew}
          className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700 transition-colors"
          aria-label="New segment"
        >
          {Icons.plus("w-4 h-4")}
        </button>
      </div>

      <div className="relative">
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
          {Icons.search("h-4 w-4 text-[var(--admin-text-muted)]")}
        </div>
        <input
          type="search"
          placeholder="Search segments…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-3 py-2 text-sm border border-[var(--admin-border)] rounded-lg bg-white text-[var(--admin-text-primary)] focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        {filtered.length === 0 && (
          <p className="text-xs text-[var(--admin-text-muted)] text-center py-4">
            {search ? "No segments match." : "No saved segments yet."}
          </p>
        )}
        {filtered.map((segment) => (
          <div key={segment.id} className="group relative">
            {confirmDelete === segment.id ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 flex flex-col gap-2">
                <p className="text-xs text-red-600 font-medium">Delete "{segment.name}"?</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => { onDelete(segment.id); setConfirmDelete(null); }}
                    className="flex-1 py-1.5 text-xs rounded-lg bg-red-600 text-white hover:bg-red-700 font-semibold transition-colors"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setConfirmDelete(null)}
                    className="flex-1 py-1.5 text-xs rounded-lg border border-[var(--admin-border)] bg-white text-[var(--admin-text-muted)] hover:bg-[var(--admin-card-hover)] font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => onSelect(segment)}
                className={`px-3 py-2.5 rounded-xl cursor-pointer flex items-center justify-between gap-2 transition-all ${
                  activeSegmentId === segment.id
                    ? "bg-emerald-50 border border-emerald-200"
                    : "hover:bg-[var(--admin-card-hover)] border border-transparent"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--admin-text-primary)] truncate">{segment.name}</p>
                  {segment.description && (
                    <p className="text-xs text-[var(--admin-text-muted)] truncate mt-0.5">{segment.description}</p>
                  )}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setConfirmDelete(segment.id); }}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 text-red-500 hover:text-red-600 transition-all"
                  aria-label="Delete segment"
                >
                  {Icons.trash("w-4 h-4")}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}