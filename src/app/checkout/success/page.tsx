"use client";

import { useEffect, Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createOrder } from "@/actions/checkout";

type OrderItem = {
  product_id: string;
  product_name: string;
  quantity: number;
  price: number;
  fulfillment: string;
};

type StoredOrder = {
  id: string;
  customer_name: string;
  customer_email: string;
  subtotal: number;
  status: string;
  stop_city: string;
  stop_state: string;
  stop_date: string;
  stop_time: string | null;
  stop_location: string;
  items: OrderItem[];
};

function shortId(id: string) {
  return id.slice(0, 8).toUpperCase();
}

function formatStopDate(dateStr: string): string {
  try {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("session_id");
  const orderIdParam = searchParams.get("order_id");
  const [order, setOrder] = useState<StoredOrder | null>(null);
  const [creating, setCreating] = useState(!!sessionId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (orderIdParam && !sessionId) {
      // Direct access with order_id — load from sessionStorage
      const stored = sessionStorage.getItem(`order_${orderIdParam}`);
      if (stored) {
        try {
          setOrder(JSON.parse(stored) as StoredOrder);
        } catch {
          // ignore
        }
      }
    }
  }, [orderIdParam, sessionId]);

  // Stripe redirected back — create order from pending checkout data
  useEffect(() => {
    if (!sessionId) return;

    const pendingStr = sessionStorage.getItem("pending_checkout");
    if (!pendingStr) {
      setError("No pending order found. Please start checkout again.");
      setCreating(false);
      return;
    }

    let pending: {
      customerName: string;
      customerEmail: string;
      customerPhone: string;
      stopId: string | null;
      items: Array<{ id: string; name: string; price: number; quantity: number; fulfillment: "pickup" | "ship" }>;
      cartBrandId?: string;
      shippingAddress?: { state: string; postal_code: string; city?: string };
      idempotencyKey: string;
    };
    try {
      pending = JSON.parse(pendingStr);
    } catch {
      setError("Failed to read checkout data. Please start again.");
      setCreating(false);
      return;
    }

    createOrder(
      pending.idempotencyKey,
      pending.customerName,
      pending.customerEmail,
      pending.customerPhone,
      pending.stopId,
      pending.items,
      pending.cartBrandId,
      pending.shippingAddress
    )
      .then((result) => {
        if (!result.success) {
          setError(result.error ?? "Failed to create order");
          setCreating(false);
          return;
        }
        sessionStorage.setItem(`order_${result.order.id}`, JSON.stringify(result.order));
        sessionStorage.removeItem("pending_checkout");
        sessionStorage.removeItem("cart");
        setOrder(result.order);
        setCreating(false);
      })
      .catch(() => {
        setError("Failed to create order. Please contact support.");
        setCreating(false);
      });
  }, [sessionId]);

  if (!order || !orderIdParam) {
    return (
      <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200 text-center">
        {creating ? (
          <>
            <div className="h-12 w-12 mx-auto rounded-full border-4 border-slate-200 border-t-slate-900 animate-spin" />
            <p className="mt-4 text-slate-600">Confirming your payment and creating order...</p>
          </>
        ) : error ? (
          <>
            <p className="text-red-600 font-medium">{error}</p>
            <Link href="/" className="mt-4 inline-block text-stone-600 hover:text-slate-900">
              ← Back to Storefront
            </Link>
          </>
        ) : (
          <>
            <p className="text-slate-500">Order not found</p>
            <Link href="/" className="mt-4 inline-block text-stone-600 hover:text-slate-900">
              ← Back to Storefront
            </Link>
          </>
        )}
      </div>
    );
  }

  const pickupItems = order.items.filter((i) => i.fulfillment === "pickup");
  const shipItems = order.items.filter((i) => i.fulfillment === "ship");
  const hasPickup = pickupItems.length > 0;
  const hasShip = shipItems.length > 0;
  const isMixed = hasPickup && hasShip;

  const stopLabel = [order.stop_city, order.stop_state].filter(Boolean).join(", ");

  return (
    <div className="mx-auto max-w-2xl">
      {/* Header */}
      <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-stone-200 text-center">
        <svg className="mx-auto h-12 w-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h1 className="mt-6 text-3xl font-bold text-stone-900">
          {hasPickup ? "Your pickup order has been placed!" : "Your order has been placed!"}
        </h1>
        <p className="mt-2 text-base text-stone-500">
          Order #{shortId(order.id)} · {order.customer_name}
        </p>
      </div>

      {/* Pickup details */}
      {hasPickup && (
        <div className="mt-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-stone-200">
          <h2 className="text-lg font-bold text-stone-900 mb-1">
            <svg className="inline h-5 w-5 mr-1.5 text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
            Pickup Details
          </h2>
          {stopLabel && (
            <p className="font-semibold text-stone-800">{stopLabel}</p>
          )}
          {order.stop_date && (
            <p className="mt-1 text-stone-600 text-stone-500">
              {formatStopDate(order.stop_date)}
              {order.stop_time ? ` · ${order.stop_time}` : ""}
            </p>
          )}
          {order.stop_location && (
            <p className="mt-1 text-sm text-stone-500">{order.stop_location}</p>
          )}
          {isMixed && (
            <p className="mt-3 text-sm text-stone-500 italic">
              See pickup items in the list below.
            </p>
          )}
          {!isMixed && (
            <p className="mt-3 text-sm text-stone-500">
              Bring your order number or name when you pick up.
            </p>
          )}
        </div>
      )}

      {/* Shipping details */}
      {hasShip && (
        <div className="mt-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-stone-200">
          <h2 className="text-lg font-bold text-stone-900 mb-1">
            <svg className="inline h-5 w-5 mr-1.5 text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
            Shipping
          </h2>
          <p className="text-sm text-stone-500">
            Tracking information will be sent when your order ships.
          </p>
        </div>
      )}

      {/* Order items */}
      <div className="mt-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-stone-200">
        <h2 className="text-lg font-bold text-stone-900 mb-4">Order Summary</h2>

        {isMixed && hasPickup && (
          <div className="mb-4">
            <p className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-2">Pickup Items</p>
            <ul className="space-y-2">
              {pickupItems.map((item, i) => (
                <li key={i} className="flex justify-between text-sm">
                  <span className="text-stone-700">
                    {item.quantity > 1 && (
                      <span className="font-semibold">{item.quantity}× </span>
                    )}
                    {item.product_name}
                  </span>
                  <span className="text-stone-500">
                    ${(item.price * item.quantity).toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {isMixed && hasShip && (
          <div className="mb-4 border-t border-stone-200 pt-4">
            <p className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-2">Shipping Items</p>
            <ul className="space-y-2">
              {shipItems.map((item, i) => (
                <li key={i} className="flex justify-between text-sm">
                  <span className="text-stone-700">
                    {item.quantity > 1 && (
                      <span className="font-semibold">{item.quantity}× </span>
                    )}
                    {item.product_name}
                  </span>
                  <span className="text-stone-500">
                    ${(item.price * item.quantity).toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {!isMixed && (
          <ul className="space-y-2">
            {order.items.map((item, i) => (
              <li key={i} className="flex justify-between text-sm">
                <span className="text-stone-700">
                  {item.quantity > 1 && (
                    <span className="font-semibold">{item.quantity}× </span>
                  )}
                  {item.product_name}
                </span>
                <span className="text-stone-500">
                  ${(item.price * item.quantity).toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 border-t border-slate-200 border-stone-200 pt-4 flex justify-between font-bold text-stone-900">
          <span>Total</span>
          <span>${order.subtotal.toFixed(2)}</span>
        </div>
      </div>

      {/* Back link */}
      <div className="mt-6 text-center">
        <Link
          href="/"
          className="rounded-xl bg-slate-900 bg-stone-800 px-6 py-3 font-medium text-white text-stone-800 hover:bg-slate-800 dark:hover:bg-slate-700"
        >
          Back to Storefront
        </Link>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <main className="min-h-screen bg-stone-50 px-6 py-12">
      <Suspense fallback={<div className="text-center text-stone-500">Loading...</div>}>
        <SuccessContent />
      </Suspense>
    </main>
  );
}