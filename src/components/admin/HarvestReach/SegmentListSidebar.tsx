"use client";

import { useState } from "react";
import type { Segment } from "@/actions/harvest-reach/segments";

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
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800">Saved Segments</h3>
        <button
          onClick={onNew}
          className="w-7 h-7 rounded-lg bg-stone-900 text-white flex items-center justify-center text-base leading-none hover:bg-stone-800 transition-colors"
          aria-label="New segment"
        >
          +
        </button>
      </div>

      <input
        type="search"
        placeholder="Search segments…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="border border-zinc-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-slate-900"
      />

      <div className="flex flex-col gap-1.5">
        {filtered.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-4">
            {search ? "No segments match." : "No saved segments yet."}
          </p>
        )}
        {filtered.map((segment) => (
          <div key={segment.id} className="group relative">
            {confirmDelete === segment.id ? (
              <div className="rounded-xl border border-red-200 bg-red-900/30 p-3 flex flex-col gap-2">
                <p className="text-xs text-red-400 font-medium">Delete &ldquo;{segment.name}&rdquo;?</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => { onDelete(segment.id); setConfirmDelete(null); }}
                    className="flex-1 py-1.5 text-xs rounded-lg bg-red-600 text-white hover:bg-red-700 font-medium"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setConfirmDelete(null)}
                    className="flex-1 py-1.5 text-xs rounded-lg border border-zinc-600 bg-zinc-900 hover:bg-zinc-800 font-medium"
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
                    ? "bg-stone-100 border border-stone-300"
                    : "hover:bg-zinc-800 border border-transparent"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{segment.name}</p>
                  {segment.description && (
                    <p className="text-xs text-slate-400 truncate mt-0.5">{segment.description}</p>
                  )}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setConfirmDelete(segment.id); }}
                  className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all p-1"
                  aria-label="Delete segment"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}