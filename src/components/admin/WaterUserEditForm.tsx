"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateWaterIrrigator, resetWaterIrrigatorPin, deleteWaterUser } from "@/actions/water-log/admin";
import { AdminButton } from "./design-system";

type WaterUser = {
  id: string;
  name: string;
  role: "irrigator" | "water_admin";
  active: boolean;
  language_preference: string;
  last_used_at: string | null;
  created_at: string;
};

type Props = {
  waterUser: WaterUser;
  backHref?: string;
};

export default function WaterUserEditForm({ waterUser, backHref = "/admin/water-log" }: Props) {
  const router = useRouter();
  const [name, setName] = useState(waterUser.name);
  const [role, setRole] = useState<"irrigator" | "water_admin">(waterUser.role);
  const [active, setActive] = useState(waterUser.active);
  const [lang, setLang] = useState(waterUser.language_preference);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [newPin, setNewPin] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const result = await updateWaterIrrigator(waterUser.id, name.trim(), active, lang, role);
    if (result.success) {
      router.push(backHref);
    } else {
      setError(result.error ?? "Failed to save");
      setSaving(false);
    }
  }

  async function handleResetPin() {
    setResetting(true);
    const result = await resetWaterIrrigatorPin(waterUser.id);
    if (result.success && result.pin) {
      setNewPin(result.pin);
    } else {
      setError(result.error ?? "Failed to reset PIN");
    }
    setResetting(false);
  }

  async function handleDelete() {
    if (!window.confirm(`Delete user "${waterUser.name}"? Their log entries will be preserved.`)) return;
    setDeleting(true);
    const result = await deleteWaterUser(waterUser.id);
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

      {newPin && (
        <div className="rounded-xl bg-amber-100 border border-amber-200 p-4">
          <p className="font-semibold text-amber-800">New PIN for {name}:</p>
          <p className="mt-1 text-2xl font-bold tracking-widest text-amber-900">{newPin}</p>
          <p className="mt-1 text-xs text-amber-600">Write this down — it will not be shown again.</p>
          <button onClick={() => setNewPin(null)} className="mt-2 text-xs text-amber-700 underline">Dismiss</button>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--admin-text-muted)] mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-[var(--admin-border)] px-3 py-2 text-sm outline-none focus:border-[var(--admin-accent)]"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--admin-text-muted)] mb-1">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as "irrigator" | "water_admin")}
            className="w-full rounded-lg border border-[var(--admin-border)] px-3 py-2 text-sm"
          >
            <option value="irrigator">Irrigator</option>
            <option value="water_admin">Admin</option>
          </select>
          <p className="text-xs text-[var(--admin-text-muted)] mt-0.5">
            {role === "water_admin"
              ? "Can manage headgates, users, and entries"
              : "Can only submit water log entries"}
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--admin-text-muted)] mb-1">Language</label>
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            className="w-full rounded-lg border border-[var(--admin-border)] px-3 py-2 text-sm"
          >
            <option value="en">English</option>
            <option value="es">Español</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--admin-text-muted)] mb-1">Status</label>
          <select
            value={active ? "1" : "0"}
            onChange={(e) => setActive(e.target.value === "1")}
            className="rounded-lg border border-[var(--admin-border)] px-3 py-2 text-sm"
          >
            <option value="1">Active</option>
            <option value="0">Inactive</option>
          </select>
        </div>
        <div className="pt-4">
          <AdminButton
            type="button"
            variant="secondary"
            onClick={handleResetPin}
            disabled={resetting}
            isLoading={resetting}
          >
            Reset PIN
          </AdminButton>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <AdminButton
          type="button"
          variant="danger"
          onClick={handleDelete}
          disabled={deleting}
          isLoading={deleting}
        >
          Delete User
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