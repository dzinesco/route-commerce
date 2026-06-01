"use client";

import { useState } from "react";
import { markPickupComplete } from "@/actions/pickup";

type Props = {
  orderId: string;
  brandId: string | null;
  currentlyPickedUp: boolean;
};

export default function OrderPickupAction({
  orderId,
  brandId,
  currentlyPickedUp,
}: Props) {
  const [pickingUp, setPickingUp] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  async function handlePickup() {
    setPickingUp(true);
    const result = await markPickupComplete(orderId, brandId);
    setPickingUp(false);
    if (result.success) {
      setToast({ type: "success", msg: "Order marked as picked up." });
      setTimeout(() => window.location.reload(), 1200);
    } else {
      setToast({ type: "error", msg: result.error ?? "Failed to mark picked up." });
    }
  }

  if (currentlyPickedUp) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-700">
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        Picked Up
      </span>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        onClick={handlePickup}
        disabled={pickingUp}
        className="rounded-xl bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
      >
        {pickingUp ? "Marking..." : "Mark Picked Up"}
      </button>
      {toast && (
        <div
          className={`rounded-lg px-3 py-2 text-sm font-medium ${
            toast.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}