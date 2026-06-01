"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateWaterHeadgate, deleteWaterHeadgate } from "@/actions/water-log/admin";

type Headgate = {
  id: string;
  name: string;
  active: boolean;
  unit: string;
  created_at: string;
};

const UNIT_OPTIONS = ["CFS", "GPM", "gal", "ac-in", "ac-ft"];

type Props = {
  headgate: Headgate;
  backHref?: string;
};

export default function HeadgateEditForm({ headgate, backHref = "/admin/water-log" }: Props) {
  const router = useRouter();
  const [name, setName] = useState(headgate.name);
  const [active, setActive] = useState(headgate.active);
  const [unit, setUnit] = useState(headgate.unit);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const result = await updateWaterHeadgate(headgate.id, name.trim(), active, unit);
    if (result.success) {
      router.push(backHref);
    } else {
      setError(result.error ?? "Failed to save");
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete headgate "${headgate.name}"? Existing log entries will be preserved.`)) return;
    setDeleting(true);
    const result = await deleteWaterHeadgate(headgate.id);
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

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-zinc-400 mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-zinc-600 px-3 py-2 text-sm outline-none focus:border-slate-900"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Default Unit</label>
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
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-400 mb-1">Status</label>
        <select
          value={active ? "1" : "0"}
          onChange={(e) => setActive(e.target.value === "1")}
          className="rounded-lg border border-zinc-600 px-3 py-2 text-sm"
        >
          <option value="1">Active</option>
          <option value="0">Inactive</option>
        </select>
      </div>

      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="rounded-lg border border-red-200 bg-zinc-900 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-900/30 disabled:opacity-50"
        >
          {deleting ? "..." : "Delete Headgate"}
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