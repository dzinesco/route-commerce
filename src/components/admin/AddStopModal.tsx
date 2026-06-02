"use client";

import { useState, useCallback, useEffect } from "react";
import { createStop } from "@/actions/stops/create-stop";
import GlassModal from "@/components/admin/GlassModal";

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

  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [address, setAddress] = useState("");
  const [zip, setZip] = useState("");
  const [cutoffTime, setCutoffTime] = useState("");
  const [status, setStatus] = useState<"draft" | "active">("draft");

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

  const isDuplicate = Boolean(duplicateFrom);
  const title = isDuplicate ? "Duplicate Stop" : "Add New Stop";
  const subtitle = isDuplicate && duplicateFrom
    ? `From ${duplicateFrom.city}, ${duplicateFrom.state}`
    : "Create a new tour stop for your route.";

  const inputStyle = {
    background: 'rgba(0, 0, 0, 0.02)',
    border: '1px solid rgba(0, 0, 0, 0.06)',
    outline: 'none',
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.target.style.background = 'rgba(16, 185, 129, 0.04)';
    e.target.style.border = '1px solid rgba(16, 185, 129, 0.5)';
    e.target.style.boxShadow = '0 0 0 4px rgba(16, 185, 129, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04)';
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.target.style.background = 'rgba(0, 0, 0, 0.02)';
    e.target.style.border = '1px solid rgba(0, 0, 0, 0.06)';
    e.target.style.boxShadow = 'none';
  };

  if (!isOpen) return null;

  return (
    <GlassModal title={title} subtitle={subtitle} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-xl px-4 py-3 text-sm text-red-600 backdrop-blur-sm" 
            style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            {error}
          </div>
        )}

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 space-y-1.5">
            <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide ml-1">City</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Denver"
              className="w-full rounded-xl px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 transition-all"
              style={inputStyle}
              onFocus={handleFocus}
              onBlur={handleBlur}
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide ml-1">State</label>
            <input
              type="text"
              value={state}
              onChange={(e) => setState(e.target.value.toUpperCase())}
              placeholder="CO"
              maxLength={2}
              className="w-full rounded-xl px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 transition-all"
              style={inputStyle}
              onFocus={handleFocus}
              onBlur={handleBlur}
              required
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide ml-1">Location</label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Whole Foods Market"
            className="w-full rounded-xl px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 transition-all"
            style={inputStyle}
            onFocus={handleFocus}
            onBlur={handleBlur}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide ml-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-sm text-stone-900 transition-all"
              style={inputStyle}
              onFocus={handleFocus}
              onBlur={handleBlur}
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide ml-1">Pickup Time</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-sm text-stone-900 transition-all"
              style={inputStyle}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 space-y-1.5">
            <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide ml-1">Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Main St"
              className="w-full rounded-xl px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 transition-all"
              style={inputStyle}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide ml-1">ZIP</label>
            <input
              type="text"
              value={zip}
              onChange={(e) => setZip(e.target.value)}
              placeholder="80202"
              className="w-full rounded-xl px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 transition-all"
              style={inputStyle}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide ml-1">Cutoff Time</label>
          <input
            type="time"
            value={cutoffTime}
            onChange={(e) => setCutoffTime(e.target.value)}
            className="w-full rounded-xl px-4 py-3 text-sm text-stone-900 transition-all"
            style={inputStyle}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
          <p className="mt-1 text-xs text-stone-400 ml-1">Orders close this time the day before pickup</p>
        </div>

        {/* Status toggle */}
        <div className="space-y-2">
          <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide ml-1">Status</label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStatus("draft")}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-3 transition-all"
              style={{
                border: status === "draft" ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid rgba(0, 0, 0, 0.08)',
                background: status === "draft" ? 'rgba(245, 158, 11, 0.08)' : 'rgba(0, 0, 0, 0.02)',
              }}
            >
              <span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{
                background: status === "draft" ? 'rgba(245, 158, 11, 0.2)' : 'rgba(0, 0, 0, 0.05)',
                color: status === "draft" ? '#b45309' : 'rgba(0, 0, 0, 0.4)',
              }}>Draft</span>
              <span className="text-sm font-medium" style={{ color: status === "draft" ? '#92400e' : 'rgba(0, 0, 0, 0.4)' }}>Save as draft</span>
            </button>
            <button
              type="button"
              onClick={() => setStatus("active")}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-3 transition-all"
              style={{
                border: status === "active" ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(0, 0, 0, 0.08)',
                background: status === "active" ? 'rgba(16, 185, 129, 0.08)' : 'rgba(0, 0, 0, 0.02)',
              }}
            >
              <span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{
                background: status === "active" ? 'rgba(16, 185, 129, 0.2)' : 'rgba(0, 0, 0, 0.05)',
                color: status === "active" ? '#047857' : 'rgba(0, 0, 0, 0.4)',
              }}>Active</span>
              <span className="text-sm font-medium" style={{ color: status === "active" ? '#065f46' : 'rgba(0, 0, 0, 0.4)' }}>Publish now</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-4" style={{ borderTop: '1px solid rgba(0, 0, 0, 0.04)' }}>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-5 py-2.5 text-sm font-medium text-stone-500 hover:text-stone-700 transition-all hover:bg-stone-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl px-6 py-2.5 text-sm font-semibold text-white transition-all"
            style={{ 
              background: loading 
                ? 'rgba(16, 185, 129, 0.4)' 
                : 'linear-gradient(135deg, #059669 0%, #10b981 50%, #34d399 100%)',
              boxShadow: loading 
                ? 'none' 
                : '0 4px 12px rgba(16, 185, 129, 0.25), inset 0 1px 0 rgba(255,255,255,0.2)',
              opacity: loading ? 0.7 : 1,
            }}
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
    </GlassModal>
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