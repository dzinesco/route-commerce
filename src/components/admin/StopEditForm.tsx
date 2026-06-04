"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateStop } from "@/actions/stops/update-stop";
import { AdminInput, AdminTextInput, AdminSelect, AdminButton, useToast } from "./design-system";

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
  /** Optional callback fired after a successful save. */
  onSaved?: () => void;
};

export default function StopEditForm({ stop, brands, onSaved }: StopEditFormProps) {
  const router = useRouter();
  const { success: showSuccess, error: showError } = useToast();
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

  // Validation errors
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function validateForm(): boolean {
    const errors: Record<string, string> = {};

    if (!city.trim()) {
      errors.city = "City is required";
    }
    if (!state.trim()) {
      errors.state = "State is required";
    }
    if (!date.trim()) {
      errors.date = "Date is required";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSave() {
    if (!validateForm()) {
      showError("Validation failed", "Please fix the errors below");
      return;
    }
    
    setSaving(true);
    setError(null);
    setSaved(false);

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
      showError("Failed to save", result.error ?? "Please try again");
      setError(result.error ?? "Failed to save");
      setSaving(false);
      return;
    }

    showSuccess("Stop updated", `${city}, ${state} has been saved`);
    setSaved(true);
    setSaving(false);
    onSaved?.();
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-600 flex items-start gap-3">
          <svg className="h-5 w-5 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1.5">
            City <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={city}
            onChange={(e) => {
              setCity(e.target.value);
              setFieldErrors((prev) => {
                const next = { ...prev };
                delete next.city;
                return next;
              });
            }}
            placeholder="City name"
            className={`w-full rounded-xl border px-3 py-2.5 text-sm text-[var(--admin-text-primary)] outline-none focus:ring-2 focus:ring-[var(--admin-accent)]/20 ${
              fieldErrors.city
                ? "border-red-400 bg-red-50"
                : "border-[var(--admin-border)] bg-white focus:border-[var(--admin-accent)]"
            }`}
          />
          {fieldErrors.city && <p className="mt-1 text-xs text-red-500">{fieldErrors.city}</p>}
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1.5">
            State <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={state}
            onChange={(e) => {
              setState(e.target.value);
              setFieldErrors((prev) => {
                const next = { ...prev };
                delete next.state;
                return next;
              });
            }}
            placeholder="State code"
            className={`w-full rounded-xl border px-3 py-2.5 text-sm text-[var(--admin-text-primary)] outline-none focus:ring-2 focus:ring-[var(--admin-accent)]/20 ${
              fieldErrors.state
                ? "border-red-400 bg-red-50"
                : "border-[var(--admin-border)] bg-white focus:border-[var(--admin-accent)]"
            }`}
          />
          {fieldErrors.state && <p className="mt-1 text-xs text-red-500">{fieldErrors.state}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1.5">
            Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setFieldErrors((prev) => {
                const next = { ...prev };
                delete next.date;
                return next;
              });
            }}
            className={`w-full rounded-xl border px-3 py-2.5 text-sm text-[var(--admin-text-primary)] outline-none focus:ring-2 focus:ring-[var(--admin-accent)]/20 ${
              fieldErrors.date
                ? "border-red-400 bg-red-50"
                : "border-[var(--admin-border)] bg-white focus:border-[var(--admin-accent)]"
            }`}
          />
          {fieldErrors.date && <p className="mt-1 text-xs text-red-500">{fieldErrors.date}</p>}
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1.5">Time</label>
          <input
            type="text"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            placeholder="e.g. 8:00 AM – 2:00 PM"
            className="w-full rounded-xl border border-[var(--admin-border)] bg-white px-3 py-2.5 text-sm text-[var(--admin-text-primary)] outline-none focus:border-[var(--admin-accent)] focus:ring-2 focus:ring-[var(--admin-accent)]/20"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-stone-700 mb-1.5">Location Name</label>
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Street address or intersection"
          className="w-full rounded-xl border border-[var(--admin-border)] bg-white px-3 py-2.5 text-sm text-[var(--admin-text-primary)] outline-none focus:border-[var(--admin-accent)] focus:ring-2 focus:ring-[var(--admin-accent)]/20"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1.5">Street Address</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="123 Main St"
            className="w-full rounded-xl border border-[var(--admin-border)] bg-white px-3 py-2.5 text-sm text-[var(--admin-text-primary)] outline-none focus:border-[var(--admin-accent)] focus:ring-2 focus:ring-[var(--admin-accent)]/20"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1.5">ZIP Code</label>
          <input
            type="text"
            value={zip}
            onChange={(e) => setZip(e.target.value)}
            placeholder="80102"
            maxLength={10}
            className="w-full rounded-xl border border-[var(--admin-border)] bg-white px-3 py-2.5 text-sm text-[var(--admin-text-primary)] outline-none focus:border-[var(--admin-accent)] focus:ring-2 focus:ring-[var(--admin-accent)]/20"
          />
        </div>
      </div>

      <AdminInput 
        label="Order Cutoff"
        helpText="Customers must order before this time to be included at this stop."
      >
        <input
          type="datetime-local"
          value={cutoff_time}
          onChange={(e) => setCutoff_time(e.target.value)}
          className="w-full rounded-xl border border-[var(--admin-border)] bg-white px-3 py-2.5 text-sm text-[var(--admin-text-primary)] outline-none focus:border-[var(--admin-accent)] focus:ring-2 focus:ring-[var(--admin-accent)]/20"
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
        <label className="mb-2 block text-sm font-medium text-stone-700">Status</label>
        <button
          type="button"
          onClick={() => setActive((v) => !v)}
          className={`w-full rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
            active
              ? "bg-green-100 text-green-700 border border-green-200"
              : "bg-stone-100 text-stone-500 border border-stone-200 hover:bg-stone-50"
          }`}
        >
          {active ? "✓ Active — visible on storefront" : "○ Inactive — hidden from storefront"}
        </button>
      </div>

      <AdminButton
        onClick={handleSave}
        disabled={saving}
        isLoading={saving}
        variant="primary"
        fullWidth
        size="lg"
      >
        {saving ? "Saving..." : "Save Changes"}
      </AdminButton>
    </div>
  );
}
