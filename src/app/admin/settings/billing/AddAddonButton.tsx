"use client";

import { useState } from "react";
import { createAddonCheckoutSession } from "@/actions/billing/stripe-checkout";

type Props = {
  brandId: string;
  addonKey: string;
};

export default function AddAddonButton({ brandId, addonKey }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    const result = await createAddonCheckoutSession(brandId, addonKey);
    setLoading(false);
    if (result.success && result.url) {
      window.location.href = result.url;
    } else {
      alert(result.error ?? "Failed to start add-on checkout");
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:bg-zinc-800 disabled:opacity-50"
    >
      {loading ? "..." : "+ Add"}
    </button>
  );
}