"use client";

import { useState } from "react";
import { updateBrandPlanTier } from "@/actions/billing/stripe-portal";

type Props = {
  currentTier: string;
  brandId: string;
  hasStripeCustomer: boolean;
};

const TIERS = [
  { value: "starter", label: "Starter", color: "bg-zinc-950 text-zinc-300" },
  { value: "farm", label: "Farm", color: "bg-blue-900/40 text-blue-700" },
  { value: "enterprise", label: "Enterprise", color: "bg-violet-100 text-violet-700" },
];

export default function BillingClient({ currentTier, brandId }: Props) {
  const [selectedTier, setSelectedTier] = useState(currentTier);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSaveTier() {
    if (selectedTier === currentTier) return;
    setSaving(true);
    setError(null);
    const result = await updateBrandPlanTier(brandId, selectedTier);
    setSaving(false);
    if (result.success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      window.location.reload();
    } else {
      setError(result.error ?? "Failed to update plan");
    }
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={selectedTier}
        onChange={(e) => setSelectedTier(e.target.value)}
        className="rounded-xl border border-zinc-600 bg-zinc-900 px-3 sm:px-4 py-3 sm:py-2 text-sm outline-none focus:border-blue-500 min-h-[44px]"
      >
        {TIERS.map((t) => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>
      <button
        onClick={handleSaveTier}
        disabled={saving || selectedTier === currentTier}
        className="rounded-xl bg-slate-900 px-4 sm:px-5 py-3 sm:py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 active:scale-95 transition-all min-h-[44px]"
      >
        {saving ? "Saving..." : saved ? "Saved!" : "Save Tier"}
      </button>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}