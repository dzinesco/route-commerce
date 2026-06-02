"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateWaterEntry, deleteWaterEntry } from "@/actions/water-log/admin";
import { AdminInput, AdminTextInput, AdminTextarea, AdminSelect, AdminButton } from "./design-system";

type WaterEntry = {
  id: string;
  headgate_id: string;
  user_id: string;
  headgate_name: string;
  user_name: string;
  measurement: number;
  unit: string;
  notes: string | null;
  submitted_via: string;
  logged_at: string;
  headgate_unit?: string;
};

const UNIT_OPTIONS = ["CFS", "GPM", "gal", "ac-in", "ac-ft"];

type Props = {
  entry: WaterEntry;
  brandId: string;
  backHref?: string;
};

export default function WaterLogEntryEditForm({ entry, backHref = "/admin/water-log" }: Props) {
  const router = useRouter();
  const [measurement, setMeasurement] = useState(entry.measurement);
  const [unit, setUnit] = useState(entry.unit);
  const [notes, setNotes] = useState(entry.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const result = await updateWaterEntry(entry.id, measurement, notes || null, unit);
    if (result.success) {
      router.push(backHref);
    } else {
      setError(result.error ?? "Failed to save");
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete this entry from ${entry.user_name} at ${entry.headgate_name}? This cannot be undone.`)) return;
    setDeleting(true);
    const result = await deleteWaterEntry(entry.id);
    if (result.success) {
      router.push(backHref);
    } else {
      setError(result.error ?? "Failed to delete");
      setDeleting(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-100 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--admin-text-muted)] mb-1">Headgate</label>
          <p className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-bg-subtle)] px-3 py-2 text-sm text-[var(--admin-text-secondary)]">{entry.headgate_name}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--admin-text-muted)] mb-1">User</label>
          <p className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-bg-subtle)] px-3 py-2 text-sm text-[var(--admin-text-secondary)]">{entry.user_name}</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <AdminInput label="Measurement" required>
          <AdminTextInput
            type="number"
            step="any"
            value={measurement}
            onChange={(e) => setMeasurement(parseFloat(e.target.value) || 0)}
          />
        </AdminInput>
        <AdminInput label="Unit">
          <AdminSelect
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            options={UNIT_OPTIONS.map((u) => ({ value: u, label: u }))}
          />
        </AdminInput>
        <div>
          <label className="block text-sm font-medium text-[var(--admin-text-muted)] mb-1">Submitted Via</label>
          <p className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-bg-subtle)] px-3 py-2 text-sm text-[var(--admin-text-secondary)]">{entry.submitted_via}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--admin-text-muted)] mb-1">Logged</label>
          <p className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-bg-subtle)] px-3 py-2 text-sm text-[var(--admin-text-secondary)]">
            {new Date(entry.logged_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
        </div>
      </div>

      <AdminInput label="Notes" className="col-span-2">
        <AdminTextarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Optional notes..."
        />
      </AdminInput>

      <div className="flex items-center justify-between pt-2">
        <AdminButton
          type="button"
          variant="danger"
          onClick={handleDelete}
          disabled={deleting}
          isLoading={deleting}
        >
          Delete Entry
        </AdminButton>
        <AdminButton
          type="submit"
          disabled={saving}
          isLoading={saving}
        >
          Save Changes
        </AdminButton>
      </div>
    </form>
  );
}