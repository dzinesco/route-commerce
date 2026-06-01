"use client";

import { useState, useCallback, useEffect } from "react";
import { createStop } from "@/actions/stops/create-stop";
import { formatDate } from "@/lib/format-date";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  brandId: string;
  duplicateFrom?: {
    city: string;
    state: string;
    location: string;
    date: string;
    time: string;
    address?: string | null;
    zip?: string | null;
    cutoff_time?: string | null;
  } | null;
  onSuccess?: (stopId: string) => void;
};

export default function AddStopModal({ isOpen, onClose, brandId, duplicateFrom, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [city, setCity] = useState(duplicateFrom?.city ?? "");
  const [state, setState] = useState(duplicateFrom?.state ?? "");
  const [location, setLocation] = useState(duplicateFrom?.location ?? "");
  const [date, setDate] = useState(duplicateFrom?.date ?? "");
  const [time, setTime] = useState(duplicateFrom?.time ?? "");
  const [address, setAddress] = useState(duplicateFrom?.address ?? "");
  const [zip, setZip] = useState(duplicateFrom?.zip ?? "");
  const [cutoffTime, setCutoffTime] = useState(duplicateFrom?.cutoff_time ?? "");
  const [status, setStatus] = useState<"draft" | "active">("draft");

  // Reset form when modal opens/closes or duplicate changes
  useEffect(() => {
    if (isOpen) {
      setCity(duplicateFrom?.city ?? "");
      setState(duplicateFrom?.state ?? "");
      setLocation(duplicateFrom?.location ?? "");
      setDate(duplicateFrom?.date ?? "");
      setTime(duplicateFrom?.time ?? "");
      setAddress(duplicateFrom?.address ?? "");
      setZip(duplicateFrom?.zip ?? "");
      setCutoffTime(duplicateFrom?.cutoff_time ?? "");
      setStatus("draft");
      setError(null);
    }
  }, [isOpen, duplicateFrom]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  // Escape key handler
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleEscape);
      return () => window.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen, onClose]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!city.trim() || !state.trim() || !location.trim() || !date) {
      setError("City, state, location, and date are required.");
      return;
    }

    setLoading(true);
    try {
      const result = await createStop(brandId, {
        city: city.trim(),
        state: state.trim(),
        location: location.trim(),
        date,
        time: time || "08:00",
        address: address || undefined,
        zip: zip || undefined,
        cutoff_time: cutoffTime || undefined,
        active: status === "active",
      });

      if (result.success) {
        onSuccess?.(result.id);
        onClose();
      } else {
        setError(result.error ?? "Failed to create stop");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [brandId, city, state, location, date, time, address, zip, cutoffTime, status, onSuccess, onClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!isOpen) return null;

  const isDuplicate = Boolean(duplicateFrom);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={handleBackdropClick}
    >
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-2xl border border-stone-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 px-6 py-4">
          <div>
            <h2 className="text-xl font-semibold text-stone-950">
              {isDuplicate ? "Duplicate Stop" : "Add New Stop"}
            </h2>
            <p className="mt-0.5 text-sm text-stone-500">
              {isDuplicate && duplicateFrom
                ? `Pre-filled from ${duplicateFrom.city}, ${duplicateFrom.state}`
                : "Create a new tour stop for your route."}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="p-6 space-y-5">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Location row */}
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                  City <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Denver"
                  className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                  State <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value.toUpperCase())}
                  placeholder="CO"
                  maxLength={2}
                  className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  required
                />
              </div>
            </div>

            {/* Location name */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">
                Location Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Whole Foods Market"
                className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                required
              />
            </div>

            {/* Date & Time row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                  Pickup Time
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                />
              </div>
            </div>

            {/* Address & ZIP */}
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                  Street Address
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="123 Main St"
                  className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                  ZIP Code
                </label>
                <input
                  type="text"
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  placeholder="80202"
                  className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                />
              </div>
            </div>

            {/* Cutoff time */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">
                Order Cutoff Time
              </label>
              <input
                type="time"
                value={cutoffTime}
                onChange={(e) => setCutoffTime(e.target.value)}
                className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
              />
              <p className="mt-1 text-xs text-stone-400">
                Customers can only order until this time on the day before pickup.
              </p>
            </div>

            {/* Status toggle */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                Status
              </label>
              <div className="flex gap-3">
                <label className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-3 cursor-pointer transition-all ${
                  status === "draft"
                    ? "border-amber-300 bg-amber-50 text-amber-800"
                    : "border-stone-200 bg-white text-stone-500 hover:border-stone-300"
                }`}>
                  <input
                    type="radio"
                    name="status"
                    value="draft"
                    checked={status === "draft"}
                    onChange={() => setStatus("draft")}
                    className="sr-only"
                  />
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    status === "draft" ? "bg-amber-200 text-amber-900" : "bg-stone-100 text-stone-500"
                  }`}>
                    Draft
                  </span>
                  <span className="text-sm font-medium">Save as draft</span>
                </label>
                <label className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-3 cursor-pointer transition-all ${
                  status === "active"
                    ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                    : "border-stone-200 bg-white text-stone-500 hover:border-stone-300"
                }`}>
                  <input
                    type="radio"
                    name="status"
                    value="active"
                    checked={status === "active"}
                    onChange={() => setStatus("active")}
                    className="sr-only"
                  />
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    status === "active" ? "bg-emerald-200 text-emerald-900" : "bg-stone-100 text-stone-500"
                  }`}>
                    Active
                  </span>
                  <span className="text-sm font-medium">Publish now</span>
                </label>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-stone-100 px-6 py-4 bg-stone-50">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50 transition-colors shadow-sm shadow-emerald-200"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Creating...
                </span>
              ) : (
                isDuplicate ? "Duplicate Stop" : "Create Stop"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Hook for easy integration
export function useAddStopModal(brandId: string, duplicateFrom?: Props["duplicateFrom"]) {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  const Modal = useCallback(() => (
    <AddStopModal
      isOpen={isOpen}
      onClose={close}
      brandId={brandId}
      duplicateFrom={duplicateFrom}
    />
  ), [isOpen, close, brandId, duplicateFrom]);

  return { open, close, Modal };
}