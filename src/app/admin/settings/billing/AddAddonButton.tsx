"use client";

import { useState } from "react";
import { createAddonCheckoutSession } from "@/actions/billing/stripe-checkout";

type Props = {
  brandId: string;
  addonKey: string;
};

export default function AddAddonButton({ brandId, addonKey }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    const result = await createAddonCheckoutSession(brandId, addonKey);
    setLoading(false);
    if (result.success && result.url) {
      window.location.href = result.url;
    } else {
      setError(result.error ?? "Failed to start checkout");
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleClick}
        disabled={loading}
        className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--admin-accent)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--admin-accent)] hover:bg-[var(--admin-accent-light)] transition-colors disabled:opacity-50"
      >
        {loading ? (
          <>
            <span className="h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
            Loading...
          </>
        ) : (
          <>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add
          </>
        )}
      </button>
      {error && (
        <span className="text-xs text-[var(--admin-danger)]">{error}</span>
      )}
    </div>
  );
}