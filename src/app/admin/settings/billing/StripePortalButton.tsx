"use client";

import { useState } from "react";
import { getStripeBillingPortalUrl } from "@/actions/billing/stripe-portal";

type Props = {
  brandId: string;
  variant?: "primary" | "secondary";
  label?: string;
};

export default function StripePortalButton({ brandId, variant = "secondary", label = "Manage in Stripe Portal →" }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    const result = await getStripeBillingPortalUrl(brandId);
    setLoading(false);
    if (result.success && result.url) {
      window.location.href = result.url;
    } else {
      alert(result.error ?? "Failed to open billing portal");
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`w-full rounded-xl py-3 text-sm font-medium transition-colors ${
        variant === "primary"
          ? "bg-slate-900 text-white hover:bg-slate-800"
          : "border border-zinc-600 text-zinc-300 hover:bg-zinc-800"
      } disabled:opacity-50`}
    >
      {loading ? "Opening..." : label}
    </button>
  );
}