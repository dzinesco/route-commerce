"use client";

import { useState, useCallback } from "react";
import { createLocation } from "@/actions/locations";
import GlassModal from "@/components/admin/GlassModal";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  brandId: string;
  onSuccess?: (locationId: string) => void;
};

export default function AddLocationModal({ isOpen, onClose, brandId, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [stateVal, setStateVal] = useState("");
  const [zip, setZip] = useState("");
  const [phone, setPhone] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [notes, setNotes] = useState("");

  const reset = useCallback(() => {
    setName("");
    setAddress("");
    setCity("");
    setStateVal("");
    setZip("");
    setPhone("");
    setContactName("");
    setContactEmail("");
    setNotes("");
    setError(null);
  }, []);

  const handleClose = useCallback(() => {
    if (loading) return;
    reset();
    onClose();
  }, [loading, reset, onClose]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      if (!name.trim()) {
        setError("Venue name is required.");
        return;
      }
      setLoading(true);
      try {
        const result = await createLocation(brandId, {
          name: name.trim(),
          address: address.trim() || null,
          city: city.trim() || null,
          state: stateVal.trim().toUpperCase() || null,
          zip: zip.trim() || null,
          phone: phone.trim() || null,
          contact_name: contactName.trim() || null,
          contact_email: contactEmail.trim() || null,
          notes: notes.trim() || null,
          active: true,
        });
        if (result.success) {
          onSuccess?.(result.id);
          reset();
          onClose();
        } else {
          setError(result.error ?? "Failed to create location");
        }
      } catch {
        setError("Network error. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [brandId, name, address, city, stateVal, zip, phone, contactName, contactEmail, notes, onSuccess, reset, onClose]
  );

  const inputStyle = {
    background: "rgba(0, 0, 0, 0.02)",
    border: "1px solid rgba(0, 0, 0, 0.06)",
    outline: "none",
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.target.style.background = "rgba(16, 185, 129, 0.04)";
    e.target.style.border = "1px solid rgba(16, 185, 129, 0.5)";
    e.target.style.boxShadow = "0 0 0 4px rgba(16, 185, 129, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04)";
  };
  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.target.style.background = "rgba(0, 0, 0, 0.02)";
    e.target.style.border = "1px solid rgba(0, 0, 0, 0.06)";
    e.target.style.boxShadow = "none";
  };

  if (!isOpen) return null;

  return (
    <GlassModal
      title="Add Venue"
      subtitle="Reusable pick-up location. Once saved, you can attach stops to it from the Stops tab."
      onClose={handleClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div
            className="rounded-xl px-4 py-3 text-sm text-red-600 backdrop-blur-sm"
            style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)" }}
          >
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide ml-1">Venue name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tractor Supply"
            className="w-full rounded-xl px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 transition-all"
            style={inputStyle}
            onFocus={handleFocus}
            onBlur={handleBlur}
            required
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide ml-1">Street address</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="13778 E I-25 Frontage Rd"
            className="w-full rounded-xl px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 transition-all"
            style={inputStyle}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
        </div>

        <div className="grid grid-cols-6 gap-4">
          <div className="col-span-3 space-y-1.5">
            <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide ml-1">City</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Wellington"
              className="w-full rounded-xl px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 transition-all"
              style={inputStyle}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </div>
          <div className="col-span-1 space-y-1.5">
            <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide ml-1">State</label>
            <input
              type="text"
              value={stateVal}
              onChange={(e) => setStateVal(e.target.value.toUpperCase())}
              placeholder="CO"
              maxLength={2}
              className="w-full rounded-xl px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 transition-all"
              style={inputStyle}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </div>
          <div className="col-span-2 space-y-1.5">
            <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide ml-1">ZIP</label>
            <input
              type="text"
              value={zip}
              onChange={(e) => setZip(e.target.value)}
              placeholder="80549"
              className="w-full rounded-xl px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 transition-all"
              style={inputStyle}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide ml-1">Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(970) 555-1234"
              className="w-full rounded-xl px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 transition-all"
              style={inputStyle}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide ml-1">Contact name</label>
            <input
              type="text"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="Store manager"
              className="w-full rounded-xl px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 transition-all"
              style={inputStyle}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide ml-1">Contact email</label>
          <input
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            placeholder="manager@example.com"
            className="w-full rounded-xl px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 transition-all"
            style={inputStyle}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide ml-1">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Park on west side. Use side entrance after 9am."
            rows={2}
            className="w-full rounded-xl px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 transition-all resize-none"
            style={inputStyle}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4" style={{ borderTop: "1px solid rgba(0, 0, 0, 0.04)" }}>
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="rounded-xl px-5 py-2.5 text-sm font-medium text-stone-500 hover:text-stone-700 transition-all hover:bg-stone-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl px-6 py-2.5 text-sm font-semibold text-white transition-all"
            style={{
              background: loading
                ? "rgba(16, 185, 129, 0.4)"
                : "linear-gradient(135deg, #059669 0%, #10b981 50%, #34d399 100%)",
              boxShadow: loading
                ? "none"
                : "0 4px 12px rgba(16, 185, 129, 0.25), inset 0 1px 0 rgba(255,255,255,0.2)",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Creating…
              </span>
            ) : (
              "Create Venue"
            )}
          </button>
        </div>
      </form>
    </GlassModal>
  );
}
