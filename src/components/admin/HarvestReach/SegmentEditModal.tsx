"use client";

import { useState } from "react";

type Props = {
  initialName?: string;
  initialDescription?: string;
  onSave: (name: string, description: string) => Promise<void>;
  onClose: () => void;
};

export default function SegmentEditModal({ initialName = "", initialDescription = "", onSave, onClose }: Props) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    await onSave(name.trim(), description.trim());
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 w-full max-w-md p-6 flex flex-col gap-4 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-zinc-100">
            {initialName ? "Update Segment" : "Save Segment"}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-zinc-400 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Segment Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              placeholder="e.g. Fort Pierce Regulars"
              className="w-full border border-zinc-600 rounded-lg px-3 py-2 text-sm"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Description <span className="text-slate-400 font-normal">(optional)</span></label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Customers who pick up at the Fort Pierce stop regularly"
              rows={3}
              className="w-full border border-zinc-600 rounded-lg px-3 py-2 text-sm resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-zinc-600 text-sm font-medium text-zinc-400 hover:bg-zinc-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || saving}
            className="flex-1 py-2.5 rounded-lg bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving…" : "Save Segment"}
          </button>
        </div>
      </div>
    </div>
  );
}