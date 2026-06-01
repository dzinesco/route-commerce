"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { createOrder } from "@/actions/checkout";
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

export default function CheckoutPage() {
  const { cart, subtotal, selectedStop, setSelectedStop, clearCart, cartBrandId } = useCart();
  const router = useRouter();
  const [stops, setStops] = useState<Stop[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stable idempotency key per checkout session — survives retries
  const idempotencyKeyRef = useRef<string | null>(null);
  if (!idempotencyKeyRef.current) {
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
      .then((data) => setStops(data));
  }, [cartBrandId]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (cart.length === 0) return;

    const hasPickupItems = cart.some((i) => i.fulfillment === "pickup");
    const hasShipItems = cart.some((i) => i.fulfillment === "ship");

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

    setLoading(true);

    // Build return URLs for Stripe
    const siteUrl = typeof window !== "undefined" ? window.location.origin : "https://route-commerce-platform.vercel.app";
    const successUrl = `${siteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${siteUrl}/checkout?status=cancelled`;

    // Store customer info for order creation on success page
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

    // Create Stripe Checkout session first
    const stripeResult = await createRetailStripeCheckoutSession(items, "", cartBrandId ?? "unknown", successUrl, cancelUrl);
    if (!stripeResult.success || !stripeResult.url) {
      setError(stripeResult.error ?? "Failed to initiate payment. Please try again.");
      setLoading(false);
      return;
    }

    // Redirect to Stripe Checkout
    window.location.href = stripeResult.url;
  }

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-stone-50">
      <StorefrontHeader brandName="Checkout" brandSlug="tuxedo" />
      <main className="px-6 py-12">
        <div className="mx-auto max-w-4xl">
            <h1 className="text-3xl font-bold text-stone-900">
              Your cart is empty
            </h1>
            <a
              href="/"
              className="mt-4 inline-block text-stone-600 hover:text-stone-900"
            >
              ← Back to storefront
            </a>
          </div>
        </main>
      </div>
    );
  }

  const hasPickupItems = cart.some((i) => i.fulfillment === "pickup");
  const hasShedPickupItems = cart.some((i) => i.fulfillment === "pickup" && i.pickup_type === "shed");
  const hasStopPickupItems = cart.some((i) => i.fulfillment === "pickup" && i.pickup_type !== "shed");
  const hasShipItems = cart.some((i) => i.fulfillment === "ship");

  return (
    <div className="min-h-screen bg-stone-50">
      <StorefrontHeader brandName="Checkout" brandSlug="tuxedo" />
      <main className="px-6 py-12">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_400px]">
          <div>
            <h1 className="text-4xl font-bold text-slate-900">
              Checkout
            </h1>

            <p className="mt-3 text-slate-600">
              Complete your order details.
            </p>

            {error && (
              <div className="mt-6 rounded-xl bg-red-50 p-4 text-red-700 text-sm">
                {error}
            </div>
          )}

          {loading && (
            <div className="mt-6 flex items-center gap-3 rounded-xl bg-slate-100 p-4">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
              <span className="text-sm text-slate-600">Placing your order...</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <h2 className="text-xl font-bold text-slate-900">
                Customer Information
              </h2>

              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Full Name *
                  </label>
                  <input
                    name="customer_name"
                    required
                    className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                    placeholder="Jane Smith"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Email
                  </label>
                  <input
                    name="customer_email"
                    type="email"
                    className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                    placeholder="jane@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Phone
                  </label>
                  <input
                    name="customer_phone"
                    type="tel"
                    className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                    placeholder="(555) 555-5555"
                  />
                </div>
              </div>
            </div>

            {hasShedPickupItems && (
              <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-emerald-200">
                <h2 className="text-xl font-bold text-slate-900">
                  Shed Pickup
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  {cart.filter((i) => i.fulfillment === "pickup" && i.pickup_type === "shed").map((i) => i.description || i.name).join(", ")}
                </p>
                <p className="mt-1 text-xs text-slate-500">Pickup location details are included in your order confirmation.</p>
              </div>
            )}

            {hasStopPickupItems && (
              <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <h2 className="text-xl font-bold text-slate-900">
                  Pickup Location
                </h2>

                {selectedStop ? (
                  <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4">
                    <p className="font-medium text-green-900">
                      📦 {selectedStop.city}, {selectedStop.state}
                    </p>
                    <p className="mt-1 text-sm text-green-700">
                      {selectedStop.date} · {selectedStop.time} · {selectedStop.location}
                    </p>
                    <button
                      type="button"
                      onClick={() => setSelectedStop(null)}
                      className="mt-2 text-xs text-green-600 underline hover:text-green-800"
                    >
                      Change pickup stop
                    </button>
                  </div>
                ) : (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Select pickup stop *
                    </label>
                    <select
                      name="stop_id"
                      required
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
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
              </div>
            )}

            {hasShipItems && (
              <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <h2 className="text-xl font-bold text-slate-900">
                  Shipping Address
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Enter your shipping details.
                </p>

                <div className="mt-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">
                      Street Address
                    </label>
                    <input
                      name="shipping_address"
                      className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                      placeholder="123 Main St"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700">
                        City
                      </label>
                      <input
                        name="shipping_city"
                        className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700">
                        State
                      </label>
                      <input
                        name="shipping_state"
                        className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                        placeholder="NC"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700">
                        ZIP Code
                      </label>
                      <input
                        name="shipping_postal_code"
                        className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                        placeholder="28147"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-slate-900 px-6 py-4 text-lg font-medium text-white disabled:opacity-50"
            >
              {loading ? "Redirecting to payment..." : `Pay Now — $${subtotal.toFixed(2)}`}
            </button>
          </form>
        </div>

        {/* Order Summary */}
        <aside>
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-xl font-bold text-slate-900">
              Order Summary
            </h2>

            <div className="mt-4 space-y-3">
              {cart.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-slate-600">
                    {item.name} × {item.quantity}
                    {item.fulfillment === "ship" && (
                      <span className="ml-1 text-xs text-slate-400">(ship)</span>
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
                <span className="text-slate-900 text-xs italic">Taxes will be calculated before payment integration.</span>
              </div>
              <div className="flex justify-between text-xl font-bold text-slate-900 pt-2 border-t border-slate-200">
                <span>Total</span>
                <span>${subtotal.toFixed(2)}</span>
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
