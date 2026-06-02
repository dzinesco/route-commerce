"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateWaterHeadgate, deleteWaterHeadgate } from "@/actions/water-log/admin";
import { AdminInput, AdminTextInput, AdminSelect } from "./design-system";
import { AdminButton } from "./design-system";

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
        <div className="rounded-lg bg-red-100 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <AdminInput label="Name" required>
            <AdminTextInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Headgate name"
            />
          </AdminInput>
        </div>
        <AdminInput label="Default Unit">
          <AdminSelect
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            options={UNIT_OPTIONS.map((u) => ({ value: u, label: u }))}
          />
        </AdminInput>
      </div>

      <AdminInput label="Status">
        <AdminSelect
          value={active ? "1" : "0"}
          onChange={(e) => setActive(e.target.value === "1")}
          options={[
            { value: "1", label: "Active" },
            { value: "0", label: "Inactive" },
          ]}
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
          Delete Headgate
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