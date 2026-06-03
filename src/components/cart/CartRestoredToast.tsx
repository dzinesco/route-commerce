"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";
import { useCart } from "@/context/CartContext";

export default function CartRestoredToast() {
  const { cartRestored, dismissRestoredToast } = useCart();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (cartRestored) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        dismissRestoredToast();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [cartRestored, dismissRestoredToast]);

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-6 right-6 z-50 animate-slide-up"
      onClick={() => { setVisible(false); dismissRestoredToast(); }}
    >
      <div className="flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 px-5 py-3.5 shadow-lg cursor-pointer hover:bg-green-100 transition-colors">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
          <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-green-800">Cart restored</p>
          <p className="text-xs text-green-600">Your previous cart has been restored.</p>
        </div>
      </div>
    </div>
  );
}