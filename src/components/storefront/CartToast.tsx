"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";

export default function CartToast() {
  const { justAdded, dismissToast } = useCart();

  useEffect(() => {
    if (!justAdded) return;
    const timer = setTimeout(dismissToast, 4000);
    return () => clearTimeout(timer);
  }, [justAdded, dismissToast]);

  if (!justAdded) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm rounded-2xl bg-white p-5 shadow-2xl ring-1 ring-slate-200 pointer-events-auto">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-2xl">✅</span>
        <div className="flex-1">
          <p className="font-semibold text-slate-900">
            {justAdded.name}
          </p>
          <p className="mt-0.5 text-sm text-slate-600">
            {justAdded.fulfillment === "pickup" ? "📦 Pickup" : "🚚 Shipping"} ·{" "}
            Qty {justAdded.quantity}
          </p>
        </div>
        <button
          onClick={dismissToast}
          className="ml-2 text-slate-400 hover:text-slate-600 text-xl leading-none"
        >
          ×
        </button>
      </div>
      <div className="mt-4 flex gap-2">
        <Link
          href="/cart"
          onClick={dismissToast}
          className="flex-1 rounded-xl bg-slate-900 px-4 py-2 text-center text-sm font-medium text-white hover:bg-slate-800"
        >
          View Cart
        </Link>
        <button
          onClick={dismissToast}
          className="flex-1 rounded-xl border border-slate-300 px-4 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Continue Shopping
        </button>
      </div>
    </div>
  );
}
