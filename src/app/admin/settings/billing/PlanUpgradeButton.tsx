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
  const currentIndex = TIER_ORDER.indexOf(currentTier);
  const targetIndex = TIER_ORDER.indexOf(targetTier);
  const isDowngrade = targetIndex < currentIndex;
  const isCurrent = targetTier === currentTier;

  async function handleClick() {
    if (isCurrent || isDowngrade) return;
    setLoading(true);
    const result = await createPlanUpgradeCheckout(brandId, targetTier);
    setLoading(false);
    if (result.success && result.url) {
      window.location.href = result.url;
    } else {
      alert(result.error ?? "Failed to start upgrade");
    }
  }

  if (isCurrent) {
    return (
      <span className="inline-block rounded-xl bg-green-900/40 px-4 py-2 text-sm font-medium text-green-400">
        Current Plan
      </span>
    );
  }

  if (isDowngrade) {
    return (
      <a
        href="mailto:team@cielohermosa.com?subject=Downgrade+Request"
        className="inline-block rounded-xl border border-zinc-600 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-500 hover:bg-zinc-800"
      >
        Downgrade
      </a>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="inline-block rounded-xl bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-50"
    >
      {loading ? "Redirecting..." : "Upgrade"}
    </button>
  );
}