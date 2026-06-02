"use client";

import { useState } from "react";
import { createPlanUpgradeCheckout } from "@/actions/billing/stripe-checkout";

type Props = {
  brandId: string;
  targetTier: string;
  currentTier: string;
};

const TIER_ORDER = ["starter", "farm", "enterprise"];

export default function PlanUpgradeButton({ brandId, targetTier, currentTier }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentIndex = TIER_ORDER.indexOf(currentTier);
  const targetIndex = TIER_ORDER.indexOf(targetTier);
  const isDowngrade = targetIndex < currentIndex;
  const isCurrent = targetTier === currentTier;

  async function handleClick() {
    if (isCurrent || isDowngrade) return;
    setLoading(true);
    setError(null);
    const result = await createPlanUpgradeCheckout(brandId, targetTier);
    setLoading(false);
    if (result.success && result.url) {
      window.location.href = result.url;
    } else {
      setError(result.error ?? "Failed to start upgrade");
    }
  }

  if (isCurrent) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--admin-success)]/10 px-4 py-2 text-sm font-medium text-[var(--admin-success)]">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
        Current Plan
      </span>
    );
  }

  if (isDowngrade) {
    return (
      <a
        href="mailto:team@cielohermosa.com?subject=Downgrade+Request"
        className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--admin-border)] bg-white px-4 py-2 text-sm font-medium text-[var(--admin-text-muted)] hover:bg-[var(--admin-bg)] transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15m0 0l6.75 6.75M4.5 12l6.75-6.75" />
        </svg>
        Downgrade
      </a>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={handleClick}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-xl bg-[var(--admin-accent)] px-4 py-2 text-sm font-bold text-white hover:bg-[var(--admin-accent-hover)] disabled:opacity-50 transition-colors"
      >
        {loading ? (
          <>
            <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            Redirecting...
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
            </svg>
            Upgrade
          </>
        )}
      </button>
      {error && (
        <span className="text-xs text-[var(--admin-danger)]">{error}</span>
      )}
    </div>
  );
}