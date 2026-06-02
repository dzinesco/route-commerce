"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createStop } from "@/actions/stops/create-stop";
import { AdminInput, AdminTextInput, AdminSelect } from "./design-system";

type Stop = {
  city: string;
  state: string;
  location: string;
  date: string;
  time: string;
  brand_id: string;
  active: boolean;
  address?: string | null;
  zip?: string | null;
  cutoff_time?: string | null;
};

type Props = {
  duplicateFrom?: Stop | null;
};

export default function NewStopForm({ duplicateFrom }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const defaultBrand = duplicateFrom?.brand_id ?? "64294306-5f42-463d-a5e8-2ad6c81a96de";

  // Form state
  const [city, setCity] = useState(duplicateFrom?.city ?? "");
  const [state, setState] = useState(duplicateFrom?.state ?? "");
  const [location, setLocation] = useState(duplicateFrom?.location ?? "");
  const [date, setDate] = useState(duplicateFrom?.date ?? "");
  const [time, setTime] = useState(duplicateFrom?.time ?? "");
  const [brandId, setBrandId] = useState(defaultBrand);
  const [active, setActive] = useState("true");
  const [address, setAddress] = useState(duplicateFrom?.address ?? "");
  const [zip, setZip] = useState(duplicateFrom?.zip ?? "");
  const [cutoffTime, setCutoffTime] = useState(duplicateFrom?.cutoff_time ?? "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await createStop(brandId, {
      city,
      state,
      location,
      date,
      time,
      active: active === "true",
      address: address || null,
      zip: zip || null,
      cutoff_time: cutoffTime || null,
    });

    if (!result.success) {
      setError(result.error ?? "Failed to create stop");
      setLoading(false);
      return;
    }

    if (result.id) {
      router.push(`/admin/stops/${result.id}`);
    } else {
      router.push("/admin/stops");
    }
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 max-w-xl space-y-6">
      {error && (
        <div className="rounded-xl bg-red-900/30 p-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <AdminInput label="City" required>
          <AdminTextInput
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="e.g. Denver"
          />
        </AdminInput>

        <AdminInput label="State" required>
          <AdminTextInput
            value={state}
            onChange={(e) => setState(e.target.value)}
            placeholder="e.g. CO"
          />
        </AdminInput>
      </div>

      <AdminInput label="Location Name" required>
        <AdminTextInput
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="e.g. Southwest Plaza Parking Lot"
        />
      </AdminInput>

      <div className="grid grid-cols-2 gap-4">
        <AdminInput label="Date" required>
          <AdminTextInput
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </AdminInput>

        <AdminInput label="Time" required>
          <AdminTextInput
            value={time}
            onChange={(e) => setTime(e.target.value)}
            placeholder="e.g. 8:00 AM – 2:00 PM"
          />
        </AdminInput>
      </div>

      <AdminInput label="Brand" required>
        <AdminSelect
          value={brandId}
          onChange={(e) => setBrandId(e.target.value)}
          options={[
            { value: "", label: "Select brand..." },
            { value: "64294306-5f42-463d-a5e8-2ad6c81a96de", label: "Tuxedo Corn" },
            { value: "b1cb7a96-d82b-40b1-80b1-d6dd26c56e28", label: "Indian River Direct" },
          ]}
        />
      </AdminInput>

      <AdminInput label="Active">
        <AdminSelect
          value={active}
          onChange={(e) => setActive(e.target.value)}
          options={[
            { value: "true", label: "Yes — show on storefront" },
            { value: "false", label: "No — hide from storefront" },
          ]}
        />
      </AdminInput>

      <div className="grid grid-cols-2 gap-4">
        <AdminInput label="Street Address">
          <AdminTextInput
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="123 Main St"
          />
        </AdminInput>

        <AdminInput label="ZIP Code">
          <AdminTextInput
            value={zip}
            onChange={(e) => setZip(e.target.value)}
            placeholder="80102"
          />
        </AdminInput>
      </div>

      <AdminInput label="Order Cutoff" helpText="Customers must order before this time to be included at this stop.">
        <AdminTextInput
          type="datetime-local"
          value={cutoffTime}
          onChange={(e) => setCutoffTime(e.target.value)}
        />
      </AdminInput>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-slate-900 px-6 py-3 font-medium text-white disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create Stop"}
        </button>

        <a
          href="/admin/stops"
          className="rounded-xl border border-zinc-600 px-6 py-3 font-medium text-zinc-300"
        >
          Cancel
        </a>
      </div>
    </form>
  );
}
