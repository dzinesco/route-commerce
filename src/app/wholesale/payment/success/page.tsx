"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-100 to-stone-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-3 border-stone-300 border-t-stone-600 animate-spin mx-auto mb-4" />
          <p className="text-stone-500">Processing payment...</p>
        </div>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [showContent, setShowContent] = useState(false);
  const [successStep, setSuccessStep] = useState(0);

  useEffect(() => {
    // Stagger the animation
    const timer1 = setTimeout(() => setShowContent(true), 200);
    const timer2 = setTimeout(() => setSuccessStep(1), 500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-stone-50 flex items-center justify-center px-4 py-8">
      <div
        className={`bg-white rounded-3xl shadow-xl ring-1 ring-slate-200 p-8 sm:p-10 max-w-md w-full text-center transition-all duration-500 ${
          showContent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}
      >
        {/* Success animation */}
        <div
          className={`relative w-20 h-20 mx-auto mb-6 transition-all duration-500 ${
            successStep >= 1 ? "scale-100" : "scale-50"
          }`}
        >
          <div className={`absolute inset-0 rounded-full bg-green-100 transition-all duration-500 ${successStep >= 1 ? "opacity-100 scale-100" : "opacity-0 scale-50"}`} />
          <div className="absolute inset-0 flex items-center justify-center">
            <svg
              className={`w-10 h-10 text-green-600 transition-all duration-300 ${
                successStep >= 1 ? "opacity-100 scale-100" : "opacity-0 scale-50"
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          {/* Ripple effect */}
          <div className="absolute inset-0 rounded-full border-2 border-green-400 animate-ping opacity-20" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">
          Payment Successful
        </h1>

        <div className="bg-green-50 rounded-xl px-4 py-3 mb-6">
          <p className="text-sm text-green-700 font-medium">
            Your payment has been received
          </p>
          <p className="text-xs text-green-600 mt-1">
            Your order will be updated shortly. A confirmation email will be sent once your payment is processed.
          </p>
        </div>

        {sessionId && (
          <p className="text-xs text-slate-400 mb-6 font-mono">
            Reference: {sessionId.slice(0, 20)}...
          </p>
        )}

        <div className="space-y-3">
          <Link
            href="/wholesale/portal?tab=orders"
            className="flex items-center justify-center gap-2 w-full rounded-xl bg-green-600 py-3.5 text-sm font-bold text-white hover:bg-green-700 active:bg-green-800 transition-colors shadow-lg shadow-green-900/20"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
            </svg>
            View My Orders
          </Link>
          <Link
            href="/wholesale/portal?tab=products"
            className="flex items-center justify-center gap-2 w-full rounded-xl border border-slate-300 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
            </svg>
            Continue Shopping
          </Link>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100">
          <Link
            href="/wholesale/portal"
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors inline-flex items-center gap-1"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
            </svg>
            Back to Portal
          </Link>
        </div>
      </div>
    </div>
  );
}
