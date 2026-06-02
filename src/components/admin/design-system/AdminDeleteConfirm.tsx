"use client";

import { useState } from "react";
import GlassModal from "@/components/admin/GlassModal";

type AdminDeleteConfirmProps = {
  title: string;
  itemName: string;
  description?: string;
  onConfirm: () => Promise<void> | void;
  onCancel?: () => void;
  deleteLabel?: string;
};

export default function AdminDeleteConfirm({
  title,
  itemName,
  description,
  onConfirm,
  onCancel,
  deleteLabel = "Delete",
}: AdminDeleteConfirmProps) {
  const [open, setOpen] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const handleConfirm = async () => {
    setDeleting(true);
    try {
      await onConfirm();
      setOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  const handleCancel = () => {
    setOpen(false);
    onCancel?.();
  };

  if (!open) return null;

  return (
    <GlassModal title={title} onClose={handleCancel}>
      <div className="space-y-4">
        <p className="text-sm text-[var(--admin-text-secondary)]">
          Are you sure you want to delete <span className="font-semibold text-[var(--admin-text-primary)]">&quot;{itemName}&quot;</span>?
        </p>
        {description && (
          <p className="text-xs text-[var(--admin-text-muted)]">{description}</p>
        )}
        <div className="flex justify-end gap-3 pt-4 border-t border-[var(--admin-border-light)]">
          <button
            onClick={handleCancel}
            className="rounded-xl border border-[var(--admin-border)] px-4 py-2 text-sm font-semibold text-[var(--admin-text-secondary)] hover:bg-[var(--admin-bg-subtle)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={deleting}
            className="rounded-xl bg-[var(--admin-danger)] px-4 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50 transition-colors"
          >
            {deleting ? "Deleting..." : deleteLabel}
          </button>
        </div>
      </div>
    </GlassModal>
  );
}

// Hook for managing delete confirmation state
export function useDeleteConfirm() {
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  
  const confirmDelete = (id: string, name: string) => setDeleteTarget({ id, name });
  const cancelDelete = () => setDeleteTarget(null);
  
  return { deleteTarget, confirmDelete, cancelDelete };
}