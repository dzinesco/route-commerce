"use client";

import { useState, useCallback, useEffect, useRef } from "react";
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

/* Pin icon for the modal header */
const PinIcon = () => (
  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

export default function AddStopModal({ isOpen, onClose, brandId, duplicateFrom, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [city, setCity] = useState("");
  const [stateField, setStateField] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  /* eslint-disable react-hooks/set-state-in-effect */
  const [address, setAddress] = useState("");
  const [zip, setZip] = useState("");
  const [cutoffTime, setCutoffTime] = useState("");
  const [status, setStatus] = useState<"draft" | "active">("draft");

  const cityRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens with optional duplicate source
      setCity(duplicateFrom?.city ?? "");
      setStateField(duplicateFrom?.state ?? "");
      setLocation(duplicateFrom?.location ?? "");
      setDate(duplicateFrom?.date ?? "");
      setTime(duplicateFrom?.time ?? "");
      setAddress(duplicateFrom?.address ?? "");
      setZip(duplicateFrom?.zip ?? "");
      setCutoffTime(duplicateFrom?.cutoff_time ?? "");
      setStatus("draft");
      setError(null);
      // Auto-focus city field for fast data entry
      requestAnimationFrame(() => cityRef.current?.focus());
    }
  /* eslint-enable react-hooks/set-state-in-effect */
  }, [isOpen, duplicateFrom]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      if (!city.trim() || !stateField.trim() || !location.trim() || !date) {
        setError("City, state, location, and date are required.");
        return;
      }

      setLoading(true);
      try {
        const result = await createStop(brandId, {
          city: city.trim(),
          state: stateField.trim(),
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
    },
    [
      brandId,
      city,
      stateField,
      location,
      date,
      time,
      address,
      zip,
      cutoffTime,
      status,
      onSuccess,
      onClose,
    ]
  );

  const isDuplicate = Boolean(duplicateFrom);
  const title = isDuplicate ? "Duplicate Stop" : "Add Stop";
  const eyebrow = isDuplicate && duplicateFrom
    ? `From ${duplicateFrom.city}, ${duplicateFrom.state}`
    : "New stop on the route";
  const submitLabel = loading
    ? isDuplicate ? "Duplicating…" : "Creating…"
    : isDuplicate
      ? "Duplicate Stop"
      : status === "active"
        ? "Create & Publish"
        : "Save as Draft";

  if (!isOpen) return null;

  return (
    <GlassModal
      title={title}
      eyebrow={eyebrow}
      onClose={onClose}
      maxWidth="max-w-xl"
      compact
    >
      <form onSubmit={handleSubmit} className="space-y-3" noValidate>
        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg px-3 py-2 text-xs text-[var(--admin-danger)]"
            style={{ background: "rgba(220, 38, 38, 0.06)", border: "1px solid rgba(220, 38, 38, 0.15)" }}
          >
            <svg className="h-3.5 w-3.5 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Row 1 — Where: City + State */}
        <div className="grid grid-cols-[1fr_5.5rem] gap-3">
          <div className="ha-field">
            <label htmlFor="stop-city" className="ha-field-label">
              <PinIcon />
              <span>City</span>
              <span className="ha-field-label-required">*</span>
            </label>
            <input
              ref={cityRef}
              id="stop-city"
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Denver"
              className="ha-field-input"
              required
              autoComplete="address-level2"
            />
          </div>
          <div className="ha-field">
            <label htmlFor="stop-state" className="ha-field-label">
              <span>State</span>
              <span className="ha-field-label-required">*</span>
            </label>
            <input
              id="stop-state"
              type="text"
              value={stateField}
              onChange={(e) => setStateField(e.target.value.toUpperCase())}
              placeholder="CO"
              maxLength={2}
              className="ha-field-input ha-field-input-mono text-center"
              style={{ textTransform: "uppercase" }}
              required
              autoComplete="address-level1"
            />
          </div>
        </div>

        {/* Row 2 — Where at: Location (full) */}
        <div className="ha-field">
          <label htmlFor="stop-location" className="ha-field-label">
            <span>Location / Venue</span>
            <span className="ha-field-label-required">*</span>
          </label>
          <input
            id="stop-location"
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Whole Foods Market — Highlands"
            className="ha-field-input"
            required
          />
        </div>

        {/* Row 3 — When: Date + Time (with small clock icon) */}
        <div className="grid grid-cols-[1fr_1fr] gap-3">
          <div className="ha-field">
            <label htmlFor="stop-date" className="ha-field-label">
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" />
              </svg>
              <span>Pickup Date</span>
              <span className="ha-field-label-required">*</span>
            </label>
            <input
              id="stop-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="ha-field-input ha-field-input-mono"
              required
            />
          </div>
          <div className="ha-field">
            <label htmlFor="stop-time" className="ha-field-label">
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" strokeLinecap="round" />
              </svg>
              <span>Pickup Time</span>
            </label>
            <input
              id="stop-time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="ha-field-input ha-field-input-mono"
            />
          </div>
        </div>

        {/* Row 4 — Address + ZIP + Cutoff in 3 columns */}
        <div className="grid grid-cols-[1fr_5.5rem_6.5rem] gap-3">
          <div className="ha-field">
            <label htmlFor="stop-address" className="ha-field-label">
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" strokeLinejoin="round" />
                <path d="M9 22V12h6v10" strokeLinejoin="round" />
              </svg>
              <span>Street Address</span>
            </label>
            <input
              id="stop-address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Main St"
              className="ha-field-input"
              autoComplete="street-address"
            />
          </div>
          <div className="ha-field">
            <label htmlFor="stop-zip" className="ha-field-label">
              <span>ZIP</span>
            </label>
            <input
              id="stop-zip"
              type="text"
              value={zip}
              onChange={(e) => setZip(e.target.value)}
              placeholder="80202"
              maxLength={10}
              className="ha-field-input ha-field-input-mono"
              autoComplete="postal-code"
            />
          </div>
          <div className="ha-field">
            <label htmlFor="stop-cutoff" className="ha-field-label">
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" strokeLinecap="round" />
              </svg>
              <span>Cutoff</span>
            </label>
            <input
              id="stop-cutoff"
              type="time"
              value={cutoffTime}
              onChange={(e) => setCutoffTime(e.target.value)}
              className="ha-field-input ha-field-input-mono"
            />
          </div>
        </div>

        {/* Row 5 — Status: segmented control (compact, replaces two giant buttons) */}
        <div className="ha-field pt-0.5">
          <div className="flex items-center justify-between">
            <label className="ha-field-label">
              <span>Visibility</span>
            </label>
            <span className="text-[10px] text-[var(--admin-text-muted)] leading-none">
              Draft is hidden from customers
            </span>
          </div>
          <div className="ha-segment mt-1" role="radiogroup" aria-label="Stop status">
            <button
              type="button"
              role="radio"
              aria-checked={status === "draft"}
              onClick={() => setStatus("draft")}
              className={`ha-segment-btn ${status === "draft" ? "ha-segment-btn--active ha-segment-active-draft" : ""}`}
            >
              <span className="ha-segment-dot" />
              <span>Save as Draft</span>
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={status === "active"}
              onClick={() => setStatus("active")}
              className={`ha-segment-btn ${status === "active" ? "ha-segment-btn--active ha-segment-active-active" : ""}`}
            >
              <span className="ha-segment-dot" />
              <span>Publish Now</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="ha-modal-footer">
          <span className="ha-modal-footer-hint">
            <kbd>Esc</kbd>
            to close
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="ha-btn-ghost"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="ha-btn-primary"
            >
              {loading ? (
                <>
                  <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
                    <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  <span>{submitLabel}</span>
                </>
              ) : (
                <>
                  {status === "active" ? (
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                      <path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" strokeLinejoin="round" />
                      <path d="M17 21v-8H7v8M7 3v5h8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                  <span>{submitLabel}</span>
                </>
              )}
            </button>
          </div>
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
