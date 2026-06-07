"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import type { StopInfo } from "@/context/CartContext";
import { createRetailStripeCheckoutSession } from "@/actions/billing/retail-checkout";
import { getPublicStopsForBrand } from "@/actions/checkout";
import StorefrontHeader from "@/components/storefront/StorefrontHeader";
import StorefrontFooter from "@/components/storefront/StorefrontFooter";
import StripeExpressCheckout, {
  type CheckoutItem as ExpressItem,
} from "@/components/storefront/StripeExpressCheckout";

export default function CheckoutClient() {
  const cartContext = useCart();
  const cart = cartContext.cart;
  const subtotal = cartContext.subtotal;
  const selectedStop: StopInfo | null = cartContext.selectedStop;
  const setSelectedStop = cartContext.setSelectedStop;
  const cartBrandId = cartContext.cartBrandId;
  const router = useRouter();
  const [stops, setStops] = useState<StopInfo[]>([]);

  // Controlled form state — passed down to StripeExpressCheckout so the
  // Express + Card paths know who the buyer is and where to ship / pick up.
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [shippingState, setShippingState] = useState("");
  const [shippingPostal, setShippingPostal] = useState("");
  const [shippingCity, setShippingCity] = useState("");

  // Hosted-checkout (legacy Stripe Checkout) fallback state
  const [hostedLoading, setHostedLoading] = useState(false);
  const [hostedError, setHostedError] = useState<string | null>(null);

  // Stable idempotency key per checkout session — survives retries
  const idempotencyKeyRef = useRef<string | null>(null);
  if (typeof window !== "undefined" && !idempotencyKeyRef.current) {
    idempotencyKeyRef.current = crypto.randomUUID();
  }

  useEffect(() => {
    if (!cartBrandId) return;
    getPublicStopsForBrand(cartBrandId)
      .then((data) => setStops(data ?? []))
      .catch(() => setStops([]));
  }, [cartBrandId]);

  const hasPickupItems = cart.some((i) => i.fulfillment === "pickup");
  const hasShedPickupItems = cart.some((i) => i.fulfillment === "pickup" && i.pickup_type === "shed");
  const hasStopPickupItems = cart.some(
    (i) => i.fulfillment === "pickup" && i.pickup_type !== "shed"
  );
  const hasShipItems = cart.some((i) => i.fulfillment === "ship");

  /**
   * Legacy "Use secure hosted checkout" fallback. Creates a Stripe
   * Checkout Session and redirects — this is the path used when the
   * embedded Stripe Elements can't load (no publishable key, browser
   * incompatibility, etc.) or when the buyer prefers Stripe's hosted page.
   */
  const handleHostedCheckout = useCallback(async () => {
    if (cart.length === 0) return;

    if (selectedStop?.brand_id && cartBrandId && selectedStop.brand_id !== cartBrandId) {
      setSelectedStop(null);
      router.replace("/cart");
      return;
    }

    if (!customerEmail.trim()) {
      setHostedError("Please enter your email before continuing to checkout.");
      return;
    }
    if (hasStopPickupItems && !selectedStop) {
      setHostedError("Please select a pickup location.");
      return;
    }

    setHostedLoading(true);
    setHostedError(null);

    const items = cart.map((item) => ({
      id: item.id,
      name: item.name,
      price: Number(item.price.replace("$", "")),
      quantity: item.quantity,
      fulfillment: item.fulfillment ?? "pickup",
    }));

    const siteUrl =
      typeof window !== "undefined" ? window.location.origin : "https://route-commerce-platform.vercel.app";
    const successUrl = `${siteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${siteUrl}/checkout?status=cancelled`;

    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem(
        "pending_checkout",
        JSON.stringify({
          customerName,
          customerEmail,
          customerPhone,
          stopId: selectedStop?.id ?? null,
          items: items.map((item) => ({
            ...item,
            fulfillment: item.fulfillment as "pickup" | "ship",
          })),
          cartBrandId,
          shippingAddress: hasShipItems
            ? { state: shippingState, postal_code: shippingPostal, city: shippingCity }
            : undefined,
          idempotencyKey: idempotencyKeyRef.current,
        })
      );
    }

    const stripeResult = await createRetailStripeCheckoutSession(
      items,
      "",
      cartBrandId ?? "unknown",
      successUrl,
      cancelUrl
    );
    if (!stripeResult.success || !stripeResult.url) {
      setHostedError(stripeResult.error ?? "Failed to initiate payment. Please try again.");
      setHostedLoading(false);
      return;
    }

    window.location.href = stripeResult.url;
  }, [
    cart,
    customerName,
    customerEmail,
    customerPhone,
    selectedStop,
    shippingState,
    shippingPostal,
    shippingCity,
    cartBrandId,
    hasShipItems,
    hasStopPickupItems,
    router,
    setSelectedStop,
  ]);

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-stone-50">
        <StorefrontHeader brandName="Checkout" brandSlug="tuxedo" />
        <main className="px-6 py-12">
          <div className="mx-auto max-w-4xl">
            <h1 className="text-3xl font-bold text-stone-900">Your cart is empty</h1>
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

  // Map cart → StripeExpressCheckout item shape
  const expressItems: ExpressItem[] = cart.map((item) => ({
    id: item.id,
    name: item.name,
    price: item.price,
    quantity: item.quantity,
    fulfillment: (item.fulfillment ?? "pickup") as "pickup" | "ship",
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-white to-emerald-50/30">
      <StorefrontHeader brandName="Checkout" brandSlug="tuxedo" />
      <main className="px-6 py-12">
        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-[1fr_400px]">
          {/* LEFT — Form + Embedded Stripe Elements */}
          <div>
            <h1 className="text-4xl font-bold text-slate-900">Checkout</h1>
            <p className="mt-3 text-slate-600">
              Tap to pay with Apple Pay, Google Pay, or card. Your details stay secure — we never see them.
            </p>

            {/* Error alert (shared across both payment paths) */}
            {(hostedError) && (
              <div className="mt-6 rounded-xl bg-red-50 border border-red-200 p-4 text-red-700 text-sm shadow-sm" role="alert">
                <div className="flex items-start gap-3">
                  <svg className="h-5 w-5 text-red-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{hostedError}</span>
                </div>
              </div>
            )}

            <div className="mt-8 space-y-6">
              {/* Customer Information — controlled inputs feed the embedded
                  Stripe Elements above. The wallet (Apple Pay) will overwrite
                  name/email at confirm time, but we still collect them here
                  so the order row has them in case the wallet omits them. */}
              <fieldset className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 border border-slate-100">
                <legend className="text-xl font-bold text-slate-900">Your details</legend>
                <p className="mt-1 text-xs text-slate-500">
                  Used for the order confirmation. Apple Pay / Google Pay will fill these in for you.
                </p>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label htmlFor="customer_name" className="block text-sm font-medium text-slate-700">
                      Full Name
                    </label>
                    <input
                      id="customer_name"
                      name="customer_name"
                      autoComplete="name"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                      placeholder="Jane Smith"
                    />
                  </div>

                  <div>
                    <label htmlFor="customer_email" className="block text-sm font-medium text-slate-700">
                      Email <span className="text-red-500" aria-hidden="true">*</span>
                    </label>
                    <input
                      id="customer_email"
                      name="customer_email"
                      type="email"
                      autoComplete="email"
                      required
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                      placeholder="jane@example.com"
                      aria-required="true"
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
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                      placeholder="(555) 555-5555"
                    />
                  </div>
                </div>
              </fieldset>

              {/* Shed Pickup notice */}
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
                        value={(selectedStop as StopInfo | null)?.id ?? ""}
                        onChange={(e) => {
                          const found = stops.find((s) => s.id === e.target.value) ?? null;
                          setSelectedStop(found as StopInfo | null);
                        }}
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

                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-3">
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
                    <div>
                      <label htmlFor="shipping_city" className="block text-sm font-medium text-slate-700">
                        City
                      </label>
                      <input
                        id="shipping_city"
                        name="shipping_city"
                        autoComplete="address-level2"
                        value={shippingCity}
                        onChange={(e) => setShippingCity(e.target.value)}
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
                        value={shippingState}
                        onChange={(e) => setShippingState(e.target.value.toUpperCase())}
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
                        value={shippingPostal}
                        onChange={(e) => setShippingPostal(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                        placeholder="28147"
                      />
                    </div>
                  </div>
                </fieldset>
              )}

              {/* Embedded Stripe Elements (Express + Card) — real checkout */}
              <div data-testid="stripe-express-checkout">
                <StripeExpressCheckout
                  items={expressItems}
                  brandId={cartBrandId}
                  customerName={customerName}
                  customerEmail={customerEmail}
                  customerPhone={customerPhone}
                  selectedStop={selectedStop as StopInfo | null}
                  shippingState={shippingState}
                  shippingPostal={shippingPostal}
                  shippingCity={shippingCity}
                  checkoutSessionKey={idempotencyKeyRef.current ?? undefined}
                  onHostedCheckout={() => void handleHostedCheckout()}
                />
              </div>

              {/* Hosted-checkout fallback (legacy Stripe Checkout) */}
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-4">
                <p className="text-xs text-slate-500 mb-2 text-center">
                  Prefer Stripe’s hosted page? Tap below.
                </p>
                <button
                  type="button"
                  onClick={() => void handleHostedCheckout()}
                  disabled={hostedLoading}
                  className="w-full rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {hostedLoading ? (
                    <>
                      <span className="h-4 w-4 rounded-full border-2 border-slate-300 border-t-slate-700 animate-spin" />
                      Redirecting to Stripe…
                    </>
                  ) : (
                    <>Use secure hosted checkout →</>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <aside aria-label="Order summary">
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 border border-slate-100 sticky top-6">
              <h2 className="text-xl font-bold text-slate-900">Order Summary</h2>

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

              {/* Trust badges */}
              <div className="mt-4 space-y-1.5">
                <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span>Secured by Stripe</span>
                </div>
                <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span>100% Sweetness Guarantee</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>

      <StorefrontFooter brandName="Tuxedo Corn" brandSlug="tuxedo" />
    </div>
  );
}
