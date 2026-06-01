"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateWaterEntry, deleteWaterEntry } from "@/actions/water-log/admin";

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
        <div className="rounded-lg bg-red-900/30 border border-red-200 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Headgate</label>
          <p className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-300">{entry.headgate_name}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">User</label>
          <p className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-300">{entry.user_name}</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Measurement</label>
          <input
            type="number"
            step="any"
            value={measurement}
            onChange={(e) => setMeasurement(parseFloat(e.target.value) || 0)}
            className="w-full rounded-lg border border-zinc-600 px-3 py-2 text-sm outline-none focus:border-slate-900"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Unit</label>
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="w-full rounded-lg border border-zinc-600 px-3 py-2 text-sm"
          >
            {UNIT_OPTIONS.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Submitted Via</label>
          <p className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-300">{entry.submitted_via}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Logged</label>
          <p className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-300">
            {new Date(entry.logged_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-400 mb-1">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-zinc-600 px-3 py-2 text-sm outline-none focus:border-slate-900 resize-none"
          placeholder="Optional notes..."
        />
      </div>

      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="rounded-lg border border-red-200 bg-zinc-900 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-900/30 disabled:opacity-50"
        >
          {deleting ? "..." : "Delete Entry"}
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-green-600 px-6 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          {saving ? "..." : "Save Changes"}
        </button>
      </div>
    </form>
  );
}