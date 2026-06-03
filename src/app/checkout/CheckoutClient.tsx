"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { createRetailStripeCheckoutSession } from "@/actions/billing/retail-checkout";
import StorefrontHeader from "@/components/storefront/StorefrontHeader";
import StorefrontFooter from "@/components/storefront/StorefrontFooter";

type Stop = {
  id: string;
  city: string;
  state: string;
  date: string;
  location: string;
  brand_id: string;
};

export default function CheckoutClient() {
  const { cart, subtotal, selectedStop, setSelectedStop, clearCart, cartBrandId } = useCart();
  const router = useRouter();
  const [stops, setStops] = useState<Stop[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stable idempotency key per checkout session — survives retries
  const idempotencyKeyRef = useRef<string | null>(null);
  if (typeof window !== "undefined" && !idempotencyKeyRef.current) {
    idempotencyKeyRef.current = crypto.randomUUID();
  }

  useEffect(() => {
    if (!cartBrandId) return;
    fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/stops?active=eq.true&brand_id=eq.${cartBrandId}&select=id,city,state,date,location,brand_id&order=date`,
      {
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        },
      }
    )
      .then((r) => r.json())
      .then((data) => setStops(data ?? []))
      .catch(() => setStops([]));
  }, [cartBrandId]);

  const hasPickupItems = cart.some((i) => i.fulfillment === "pickup");
  const hasShedPickupItems = cart.some((i) => i.fulfillment === "pickup" && i.pickup_type === "shed");
  const hasStopPickupItems = cart.some((i) => i.fulfillment === "pickup" && i.pickup_type !== "shed");
  const hasShipItems = cart.some((i) => i.fulfillment === "ship");

  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (cart.length === 0) return;

    // Guard: if selected stop brand mismatches cart brand, block checkout
    if (selectedStop?.brand_id && cartBrandId && selectedStop.brand_id !== cartBrandId) {
      setSelectedStop(null);
      router.replace("/cart");
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const customerName = formData.get("customer_name") as string;
    const customerEmail = formData.get("customer_email") as string;
    const customerPhone = formData.get("customer_phone") as string;
    const stopId = (selectedStop?.id ?? formData.get("stop_id") as string | null) as string | null;

    // Shipping address for tax calculation (ship items only)
    let shippingAddress;
    if (hasShipItems) {
      const shippingPostal = formData.get("shipping_postal_code") as string;
      const shippingState = formData.get("shipping_state") as string;
      const shippingCity = formData.get("shipping_city") as string;
      if (shippingState) {
        shippingAddress = { state: shippingState, postal_code: shippingPostal, city: shippingCity };
      }
    }

    if (hasStopPickupItems && !stopId) {
      setError("Please select a pickup location.");
      setLoading(false);
      return;
    }

    const items = cart.map((item) => ({
      id: item.id,
      name: item.name,
      price: Number(item.price.replace("$", "")),
      quantity: item.quantity,
      fulfillment: item.fulfillment ?? "pickup",
    }));

    // Build return URLs for Stripe
    const siteUrl = typeof window !== "undefined" ? window.location.origin : "https://route-commerce-platform.vercel.app";
    const successUrl = `${siteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${siteUrl}/checkout?status=cancelled`;

    // Store customer info for order creation on success page
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem("pending_checkout", JSON.stringify({
        customerName,
        customerEmail,
        customerPhone,
        stopId,
        items: items.map((item) => ({ ...item, fulfillment: item.fulfillment as "pickup" | "ship" })),
        cartBrandId,
        shippingAddress,
        idempotencyKey: idempotencyKeyRef.current,
      }));
    }

    // Create Stripe Checkout session first
    const stripeResult = await createRetailStripeCheckoutSession(items, "", cartBrandId ?? "unknown", successUrl, cancelUrl);
    if (!stripeResult.success || !stripeResult.url) {
      setError(stripeResult.error ?? "Failed to initiate payment. Please try again.");
      setLoading(false);
      return;
    }

    // Redirect to Stripe Checkout
    window.location.href = stripeResult.url;
  }, [cart, selectedStop, cartBrandId, hasShipItems, hasStopPickupItems, router, setSelectedStop]);

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-stone-50">
        <StorefrontHeader brandName="Checkout" brandSlug="tuxedo" />
        <main className="px-6 py-12">
          <div className="mx-auto max-w-4xl">
            <h1 className="text-3xl font-bold text-stone-900">
              Your cart is empty
            </h1>
            <Link
              href="/"
              className="mt-4 inline-block text-stone-600 hover:text-stone-900"
            >
              ← Back to storefront
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-white to-emerald-50/30">
      <StorefrontHeader brandName="Checkout" brandSlug="tuxedo" />
      <main className="px-6 py-12">
        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-[1fr_400px]">
          <div>
            <h1 className="text-4xl font-bold text-slate-900">
              Checkout
            </h1>

            <p className="mt-3 text-slate-600">
              Complete your order details.
            </p>

            {/* Error alert */}
            {error && (
              <div className="mt-6 rounded-xl bg-red-50 border border-red-200 p-4 text-red-700 text-sm shadow-sm" role="alert">
                <div className="flex items-start gap-3">
                  <svg className="h-5 w-5 text-red-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{error}</span>
                </div>
              </div>
            )}

            {/* Loading indicator */}
            {loading && (
              <div className="mt-6 flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-200 p-4" role="status" aria-live="polite">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-300 border-t-emerald-600" aria-hidden="true" />
                <span className="text-sm text-emerald-700">Placing your order...</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-8 space-y-6">
              {/* Customer Information */}
              <fieldset className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 border border-slate-100">
                <legend className="text-xl font-bold text-slate-900">Customer Information</legend>

                <div className="mt-4 space-y-4">
                  <div>
                    <label htmlFor="customer_name" className="block text-sm font-medium text-slate-700">
                      Full Name <span className="text-red-500" aria-hidden="true">*</span>
                    </label>
                    <input
                      id="customer_name"
                      name="customer_name"
                      required
                      className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                      placeholder="Jane Smith"
                      aria-required="true"
                    />
                  </div>

                  <div>
                    <label htmlFor="customer_email" className="block text-sm font-medium text-slate-700">
                      Email <span className="text-slate-400 text-xs">(optional)</span>
                    </label>
                    <input
                      id="customer_email"
                      name="customer_email"
                      type="email"
                      autoComplete="email"
                      className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                      placeholder="jane@example.com"
                    />
                  </div>

                  <div>
                    <label htmlFor="customer_phone" className="block text-sm font-medium text-slate-700">
                      Phone <span className="text-slate-400 text-xs">(optional)</span>
                    </label>
                    <input
                      id="customer_phone"
                      name="customer_phone"
                      type="tel"
                      autoComplete="tel"
                      className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                      placeholder="(555) 555-5555"
                    />
                  </div>
                </div>
              </fieldset>

              {/* Shed Pickup */}
              {hasShedPickupItems && (
                <fieldset className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-emerald-200 border border-emerald-100">
                  <legend className="text-xl font-bold text-slate-900">Shed Pickup</legend>
                  <p className="mt-2 text-sm text-slate-600">
                    {cart.filter((i) => i.fulfillment === "pickup" && i.pickup_type === "shed").map((i) => i.description || i.name).join(", ")}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">Pickup location details are included in your order confirmation.</p>
                </fieldset>
              )}

              {/* Stop Pickup */}
              {hasStopPickupItems && (
                <fieldset className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 border border-slate-100">
                  <legend className="text-xl font-bold text-slate-900">
                    Pickup Location <span className="text-red-500" aria-hidden="true">*</span>
                  </legend>

                  {selectedStop ? (
                    <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                      <p className="font-medium text-emerald-900">
                        <svg className="inline h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                        {selectedStop.city}, {selectedStop.state}
                      </p>
                      <p className="mt-1 text-sm text-emerald-700">
                        {selectedStop.date} · {selectedStop.location}
                      </p>
                      <button
                        type="button"
                        onClick={() => setSelectedStop(null)}
                        className="mt-2 text-xs text-emerald-600 hover:text-emerald-800 underline transition-colors"
                        aria-label="Change pickup stop"
                      >
                        Change pickup stop
                      </button>
                    </div>
                  ) : (
                    <div className="mt-4">
                      <label htmlFor="stop_id" className="block text-sm font-medium text-slate-700 mb-2">
                        Select pickup stop <span className="text-red-500" aria-hidden="true">*</span>
                      </label>
                      <select
                        id="stop_id"
                        name="stop_id"
                        required
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all appearance-none bg-white"
                        aria-required="true"
                      >
                        <option value="">Select a stop...</option>
                        {stops.map((stop) => (
                          <option key={stop.id} value={stop.id}>
                            {stop.city}, {stop.state} — {stop.date} @ {stop.location}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </fieldset>
              )}

              {/* Shipping Address */}
              {hasShipItems && (
                <fieldset className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 border border-slate-100">
                  <legend className="text-xl font-bold text-slate-900">Shipping Address</legend>
                  <p className="mt-1 text-sm text-slate-500">
                    Enter your shipping details for delivery.
                  </p>

                  <div className="mt-4 space-y-4">
                    <div>
                      <label htmlFor="shipping_address" className="block text-sm font-medium text-slate-700">
                        Street Address
                      </label>
                      <input
                        id="shipping_address"
                        name="shipping_address"
                        autoComplete="street-address"
                        className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                        placeholder="123 Main St"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label htmlFor="shipping_city" className="block text-sm font-medium text-slate-700">
                          City
                        </label>
                        <input
                          id="shipping_city"
                          name="shipping_city"
                          autoComplete="address-level2"
                          className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                        />
                      </div>
                      <div>
                        <label htmlFor="shipping_state" className="block text-sm font-medium text-slate-700">
                          State
                        </label>
                        <input
                          id="shipping_state"
                          name="shipping_state"
                          autoComplete="address-level1"
                          maxLength={2}
                          className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all uppercase"
                          placeholder="NC"
                        />
                      </div>
                      <div>
                        <label htmlFor="shipping_postal_code" className="block text-sm font-medium text-slate-700">
                          ZIP Code
                        </label>
                        <input
                          id="shipping_postal_code"
                          name="shipping_postal_code"
                          autoComplete="postal-code"
                          className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                          placeholder="28147"
                        />
                      </div>
                    </div>
                  </div>
                </fieldset>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 px-6 py-4 text-lg font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/30 hover:-translate-y-0.5 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Redirecting to payment...
                  </>
                ) : (
                  <>
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Pay Now — ${subtotal.toFixed(2)}
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Order Summary */}
          <aside aria-label="Order summary">
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 border border-slate-100 sticky top-6">
              <h2 className="text-xl font-bold text-slate-900">
                Order Summary
              </h2>

              <div className="mt-4 space-y-3">
                {cart.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-slate-600">
                      {item.name} × {item.quantity}
                      {item.fulfillment === "ship" && (
                        <span className="ml-1 text-xs text-blue-500">(ship)</span>
                      )}
                    </span>
                    <span className="font-medium text-slate-900">
                      ${(Number(item.price.replace("$", "")) * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-4 border-t border-slate-200 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Subtotal</span>
                  <span className="text-slate-900">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Estimated Tax</span>
                  <span className="text-slate-900 text-xs italic">Calculated at payment</span>
                </div>
                <div className="flex justify-between text-xl font-bold text-slate-900 pt-2 border-t border-slate-200">
                  <span>Total</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Secure payment badge */}
              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>Secured by Stripe</span>
              </div>
            </div>
          </aside>
        </div>
      </main>

      <StorefrontFooter brandName="Tuxedo Corn" brandSlug="tuxedo" />
    </div>
  );
}