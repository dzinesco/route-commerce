"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { markPickupComplete } from "@/actions/pickup";

type OrderPickupActionProps = {
  orderId: string;
  brandId: string | null;
  currentlyPickedUp: boolean;
};

export default function OrderPickupAction({
  orderId,
  brandId,
  currentlyPickedUp,
}: OrderPickupActionProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleMarkPickup() {
    if (currentlyPickedUp) return;
    setLoading(true);
    const result = await markPickupComplete(orderId, brandId);
    setLoading(false);
    if (result.success) {
      setDone(true);
      router.refresh();
    }
  }

  if (currentlyPickedUp || done) {
    return null;
  }

  return (
    <button
      onClick={handleMarkPickup}
      disabled={loading}
      className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
    >
      {loading ? "Marking..." : "✓ Mark Picked Up"}
    </button>
  );
}