"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { createPortal } from "react-dom";

export type ProductFormModalProps = {
  open: boolean;
  mode: "add" | "edit";
  onClose: () => void;
  onSubmit: (values: ProductFormValues) => Promise<{ success: boolean; error?: string }>;
  /** Defaults / initial values (edit mode passes the current product) */
  initial?: Partial<ProductFormValues>;
  /** List of selectable brands (only shown to platform admins) */
  brands?: { id: string; name: string }[];
  /** When true the brand picker is hidden and the admin's brand is used */
  lockBrand?: boolean;
  /** Hard-locked brand id (for brand_admin / store_employee) */
  lockedBrandId?: string;
  /** Pre-uploaded image URL (edit mode) */
  initialImageUrl?: string | null;
  /** Server action: upload a file and return the public URL */
  onUploadImage: (file: File) => Promise<{ success: boolean; imageUrl?: string; error?: string }>;
};

export type ProductFormValues = {
  name: string;
  description: string;
  price: string;
  type: "pickup" | "wholesale" | "subscription";
  brand_id: string;
  active: boolean;
  is_taxable: boolean;
  image_url: string | null;
  available_from?: string | null;
  available_until?: string | null;
};

const TYPE_OPTIONS: Array<{
  value: ProductFormValues["type"];
  label: string;
  italic: string;
  icon: React.ReactNode;
}> = [
  {
    value: "pickup",
    label: "Pickup",
    italic: "Farm & stops",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l1.5-4h15L21 9" />
        <path d="M3 9v11a1 1 0 001 1h16a1 1 0 001-1V9" />
        <path d="M3 9h18" />
        <path d="M9 14h6" />
      </svg>
    ),
  },
  {
    value: "wholesale",
    label: "Wholesale",
    italic: "B2B portal",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 7h18l-2 12H5L3 7z" />
        <path d="M8 7V5a4 4 0 018 0v2" />
      </svg>
    ),
  },
  {
    value: "subscription",
    label: "Subscription",
    italic: "Recurring",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12a9 9 0 11-3-6.7" />
        <path d="M21 4v5h-5" />
      </svg>
    ),
  },
];

export default function ProductFormModal({
  open,
  mode,
  onClose,
  onSubmit,
  initial,
  brands = [],
  lockBrand = false,
  lockedBrandId = "",
  initialImageUrl = null,
  onUploadImage,
}: ProductFormModalProps) {
  // Form state
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [price, setPrice] = useState(initial?.price ?? "");
  const [type, setType] = useState<ProductFormValues["type"]>(initial?.type ?? "pickup");
  const [brandId, setBrandId] = useState(
    initial?.brand_id ?? lockedBrandId ?? brands[0]?.id ?? ""
  );
  const [active, setActive] = useState(initial?.active ?? true);
  const [isTaxable, setIsTaxable] = useState(initial?.is_taxable ?? true);
  const [availableFrom, setAvailableFrom] = useState(initial?.available_from ? initial.available_from.split('T')[0] : "");
  const [availableUntil, setAvailableUntil] = useState(initial?.available_until ? initial.available_until.split('T')[0] : "");

  // Image state
  const [imagePreview, setImagePreview] = useState<string | null>(initialImageUrl);
  const [imageUrl, setImageUrl] = useState<string | null>(initialImageUrl);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDrag, setIsDrag] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Submit state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset state when opening with new initial values
  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? "");
    setDescription(initial?.description ?? "");
    setPrice(initial?.price ?? "");
    setType((initial?.type as ProductFormValues["type"]) ?? "pickup");
    setBrandId(initial?.brand_id ?? lockedBrandId ?? brands[0]?.id ?? "");
    setActive(initial?.active ?? true);
    setIsTaxable(initial?.is_taxable ?? true);
    setAvailableFrom(initial?.available_from ? initial.available_from.split('T')[0] : "");
    setAvailableUntil(initial?.available_until ? initial.available_until.split('T')[0] : "");
    setImagePreview(initialImageUrl);
    setImageUrl(initialImageUrl);
    setUploading(false);
    setUploadError(null);
    setError(null);
    setSaving(false);
    setIsDrag(false);
  }, [open, initial, initialImageUrl, lockedBrandId, brands]);

  // Body scroll lock + escape key
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = original;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const handleFile = useCallback(
    async (file: File) => {
      const validTypes = ["image/png", "image/jpeg", "image/webp"];
      if (!validTypes.includes(file.type)) {
        setUploadError("PNG, JPEG, or WebP only.");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setUploadError("File must be under 5MB.");
        return;
      }
      setUploadError(null);
      setUploading(true);

      // Local preview first
      const localUrl = URL.createObjectURL(file);
      setImagePreview(localUrl);

      const result = await onUploadImage(file);
      setUploading(false);

      if (result.success && result.imageUrl) {
        setImageUrl(result.imageUrl);
        setImagePreview(result.imageUrl);
        URL.revokeObjectURL(localUrl);
      } else {
        setUploadError(result.error ?? "Upload failed.");
        setImagePreview(imageUrl); // revert
      }
    },
    [onUploadImage, imageUrl]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Product name is required.");
      return;
    }
    if (!price || isNaN(parseFloat(price)) || parseFloat(price) < 0) {
      setError("Valid price is required.");
      return;
    }
    if (!lockBrand && !brandId) {
      setError("Please select a brand.");
      return;
    }

    setSaving(true);
    const res = await onSubmit({
      name: name.trim(),
      description: description.trim(),
      price,
      type,
      brand_id: lockBrand ? lockedBrandId : brandId,
      active,
      is_taxable: isTaxable,
      image_url: imageUrl,
      available_from: availableFrom ? new Date(availableFrom).toISOString() : null,
      available_until: availableUntil ? new Date(availableUntil).toISOString() : null,
    });
    setSaving(false);

    if (!res.success) {
      setError(res.error ?? "Something went wrong.");
      return;
    }
    onClose();
  }

  if (!mounted || !open) return null;

  const showBrandPicker = !lockBrand;
  const lockedBrandName = brands.find((b) => b.id === lockedBrandId)?.name ?? lockedBrandId;

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-6 atelier-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        backgroundColor: "rgba(28, 25, 23, 0.55)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={mode === "add" ? "Add product" : "Edit product"}
        className="atelier-enter atelier-canvas relative w-full max-w-5xl max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-3rem)] rounded-2xl shadow-[0_30px_80px_-20px_rgba(28,25,23,0.45)] flex flex-col overflow-hidden border border-stone-200/60"
      >
        {/* grain overlay */}
        <div className="atelier-grain" aria-hidden />

        {/* HEADER */}
        <div className="relative shrink-0 px-6 sm:px-10 pt-6 sm:pt-8 pb-5 sm:pb-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2.5 mb-3">
                <span className="atelier-section-num">
                  {mode === "add" ? "Nouveau" : "Mise à jour"} · MMXXVI
                </span>
              </div>
              <h2 className="atelier-title text-3xl sm:text-4xl md:text-5xl">
                {mode === "add" ? (
                  <>
                    Add a <span className="atelier-italic">product</span>
                  </>
                ) : (
                  <>
                    Edit <span className="atelier-italic">{initial?.name || "product"}</span>
                  </>
                )}
              </h2>
              <p className="atelier-italic mt-2 text-sm sm:text-[15px] max-w-md leading-relaxed">
                {mode === "add"
                  ? "Compose a new entry for the harvest catalog — every detail, like a recipe."
                  : "Refine the details of this entry. The catalog is a living record."}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200 hover:bg-stone-900 hover:text-white text-stone-500"
              aria-label="Close"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="relative shrink-0 px-6 sm:px-10">
          <hr className="atelier-rule" />
        </div>

        {/* BODY — two columns */}
        <form
          onSubmit={handleSubmit}
          className="relative flex-1 overflow-y-auto"
          onDragEnter={(e) => {
            e.preventDefault();
            setIsDrag(true);
          }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-0">
            {/* LEFT — Image hero */}
            <div className="relative px-6 sm:px-10 pt-6 sm:pt-8 pb-6 lg:border-r border-stone-200/60 lg:pr-8">
              <div className="atelier-section-num mb-4">01 · Media</div>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDrag(true);
                }}
                onDragLeave={(e) => {
                  if (e.currentTarget === e.target) setIsDrag(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDrag(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleFile(file);
                }}
                onClick={() => !uploading && fileInputRef.current?.click()}
                className={[
                  "atelier-drop",
                  isDrag ? "is-drag" : "",
                  uploadError ? "is-error" : "",
                  imagePreview ? "has-image" : "",
                ].join(" ")}
              >
                {/* status pill */}
                <div
                  className={[
                    "atelier-status-pill",
                    imagePreview ? "" : "is-empty",
                  ].join(" ")}
                >
                  <span className="atelier-dot" />
                  {imagePreview
                    ? uploading
                      ? "Uploading"
                      : "Image set"
                    : "No image yet"}
                </div>

                {uploading ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-6 w-6 rounded-full border-2 border-stone-300 border-t-[#224E2F] animate-spin" />
                    <p className="atelier-drop-title">Pouring into the cellar…</p>
                  </div>
                ) : imagePreview ? (
                  <div className="absolute inset-0 p-3 sm:p-4">
                    <div className="relative h-full w-full">
                      <Image
                        src={imagePreview}
                        alt="Product preview"
                        fill
                        style={{ objectFit: "contain" }}
                        className="rounded-md"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setImagePreview(null);
                        setImageUrl(null);
                      }}
                      className="absolute bottom-4 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 rounded-full bg-stone-900/85 backdrop-blur-sm px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider text-white hover:bg-stone-900 transition-colors"
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Remove
                    </button>
                  </div>
                ) : (
                  <>
                    {/* ornamental drop zone content */}
                    <svg
                      className="h-10 w-10 text-[#224E2F]/70"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 3v13" />
                      <path d="M7 8l5-5 5 5" />
                      <path d="M4 16v3a2 2 0 002 2h12a2 2 0 002-2v-3" />
                      <circle cx="12" cy="20" r="0.8" fill="currentColor" />
                    </svg>
                    <p className="atelier-drop-eyebrow">Drag &amp; drop</p>
                    <p className="atelier-drop-title">
                      or click to choose<br />a harvest portrait
                    </p>
                    <p className="atelier-drop-hint">PNG · JPEG · WebP · 5MB max</p>
                  </>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFile(file);
                    e.target.value = "";
                  }}
                />
              </div>

              {uploadError && (
                <p className="mt-3 atelier-hint" style={{ color: "#B91C1C" }}>
                  {uploadError}
                </p>
              )}
            </div>

            {/* RIGHT — Form fields */}
            <div className="px-6 sm:px-10 pt-6 sm:pt-8 pb-6 lg:pl-10 space-y-7 atelier-stagger">
              {error && (
                <div className="atelier-error">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              {/* 02 IDENTITY */}
              <section>
                <div className="flex items-baseline justify-between mb-4">
                  <div className="atelier-section-num">02 · Identity</div>
                </div>

                <div>
                  <label
                    htmlFor="atelier-name"
                    className="atelier-section-label block mb-1"
                  >
                    Product name
                  </label>
                  <input
                    id="atelier-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Dozen Sweet Corn"
                    className="atelier-input atelier-input--display"
                    autoComplete="off"
                  />
                </div>

                <div className="mt-5">
                  <label
                    htmlFor="atelier-desc"
                    className="atelier-section-label block mb-1"
                  >
                    Description
                  </label>
                  <textarea
                    id="atelier-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="A note from the field — origin, variety, picking notes…"
                    rows={2}
                    className="atelier-input resize-none"
                    style={{ minHeight: 56 }}
                  />
                </div>
              </section>

              {/* 03 COMMERCE */}
              <section>
                <div className="atelier-section-num mb-4">03 · Commerce</div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label
                      htmlFor="atelier-price"
                      className="atelier-section-label block mb-1"
                    >
                      Price
                    </label>
                    <div className="relative">
                      <span className="atelier-price-sigil">$</span>
                      <input
                        id="atelier-price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        placeholder="0.00"
                        className="atelier-price"
                      />
                    </div>
                  </div>

                  {showBrandPicker ? (
                    <div>
                      <label
                        htmlFor="atelier-brand"
                        className="atelier-section-label block mb-1"
                      >
                        Brand
                      </label>
                      <select
                        id="atelier-brand"
                        value={brandId}
                        onChange={(e) => setBrandId(e.target.value)}
                        className="atelier-select"
                      >
                        {brands.length === 0 && <option value="">Loading brands…</option>}
                        {brands.length > 0 && <option value="">Select a brand…</option>}
                        {brands.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                      <p className="atelier-hint">
                        You administer multiple brands — choose the one this product belongs to.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <span className="atelier-section-label block mb-1">Brand</span>
                      <div className="py-2.5 border-b border-stone-300/40">
                        <span className="font-[family-name:var(--font-fraunces)] text-[15px] text-stone-700">
                          {lockedBrandName || "—"}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-6">
                  <span className="atelier-section-label block mb-2">Type</span>
                  <div className="grid grid-cols-3 gap-2.5">
                    {TYPE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setType(opt.value)}
                        className={[
                          "atelier-type-card",
                          type === opt.value ? "is-selected" : "",
                        ].join(" ")}
                        aria-pressed={type === opt.value}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="atelier-type-icon">{opt.icon}</span>
                          <svg
                            className="atelier-type-check h-3.5 w-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={3}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <div>
                          <div className="atelier-type-name">{opt.label}</div>
                          <div
                            className={[
                              "text-[10px] font-[family-name:var(--font-fragment-mono)] uppercase tracking-wider mt-0.5",
                              type === opt.value ? "text-white/60" : "text-stone-500",
                            ].join(" ")}
                          >
                            {opt.italic}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              {/* 04 SETTINGS */}
              <section>
                <div className="atelier-section-num mb-4">04 · Settings</div>
                <div className="flex flex-wrap items-center gap-6 sm:gap-10">
                  <button
                    type="button"
                    onClick={() => setActive((v) => !v)}
                    className={["atelier-toggle", active ? "is-on" : ""].join(" ")}
                    aria-pressed={active}
                  >
                    <span className="atelier-toggle-track">
                      <span className="atelier-toggle-thumb" />
                    </span>
                    <span className="atelier-toggle-label">Active</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsTaxable((v) => !v)}
                    className={["atelier-toggle is-gold", isTaxable ? "is-on" : ""].join(" ")}
                    aria-pressed={isTaxable}
                  >
                    <span className="atelier-toggle-track">
                      <span className="atelier-toggle-thumb" />
                    </span>
                    <span className="atelier-toggle-label">Taxable</span>
                  </button>

                  <p className="atelier-hint flex-1 min-w-[200px]">
                    Active products appear in the storefront. Taxable items add sales tax at checkout.
                  </p>
                </div>

                {/* Seasonal Availability */}
                <div className="mt-6 pt-6 border-t border-stone-200/40">
                  <span className="atelier-section-label block mb-3">Seasonal Availability</span>
                  <p className="atelier-hint mb-4">Set when this product is available (e.g., mid-July through mid-September)</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="atelier-available-from" className="block text-[11px] font-mono uppercase tracking-wider text-stone-500 mb-1.5">Start Date</label>
                      <input
                        id="atelier-available-from"
                        type="date"
                        value={availableFrom}
                        onChange={(e) => setAvailableFrom(e.target.value)}
                        className="atelier-input"
                      />
                    </div>
                    <div>
                      <label htmlFor="atelier-available-until" className="block text-[11px] font-mono uppercase tracking-wider text-stone-500 mb-1.5">End Date</label>
                      <input
                        id="atelier-available-until"
                        type="date"
                        value={availableUntil}
                        onChange={(e) => setAvailableUntil(e.target.value)}
                        className="atelier-input"
                      />
                    </div>
                  </div>
                  {(availableFrom || availableUntil) && (
                    <button
                      type="button"
                      onClick={() => { setAvailableFrom(""); setAvailableUntil(""); }}
                      className="mt-2 text-[11px] font-mono uppercase tracking-wider text-stone-400 hover:text-stone-600"
                    >
                      Clear dates
                    </button>
                  )}
                </div>
              </section>
            </div>
          </div>
        </form>

        {/* FOOTER */}
        <div className="relative shrink-0 px-6 sm:px-10 pt-4 pb-6 sm:pb-7 border-t border-stone-200/60 bg-[#FAF7F0]/80 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={onClose}
              className="atelier-discard"
            >
              discard changes
            </button>

            <div className="flex items-center gap-3">
              {/* readiness indicator */}
              <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-stone-500">
                <span
                  className={[
                    "h-1.5 w-1.5 rounded-full",
                    name.trim() && price
                      ? "bg-emerald-600 shadow-[0_0_0_3px_rgba(22,163,74,0.15)]"
                      : "bg-stone-300",
                  ].join(" ")}
                />
                {name.trim() && price ? "Ready" : "Required fields pending"}
              </div>

              <button
                type="submit"
                form="atelier-product-form"
                onClick={handleSubmit}
                disabled={saving || uploading || !name.trim() || !price}
                className="atelier-cta"
              >
                <span className="atelier-cta-shimmer" />
                {saving ? (
                  <>
                    <span className="h-3.5 w-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                    {mode === "add" ? "Composing…" : "Saving…"}
                  </>
                ) : (
                  <>
                    {mode === "add" ? "Add to catalog" : "Save changes"}
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
