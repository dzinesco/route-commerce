"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateStop } from "@/actions/stops/update-stop";

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
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-300">City</label>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full rounded-xl border border-zinc-600 bg-zinc-900 px-4 py-3 text-base outline-none focus:border-slate-900"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-300">State</label>
          <input
            type="text"
            value={state}
            onChange={(e) => setState(e.target.value)}
            className="w-full rounded-xl border border-zinc-600 bg-zinc-900 px-4 py-3 text-base outline-none focus:border-slate-900"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-300">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-xl border border-zinc-600 bg-zinc-900 px-4 py-3 text-base outline-none focus:border-slate-900"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-300">Time</label>
          <input
            type="text"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            placeholder="e.g. 8:00 AM – 2:00 PM"
            className="w-full rounded-xl border border-zinc-600 bg-zinc-900 px-4 py-3 text-base outline-none focus:border-slate-900"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-300">Location</label>
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Street address or intersection"
          className="w-full rounded-xl border border-zinc-600 bg-zinc-900 px-4 py-3 text-base outline-none focus:border-slate-900"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-300">Street Address</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="123 Main St"
            className="w-full rounded-xl border border-zinc-600 bg-zinc-900 px-4 py-3 text-base outline-none focus:border-slate-900"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-300">ZIP Code</label>
          <input
            type="text"
            value={zip}
            onChange={(e) => setZip(e.target.value)}
            placeholder="80102"
            maxLength={10}
            className="w-full rounded-xl border border-zinc-600 bg-zinc-900 px-4 py-3 text-base outline-none focus:border-slate-900"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-300">Order Cutoff</label>
        <input
          type="datetime-local"
          value={cutoff_time}
          onChange={(e) => setCutoff_time(e.target.value)}
          className="w-full rounded-xl border border-zinc-600 bg-zinc-900 px-4 py-3 text-base outline-none focus:border-slate-900"
        />
        <p className="mt-1 text-xs text-slate-400">
          Customers must order before this time to be included at this stop.
        </p>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-zinc-300">Brand</label>
        <select
          value={brand_id}
          onChange={(e) => setBrand_id(e.target.value)}
          className="w-full rounded-xl border border-zinc-600 bg-zinc-900 px-4 py-3 text-base outline-none focus:border-slate-900"
        >
          {brands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

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
