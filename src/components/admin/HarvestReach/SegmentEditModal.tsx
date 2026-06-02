"use client";

import { useState } from "react";
import { AdminButton } from "@/components/admin/design-system";

// Icon components
const Icons = {
  x: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18M6 6l12 12"/>
    </svg>
  ),
  layers: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2"/>
      <polyline points="2 17 12 22 22 17"/>
      <polyline points="2 12 12 17 22 12"/>
    </svg>
  ),
};

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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl border border-[var(--admin-border)]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--admin-border)]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--admin-accent)]">
              {Icons.layers("h-5 w-5 text-white")}
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--admin-text-primary)]">
                {initialName ? "Update Segment" : "Save Segment"}
              </h2>
              <p className="text-xs text-[var(--admin-text-muted)]">
                {initialName ? "Update segment details" : "Create a new audience segment"}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-lg hover:bg-[var(--admin-card-hover)] text-[var(--admin-text-muted)] hover:text-[var(--admin-text-primary)] transition-colors"
          >
            {Icons.x("h-5 w-5")}
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--admin-text-primary)] mb-1.5">Segment Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              placeholder="e.g. Fort Pierce Regulars"
              className="w-full border border-[var(--admin-border)] rounded-lg px-3 py-2.5 text-sm bg-white text-[var(--admin-text-primary)] focus:ring-2 focus:ring-[var(--admin-accent)] focus:border-[var(--admin-accent)] outline-none"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--admin-text-primary)] mb-1.5">
              Description <span className="text-[var(--admin-text-muted)] font-normal">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Customers who pick up at the Fort Pierce stop regularly"
              rows={3}
              className="w-full border border-[var(--admin-border)] rounded-lg px-3 py-2.5 text-sm bg-white text-[var(--admin-text-primary)] resize-none focus:ring-2 focus:ring-[var(--admin-accent)] focus:border-[var(--admin-accent)] outline-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-[var(--admin-border)]">
          <AdminButton
            variant="secondary"
            onClick={onClose}
            fullWidth
          >
            Cancel
          </AdminButton>
          <AdminButton
            onClick={handleSave}
            disabled={!name.trim() || saving}
            isLoading={saving}
            fullWidth
          >
            {saving ? "Saving…" : "Save Segment"}
          </AdminButton>
        </div>
      </div>
    </div>
  );
}