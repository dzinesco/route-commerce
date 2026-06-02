"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateStop } from "@/actions/stops/update-stop";
import { AdminInput, AdminTextInput, AdminSelect } from "./design-system";

type Brand = {
  id: string;
  name: string;
  slug: string;
};

type StopEditFormProps = {
  stop: {
    id: string;
    city: string;
    state: string;
    date: string;
    time: string;
    location: string;
    slug: string;
    active: boolean;
    brand_id: string;
    address?: string | null;
    zip?: string | null;
    cutoff_time?: string | null;
  };
  brands: Brand[];
};

export default function StopEditForm({ stop, brands }: StopEditFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [city, setCity] = useState(stop.city);
  const [state, setState] = useState(stop.state);
  const [date, setDate] = useState(stop.date);
  const [time, setTime] = useState(stop.time);
  const [location, setLocation] = useState(stop.location);
  const [active, setActive] = useState(stop.active);
  const [brand_id, setBrand_id] = useState(stop.brand_id);
  const [address, setAddress] = useState(stop.address ?? "");
  const [zip, setZip] = useState(stop.zip ?? "");
  const [cutoff_time, setCutoff_time] = useState(stop.cutoff_time ?? "");

  async function handleSave() {
    if (!city.trim() || !state.trim() || !date.trim()) {
      setError("City, state, and date are required.");
      return;
    }
    setSaving(true);
    setError(null);
    setSaved(false);

    const slug = city.toLowerCase().replace(/\s+/g, "-") + "-" + date;

    const result = await updateStop(stop.id, brand_id, {
      city,
      state,
      location,
      date,
      time,
      active,
      address: address || null,
      zip: zip || null,
      cutoff_time: cutoff_time || null,
    });

    if (!result.success) {
      setError(result.error ?? "Failed to save");
      setSaving(false);
      return;
    }

    setSaved(true);
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl bg-red-900/30 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {saved && (
        <div className="rounded-xl bg-green-900/30 p-4 text-sm text-green-400">
          Stop updated successfully.
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <AdminInput label="City">
            <AdminTextInput
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="City name"
            />
          </AdminInput>

          <AdminInput label="State">
            <AdminTextInput
              value={state}
              onChange={(e) => setState(e.target.value)}
              placeholder="State code"
            />
          </AdminInput>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <AdminInput label="Date">
            <AdminTextInput
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </AdminInput>

          <AdminInput label="Time">
            <AdminTextInput
              value={time}
              onChange={(e) => setTime(e.target.value)}
              placeholder="e.g. 8:00 AM – 2:00 PM"
            />
          </AdminInput>
      </div>

      <AdminInput label="Location">
        <AdminTextInput
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Street address or intersection"
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
              maxLength={10}
            />
          </AdminInput>
      </div>

      <AdminInput 
          label="Order Cutoff"
          helpText="Customers must order before this time to be included at this stop."
        >
          <AdminTextInput
            type="datetime-local"
            value={cutoff_time}
            onChange={(e) => setCutoff_time(e.target.value)}
          />
        </AdminInput>

      <AdminInput label="Brand">
        <AdminSelect
          value={brand_id}
          onChange={(e) => setBrand_id(e.target.value)}
          options={brands.map((b) => ({ value: b.id, label: b.name }))}
        />
      </AdminInput>

      <div>
        <label className="mb-2 block text-sm font-medium text-zinc-300">Status</label>
        <button
          onClick={() => setActive((v) => !v)}
          className={`w-full rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
            active
              ? "bg-green-900/40 text-green-400"
              : "bg-zinc-950 text-zinc-400 hover:bg-slate-200"
          }`}
        >
          {active ? "Active" : "Inactive"}
        </button>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full rounded-xl bg-slate-900 px-6 py-4 text-lg font-bold text-white disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save Changes"}
      </button>
    </div>
  );
}
