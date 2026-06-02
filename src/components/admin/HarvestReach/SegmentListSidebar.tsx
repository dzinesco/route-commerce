"use client";

import { useState } from "react";
import type { Segment } from "@/actions/harvest-reach/segments";
import { AdminButton, AdminIconButton, AdminSearchInput } from "@/components/admin/design-system";

// Icon components
const Icons = {
  Plus: ({ className }: { className: string }) => (
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
        <AdminIconButton
          onClick={onNew}
          label="New segment"
          variant="primary"
          size="sm"
        >
          <Icons.Plus className="w-4 h-4" />
        </AdminIconButton>
      </div>

      <AdminSearchInput
        placeholder="Search segments…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

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
                  <AdminButton
                    variant="danger"
                    size="sm"
                    onClick={() => { onDelete(segment.id); setConfirmDelete(null); }}
                    fullWidth
                  >
                    Delete
                  </AdminButton>
                  <AdminButton
                    variant="secondary"
                    size="sm"
                    onClick={() => setConfirmDelete(null)}
                    fullWidth
                  >
                    Cancel
                  </AdminButton>
                </div>
              </div>
            ) : (
              <div
                onClick={() => onSelect(segment)}
                className={`px-3 py-2.5 rounded-xl cursor-pointer flex items-center justify-between gap-2 transition-all ${
                  activeSegmentId === segment.id
                    ? "bg-[var(--admin-accent-light)] border border-[var(--admin-accent)]"
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