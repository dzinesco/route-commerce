"use client";

import { useState } from "react";
import { cancelAddonSubscription } from "@/actions/billing/stripe-checkout";

type Props = {
  brandId: string;
  addonKey: string;
  onRemoved: () => void;
};

export default function RemoveAddonButton({ brandId, addonKey, onRemoved }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleRemove() {
    if (!confirm("Remove this add-on? It will cancel the associated Stripe subscription.")) return;
    setLoading(true);
    const result = await cancelAddonSubscription(brandId, addonKey);
    setLoading(false);
    if (result.success) {
      onRemoved();
    } else {
      alert(result.error ?? "Failed to remove add-on");
    }
  }

  return (
    <button
      onClick={handleRemove}
      disabled={loading}
      className="text-xs text-red-500 hover:underline disabled:opacity-50"
    >
      {loading ? "Removing..." : "Remove"}
    </button>
  );
}