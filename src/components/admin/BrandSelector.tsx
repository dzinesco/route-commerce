"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { setActiveBrand } from "@/actions/set-active-brand";

export type BrandSelectorItem = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
};

type BrandSelectorProps = {
  brands: BrandSelectorItem[];
  /** Currently-active brand id. `null` means "All brands" (platform_admin only). */
  activeBrandId: string | null;
  /** When true, shows the "All brands" pseudo-option at the top. */
  showAllBrandsOption: boolean;
  /** Whether the user has multi-brand access. Controls the "Multi-brand manager" badge. */
  isMultiBrandAdmin: boolean;
};

/**
 * Brand selector dropdown.
 *
 * Renders a compact pill showing the active brand (or "All brands" for
 * platform_admin) and opens a list of accessible brands on click.
 *
 * On select: calls `setActiveBrand` server action then `router.refresh()`
 * so all server components re-read the new cookie and reload their data.
 * The URL is NOT changed — the cookie is the source of truth.
 */
export default function BrandSelector({
  brands,
  activeBrandId,
  showAllBrandsOption,
  isMultiBrandAdmin,
}: BrandSelectorProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Close on escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  // No brands + no "All brands" option = don't render
  if (!showAllBrandsOption && brands.length === 0) return null;
  if (!showAllBrandsOption && brands.length < 2) return null;

  const activeBrand = brands.find((b) => b.id === activeBrandId);
  const label =
    showAllBrandsOption && !activeBrand
      ? "All brands"
      : activeBrand?.name ?? "Select brand";

  async function selectBrand(brandId: string | null) {
    setOpen(false);
    if (brandId === activeBrandId) return;
    setPending(true);
    try {
      const res = await setActiveBrand(brandId);
      if (res.success) {
        router.refresh();
      } else {
        // Keep UI usable if the server rejected; log for debugging
        console.error("setActiveBrand failed:", res.error);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={pending}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-colors text-left disabled:opacity-60"
        style={{
          backgroundColor: "rgba(208, 203, 180, 0.1)",
          borderColor: "rgba(208, 203, 180, 0.25)",
          color: "var(--admin-sidebar-text)",
        }}
      >
        <span
          className="flex h-5 w-5 items-center justify-center rounded-md text-[10px] font-semibold flex-shrink-0"
          style={{ backgroundColor: "var(--admin-accent)", color: "white" }}
          aria-hidden="true"
        >
          {showAllBrandsOption && !activeBrand ? "*" : label.charAt(0).toUpperCase()}
        </span>
        <span className="flex-1 min-w-0 text-xs font-medium truncate">
          {label}
        </span>
        {isMultiBrandAdmin && (
          <span
            className="text-[9px] font-medium px-1.5 py-0.5 rounded-md flex-shrink-0"
            style={{
              backgroundColor: "rgba(202, 117, 67, 0.18)",
              color: "var(--admin-accent)",
            }}
            title="Manages multiple brands"
          >
            multi
          </span>
        )}
        <svg
          className={`w-3 h-3 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute top-full left-0 right-0 mt-1.5 rounded-xl border shadow-2xl z-50 overflow-hidden"
          style={{
            backgroundColor: "var(--admin-sidebar-bg)",
            borderColor: "rgba(208, 203, 180, 0.25)",
          }}
        >
          {showAllBrandsOption && (
            <button
              type="button"
              role="option"
              aria-selected={!activeBrand}
              onClick={() => selectBrand(null)}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors hover:bg-white/5"
              style={{
                color: !activeBrand ? "var(--admin-accent)" : "var(--admin-sidebar-text)",
                backgroundColor: !activeBrand ? "rgba(202, 117, 67, 0.10)" : "transparent",
              }}
            >
              <span
                className="flex h-5 w-5 items-center justify-center rounded-md text-[10px] font-semibold flex-shrink-0"
                style={{ backgroundColor: "var(--admin-accent)", color: "white" }}
                aria-hidden="true"
              >
                *
              </span>
              <span className="flex-1">All brands</span>
              {!activeBrand && (
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: "var(--admin-accent)" }}
                  aria-hidden="true"
                />
              )}
            </button>
          )}

          {brands.map((b) => {
            const isActive = b.id === activeBrandId;
            return (
              <button
                key={b.id}
                type="button"
                role="option"
                aria-selected={isActive}
                onClick={() => selectBrand(b.id)}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors hover:bg-white/5"
                style={{
                  color: isActive ? "var(--admin-accent)" : "var(--admin-sidebar-text)",
                  backgroundColor: isActive ? "rgba(202, 117, 67, 0.10)" : "transparent",
                }}
              >
                <span
                  className="flex h-5 w-5 items-center justify-center rounded-md text-[10px] font-semibold flex-shrink-0"
                  style={{ backgroundColor: "var(--admin-accent)", color: "white" }}
                  aria-hidden="true"
                >
                  {b.name.charAt(0).toUpperCase()}
                </span>
                <span className="flex-1 truncate">{b.name}</span>
                {isActive && (
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: "var(--admin-accent)" }}
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
