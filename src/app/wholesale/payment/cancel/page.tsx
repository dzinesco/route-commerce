"use client";

import Link from "next/link";

export default function PaymentCancelPage() {
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Payment Cancelled</h1>
        <p className="text-sm text-slate-500 mb-6">
          Your payment was not completed. No charges have been made.
        </p>
        <div className="space-y-3">
          <Link
            href="/wholesale/portal?tab=orders"
            className="block w-full rounded-xl bg-slate-800 py-3 text-sm font-bold text-white hover:bg-slate-700"
          >
            Back to Orders
          </Link>
          <Link
            href="/wholesale/portal?tab=products"
            className="block w-full rounded-xl border border-slate-300 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
