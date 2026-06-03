"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createStop } from "@/actions/stops/create-stop";
import { AdminInput, AdminTextInput, AdminSelect, AdminButton, useToast } from "./design-system";

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
  const { success: showSuccess, error: showError } = useToast();
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
    if (!location.trim()) {
      errors.location = "Location is required";
    }
    if (!date.trim()) {
      errors.date = "Date is required";
    }
    if (!time.trim()) {
      errors.time = "Time is required";
    }
    if (!brandId) {
      errors.brandId = "Brand is required";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!validateForm()) {
      showError("Validation failed", "Please fix the errors below");
      return;
    }

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
      showError("Failed to create stop", result.error ?? "Please try again");
      setError(result.error ?? "Failed to create stop");
      setLoading(false);
      return;
    }

    showSuccess("Stop created", `${city}, ${state} has been added`);
    
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
            placeholder="e.g. Denver"
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
            placeholder="e.g. CO"
            className={`w-full rounded-xl border px-3 py-2.5 text-sm text-[var(--admin-text-primary)] outline-none focus:ring-2 focus:ring-[var(--admin-accent)]/20 ${
              fieldErrors.state
                ? "border-red-400 bg-red-50"
                : "border-[var(--admin-border)] bg-white focus:border-[var(--admin-accent)]"
            }`}
          />
          {fieldErrors.state && <p className="mt-1 text-xs text-red-500">{fieldErrors.state}</p>}
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-stone-700 mb-1.5">
          Location Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={location}
          onChange={(e) => {
            setLocation(e.target.value);
            setFieldErrors((prev) => {
              const next = { ...prev };
              delete next.location;
              return next;
            });
          }}
          placeholder="e.g. Southwest Plaza Parking Lot"
          className={`w-full rounded-xl border px-3 py-2.5 text-sm text-[var(--admin-text-primary)] outline-none focus:ring-2 focus:ring-[var(--admin-accent)]/20 ${
            fieldErrors.location
              ? "border-red-400 bg-red-50"
              : "border-[var(--admin-border)] bg-white focus:border-[var(--admin-accent)]"
          }`}
        />
        {fieldErrors.location && <p className="mt-1 text-xs text-red-500">{fieldErrors.location}</p>}
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
          <label className="block text-xs font-semibold text-stone-700 mb-1.5">
            Time <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={time}
            onChange={(e) => {
              setTime(e.target.value);
              setFieldErrors((prev) => {
                const next = { ...prev };
                delete next.time;
                return next;
              });
            }}
            placeholder="e.g. 8:00 AM – 2:00 PM"
            className={`w-full rounded-xl border px-3 py-2.5 text-sm text-[var(--admin-text-primary)] outline-none focus:ring-2 focus:ring-[var(--admin-accent)]/20 ${
              fieldErrors.time
                ? "border-red-400 bg-red-50"
                : "border-[var(--admin-border)] bg-white focus:border-[var(--admin-accent)]"
            }`}
          />
          {fieldErrors.time && <p className="mt-1 text-xs text-red-500">{fieldErrors.time}</p>}
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-stone-700 mb-1.5">
          Brand <span className="text-red-500">*</span>
        </label>
        <select
          value={brandId}
          onChange={(e) => {
            setBrandId(e.target.value);
            setFieldErrors((prev) => {
              const next = { ...prev };
              delete next.brandId;
              return next;
            });
          }}
          className={`w-full rounded-xl border px-3 py-2.5 text-sm text-[var(--admin-text-primary)] outline-none focus:ring-2 focus:ring-[var(--admin-accent)]/20 ${
            fieldErrors.brandId
              ? "border-red-400 bg-red-50"
              : "border-[var(--admin-border)] bg-white focus:border-[var(--admin-accent)]"
          }`}
        >
          <option value="">Select brand...</option>
          <option value="64294306-5f42-463d-a5e8-2ad6c81a96de">Tuxedo Corn</option>
          <option value="b1cb7a96-d82b-40b1-80b1-d6dd26c56e28">Indian River Direct</option>
        </select>
        {fieldErrors.brandId && <p className="mt-1 text-xs text-red-500">{fieldErrors.brandId}</p>}
      </div>

      <div>
        <label className="block text-xs font-semibold text-stone-700 mb-1.5">Active</label>
        <select
          value={active}
          onChange={(e) => setActive(e.target.value)}
          className="w-full rounded-xl border border-[var(--admin-border)] bg-white px-3 py-2.5 text-sm text-[var(--admin-text-primary)] outline-none focus:border-[var(--admin-accent)] focus:ring-2 focus:ring-[var(--admin-accent)]/20"
        >
          <option value="true">Yes — show on storefront</option>
          <option value="false">No — hide from storefront</option>
        </select>
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

      <div>
        <label className="block text-xs font-semibold text-stone-700 mb-1.5">Order Cutoff</label>
        <p className="text-[10px] text-stone-500 mb-2">Customers must order before this time to be included at this stop.</p>
        <input
          type="datetime-local"
          value={cutoffTime}
          onChange={(e) => setCutoffTime(e.target.value)}
          className="w-full rounded-xl border border-[var(--admin-border)] bg-white px-3 py-2.5 text-sm text-[var(--admin-text-primary)] outline-none focus:border-[var(--admin-accent)] focus:ring-2 focus:ring-[var(--admin-accent)]/20"
        />
      </div>

      <div className="flex gap-3">
        <AdminButton
          type="submit"
          disabled={loading}
          isLoading={loading}
          variant="primary"
          size="lg"
        >
          {loading ? "Creating..." : "Create Stop"}
        </AdminButton>

        <Link
          href="/admin/stops"
          className="rounded-xl border border-[var(--admin-border)] px-6 py-3 font-medium text-stone-600 hover:bg-stone-50 transition-colors"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
