"use client";

import { useState, useCallback, useEffect } from "react";
import { updateLocation } from "@/actions/locations";
import GlassModal from "@/components/admin/GlassModal";

export type LocationForEdit = {
  id: string;
  brand_id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  contact_name: string | null;
  contact_email: string | null;
  notes: string | null;
  active: boolean;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  location: LocationForEdit | null;
  brandId: string;
  onSuccess?: () => void;
};

export default function EditLocationModal({ isOpen, onClose, location, brandId, onSuccess }: Props) {
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

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (location && isOpen) {
      setName(location.name ?? "");
      setAddress(location.address ?? "");
      setCity(location.city ?? "");
      setStateVal(location.state ?? "");
      setZip(location.zip ?? "");
      setPhone(location.phone ?? "");
      setContactName(location.contact_name ?? "");
      setContactEmail(location.contact_email ?? "");
      setNotes(location.notes ?? "");
      setError(null);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [location, isOpen]);

  const handleClose = useCallback(() => {
    if (loading) return;
    setError(null);
    onClose();
  }, [loading, onClose]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!location) return;
      setError(null);
      if (!name.trim()) {
        setError("Venue name is required.");
        return;
      }
      setLoading(true);
      try {
        const result = await updateLocation(location.id, brandId, {
          name: name.trim(),
          address: address.trim() || null,
          city: city.trim() || null,
          state: stateVal.trim().toUpperCase() || null,
          zip: zip.trim() || null,
          phone: phone.trim() || null,
          contact_name: contactName.trim() || null,
          contact_email: contactEmail.trim() || null,
          notes: notes.trim() || null,
          active: location.active,
        });
        if (result.success) {
          onSuccess?.();
          onClose();
        } else {
          setError(result.error ?? "Failed to update location");
        }
      } catch {
        setError("Network error. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [location, brandId, name, address, city, stateVal, zip, phone, contactName, contactEmail, notes, onSuccess, onClose]
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

  if (!isOpen || !location) return null;

  return (
    <GlassModal
      title="Edit Venue"
      subtitle="Changes apply to every stop currently linked to this venue."
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
            className="w-full rounded-xl px-4 py-3 text-sm text-stone-900 transition-all"
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
            className="w-full rounded-xl px-4 py-3 text-sm text-stone-900 transition-all"
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
              className="w-full rounded-xl px-4 py-3 text-sm text-stone-900 transition-all"
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
              maxLength={2}
              className="w-full rounded-xl px-4 py-3 text-sm text-stone-900 transition-all"
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
              className="w-full rounded-xl px-4 py-3 text-sm text-stone-900 transition-all"
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
              className="w-full rounded-xl px-4 py-3 text-sm text-stone-900 transition-all"
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
              className="w-full rounded-xl px-4 py-3 text-sm text-stone-900 transition-all"
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
            className="w-full rounded-xl px-4 py-3 text-sm text-stone-900 transition-all"
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
            rows={2}
            className="w-full rounded-xl px-4 py-3 text-sm text-stone-900 transition-all resize-none"
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
                Saving…
              </span>
            ) : (
              "Save Changes"
            )}
          </button>
        </div>
      </form>
    </GlassModal>
  );
}
