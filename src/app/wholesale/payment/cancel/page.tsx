"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function PaymentCancelPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-100 to-stone-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-3 border-stone-300 border-t-stone-600 animate-spin mx-auto mb-4" />
          <p className="text-stone-500">Processing...</p>
        </div>
      </div>
    }>
      <PaymentCancelContent />
    </Suspense>
  );
}

function PaymentCancelContent() {
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason");
  const sessionId = searchParams.get("session_id");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-stone-50 flex items-center justify-center px-4 py-8">
      <div className="bg-white rounded-3xl shadow-xl ring-1 ring-slate-200 p-8 sm:p-10 max-w-md w-full text-center">
        {/* Cancel icon */}
        <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">
          Payment Cancelled
        </h1>

        <div className="bg-stone-50 rounded-xl px-4 py-3 mb-6">
          <p className="text-sm text-stone-600 font-medium">
            No charges were made
          </p>
          <p className="text-xs text-stone-500 mt-1">
            Your order is still pending and you can return to complete payment anytime.
          </p>
        </div>

        {sessionId && (
          <p className="text-xs text-slate-400 mb-4 font-mono">
            Session: {sessionId.slice(0, 20)}...
          </p>
        )}

        {reason && (
          <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mb-6">
            {reason === "aborted" ? "Payment was aborted by user." : reason}
          </p>
        )}

        <div className="space-y-3">
          <Link
            href="/wholesale/portal?tab=orders"
            className="flex items-center justify-center gap-2 w-full rounded-xl bg-slate-800 py-3.5 text-sm font-bold text-white hover:bg-slate-700 active:bg-slate-800 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
            </svg>
            Back to Orders
          </Link>
          <Link
            href="/wholesale/portal?tab=cart"
            className="flex items-center justify-center gap-2 w-full rounded-xl border border-slate-300 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
            </svg>
            Return to Cart
          </Link>
          <Link
            href="/wholesale/portal?tab=products"
            className="flex items-center justify-center gap-2 w-full rounded-xl bg-stone-100 py-3 text-sm font-semibold text-stone-600 hover:bg-stone-200 active:bg-stone-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
            </svg>
            Browse Products
          </Link>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100">
          <p className="text-xs text-stone-400">
            Need help?{" "}
            <Link href="/wholesale/login" className="text-slate-500 hover:text-slate-700 hover:underline">
              Contact support
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}