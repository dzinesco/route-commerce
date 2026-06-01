"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createStop } from "@/actions/stops/create-stop";

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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const city = formData.get("city") as string;
    const state = formData.get("state") as string;
    const location = formData.get("location") as string;
    const date = formData.get("date") as string;
    const time = formData.get("time") as string;
    const brandId = formData.get("brand_id") as string;
    const active = formData.get("active") === "true";

    const result = await createStop(brandId, {
      city,
      state,
      location,
      date,
      time,
      active,
      address: (formData.get("address") as string) || null,
      zip: (formData.get("zip") as string) || null,
      cutoff_time: (formData.get("cutoff_time") as string) || null,
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
        <div>
          <label className="block text-sm font-medium text-zinc-300">City</label>
          <input
            name="city"
            required
            defaultValue={duplicateFrom?.city}
            className="mt-1 w-full rounded-xl border border-zinc-600 bg-zinc-800 px-4 py-3 text-zinc-100 outline-none focus:border-slate-900"
            placeholder="e.g. Denver"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300">State</label>
          <input
            name="state"
            required
            maxLength={2}
            defaultValue={duplicateFrom?.state}
            className="mt-1 w-full rounded-xl border border-zinc-600 bg-zinc-800 px-4 py-3 text-zinc-100 outline-none focus:border-slate-900"
            placeholder="e.g. CO"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-300">Location Name</label>
        <input
          name="location"
          required
          defaultValue={duplicateFrom?.location}
          className="mt-1 w-full rounded-xl border border-zinc-600 bg-zinc-800 px-4 py-3 text-zinc-100 outline-none focus:border-slate-900"
          placeholder="e.g. Southwest Plaza Parking Lot"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-zinc-300">Date</label>
          <input
            name="date"
            required
            type="date"
            defaultValue={duplicateFrom?.date}
            className="mt-1 w-full rounded-xl border border-zinc-600 bg-zinc-800 px-4 py-3 text-zinc-100 outline-none focus:border-slate-900"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300">Time</label>
          <input
            name="time"
            required
            type="text"
            defaultValue={duplicateFrom?.time}
            className="mt-1 w-full rounded-xl border border-zinc-600 bg-zinc-800 px-4 py-3 text-zinc-100 outline-none focus:border-slate-900"
            placeholder="e.g. 8:00 AM – 2:00 PM"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-300">Brand</label>
        <select
          name="brand_id"
          required
          defaultValue={defaultBrand}
          className="mt-1 w-full rounded-xl border border-zinc-600 bg-zinc-800 px-4 py-3 text-zinc-100 outline-none focus:border-slate-900"
        >
          <option value="">Select brand...</option>
          <option value="64294306-5f42-463d-a5e8-2ad6c81a96de">Tuxedo Corn</option>
          <option value="b1cb7a96-d82b-40b1-80b1-d6dd26c56e28">Indian River Direct</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-300">Active</label>
        <select
          name="active"
          defaultValue="true"
          className="mt-1 w-full rounded-xl border border-zinc-600 bg-zinc-800 px-4 py-3 text-zinc-100 outline-none focus:border-slate-900"
        >
          <option value="true">Yes — show on storefront</option>
          <option value="false">No — hide from storefront</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-zinc-300">Street Address</label>
          <input
            name="address"
            defaultValue={duplicateFrom?.address ?? ""}
            className="mt-1 w-full rounded-xl border border-zinc-600 bg-zinc-800 px-4 py-3 text-zinc-100 outline-none focus:border-slate-900"
            placeholder="123 Main St"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300">ZIP Code</label>
          <input
            name="zip"
            maxLength={10}
            defaultValue={duplicateFrom?.zip ?? ""}
            className="mt-1 w-full rounded-xl border border-zinc-600 bg-zinc-800 px-4 py-3 text-zinc-100 outline-none focus:border-slate-900"
            placeholder="80102"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-300">Order Cutoff</label>
        <input
          name="cutoff_time"
          type="datetime-local"
          defaultValue={duplicateFrom?.cutoff_time ?? ""}
          className="mt-1 w-full rounded-xl border border-zinc-600 bg-zinc-800 px-4 py-3 text-zinc-100 outline-none focus:border-slate-900"
        />
        <p className="mt-1 text-xs text-slate-400">
          Customers must order before this time to be included at this stop.
        </p>
      </div>

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
