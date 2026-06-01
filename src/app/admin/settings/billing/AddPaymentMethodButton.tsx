"use client";

import { useState } from "react";
import { createAddonCheckoutSession } from "@/actions/billing/stripe-checkout";

type Props = {
  brandId: string;
};

export default function AddPaymentMethodButton({ brandId }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    // For adding a new payment method, we use the Stripe portal
    const { getStripeBillingPortalUrl } = await import("@/actions/billing/stripe-portal");
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
      className="w-full rounded-xl bg-slate-900 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50"
    >
      {loading ? "Opening..." : "Add Payment Method"}
    </button>
  );
}