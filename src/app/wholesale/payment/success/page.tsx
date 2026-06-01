"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { enqueueWholesaleNotification } from "@/actions/wholesale";

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <p className="text-slate-500">Loading...</p>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [loading, setLoading] = useState(true);
  const [notified, setNotified] = useState(false);

  useEffect(() => {
    setLoading(false);
  }, []);

  // After render, enqueue deposit received notification
  // We don't have order details here (webhook handled the DB update),
  // so we defer to the admin fulfill notification for now.
  // The webhook already processed the payment — a follow-up cron can
  // detect deposit_paid increases and send the deposit notification.

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 p-8 max-w-md w-full text-center">
        {loading ? (
          <p className="text-slate-500">Confirming payment...</p>
        ) : (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Payment Successful</h1>
            <p className="text-sm text-slate-500 mb-6">
              Your payment has been received. Your order will be updated shortly.
              {sessionId && <span className="block mt-1 text-xs text-slate-400">Session: {sessionId.slice(0, 20)}...</span>}
            </p>
            <div className="space-y-3">
              <Link
                href="/wholesale/portal?tab=orders"
                className="block w-full rounded-xl bg-green-600 py-3 text-sm font-bold text-white hover:bg-green-700"
              >
                View Orders
              </Link>
              <Link
                href="/wholesale/portal?tab=products"
                className="block w-full rounded-xl border border-slate-300 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Continue Shopping
              </Link>
            </div>
            <p className="mt-4 text-xs text-slate-400">
              A confirmation email will be sent once your payment is processed.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
