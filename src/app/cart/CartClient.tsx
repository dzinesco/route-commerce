"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import StorefrontHeader from "@/components/storefront/StorefrontHeader";
import StorefrontFooter from "@/components/storefront/StorefrontFooter";

type Stop = {
  id: string;
  city: string;
  state: string;
  date: string;
  time: string;
  location: string;
  brand_id: string;
};

export default function CartClient() {
  const {
    cart,
    subtotal,
    selectedStop,
    cartBrandId,
    setSelectedStop,
    increaseQuantity,
    decreaseQuantity,
    removeFromCart,
  } = useCart();

  const [stops, setStops] = useState<Stop[]>([]);
  const [loadingStops, setLoadingStops] = useState(false);
  const [showStopPicker, setShowStopPicker] = useState(false);
  const [incompatibleItems, setIncompatibleItems] = useState<string[]>([]);
  const [stopBrandMismatch, setStopBrandMismatch] = useState(false);
  const [availabilityError, setAvailabilityError] = useState(false);

  const hasPickupItems = cart.some((i) => i.fulfillment === "pickup");
  const hasShedPickupItems = cart.some((i) => i.fulfillment === "pickup" && i.pickup_type === "shed");
  const hasStopPickupItems = cart.some((i) => i.fulfillment === "pickup" && i.pickup_type !== "shed");

  // Check brand mismatch
  useEffect(() => {
    if (selectedStop?.brand_id && cartBrandId && selectedStop.brand_id !== cartBrandId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStopBrandMismatch(true);
    } else {
      setStopBrandMismatch(false);
    }
  }, [selectedStop, cartBrandId]);

  // Fetch stops when picker is open
  useEffect(() => {
    if (hasPickupItems && showStopPicker && cartBrandId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoadingStops(true);
      fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/stops?active=eq.true&brand_id=eq.${cartBrandId}&select=id,city,state,date,time,location,brand_id&order=date`,
        { headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! } }
      )
        .then((r) => r.json())
        .then((data) => setStops(data ?? []))
        .catch(() => setStops([]))
        .finally(() => setLoadingStops(false));
    }
  }, [hasPickupItems, showStopPicker, cartBrandId]);

  const handleStopSelect = useCallback((stop: Stop) => {
    setSelectedStop(stop);
    setStopBrandMismatch(false);
    setShowStopPicker(false);
    setAvailabilityError(false);
    setIncompatibleItems([]);

    if (hasPickupItems) {
      const pickupProductIds = cart.filter((i) => i.fulfillment === "pickup").map((i) => i.id);
      fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/check_stop_product_availability`,
        {
          method: "POST",
          headers: {
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ p_stop_id: stop.id, p_product_ids: pickupProductIds }),
        }
      )
        .then((r) => r.json())
        .then((data: { product_id: string; is_available: boolean }[]) => {
          const unavailable = (data ?? [])
            .filter((row) => row.is_available === false)
            .map((row) => row.product_id);
          setIncompatibleItems(unavailable);
        })
        .catch(() => {
          setAvailabilityError(true);
          setIncompatibleItems([]);
        });
    }
  }, [cart, hasPickupItems, setSelectedStop]);

  const handleCheckoutClick = useCallback(() => {
    if (stopBrandMismatch) { setSelectedStop(null); return; }
    if (hasStopPickupItems && !selectedStop) { setShowStopPicker(true); return; }
    if (incompatibleItems.length > 0) { return; }
    window.location.href = "/checkout";
  }, [stopBrandMismatch, hasStopPickupItems, selectedStop, incompatibleItems]);

  return (
    <div className="min-h-screen relative">
      {/* Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950" aria-hidden="true" />
      <div className="fixed inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px]" />
      </div>
      
      <StorefrontHeader brandName="Your Cart" brandSlug="tuxedo" />

      <main className="px-6 py-12 relative">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_380px]">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-white">Shopping Cart</h1>
            <p className="mt-3 text-zinc-400">Review your products before checkout.</p>

            {/* Brand mismatch alert */}
            {stopBrandMismatch && (
              <div className="mt-5 glass-card p-5 border border-red-500/20" role="alert">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10 border border-red-500/20">
                    <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-white">Pickup stop is from a different store</p>
                    <p className="mt-1 text-sm text-zinc-400">Your cart was updated. Please select a new pickup stop.</p>
                    <button
                      onClick={() => { setSelectedStop(null); setStopBrandMismatch(false); setShowStopPicker(true); }}
                      className="mt-3 rounded-xl bg-red-500 hover:bg-red-400 px-4 py-2 text-sm font-semibold text-white transition-all shadow-lg shadow-red-500/20"
                    >
                      Choose Correct Stop
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Shed pickup info */}
            {hasShedPickupItems && (
              <div className="mt-5 glass-card p-5 border border-emerald-500/20" role="status">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-white">Shed Pickup</p>
                    <p className="mt-1 text-sm text-zinc-400">
                      {cart.filter((i) => i.fulfillment === "pickup" && i.pickup_type === "shed").map((i) => i.description || i.name).join(", ")}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Stop picker prompt */}
            {hasStopPickupItems && !selectedStop && !stopBrandMismatch && cartBrandId && (
              <div className="mt-5 glass-card p-5 border border-amber-500/20" role="status">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <svg className="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-white">Pickup stop needed</p>
                    <p className="mt-1 text-sm text-zinc-400">Your cart has pickup items. Select a stop before checkout.</p>
                    <button
                      onClick={() => setShowStopPicker(true)}
                      className="mt-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 px-4 py-2 text-sm font-semibold text-white transition-all shadow-lg shadow-amber-500/20"
                      aria-label="Choose pickup stop"
                    >
                      Choose Pickup Stop
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Incompatible items warning */}
            {incompatibleItems.length > 0 && (
              <div className="mt-4 glass-card p-5 border border-red-500/20" role="alert">
                <p className="font-semibold text-white">Some items are not available at this stop:</p>
                <ul className="mt-2 space-y-1" aria-label="Unavailable items">
                  {incompatibleItems.map((id) => {
                    const item = cart.find((i) => i.id === id);
                    return <li key={id} className="text-sm text-zinc-400">• {item?.name}</li>;
                  })}
                </ul>
                <p className="mt-2 text-sm text-zinc-500">Please remove these items or choose a different stop.</p>
              </div>
            )}

            {/* Availability error */}
            {availabilityError && (
              <div className="mt-4 glass-card p-5" role="status">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <svg className="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-white">Could not verify product availability</p>
                    <p className="mt-1 text-sm text-zinc-400">Stop was selected. Checkout will validate product-stop assignment.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Stop picker modal */}
            {showStopPicker && (
              <div 
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 pointer-events-none" 
                role="dialog" 
                aria-modal="true" 
                aria-labelledby="stop-picker-title"
              >
                <div className="w-full max-w-sm rounded-2xl glass-strong p-6 shadow-2xl pointer-events-auto border border-white/10">
                  <h3 id="stop-picker-title" className="text-xl font-semibold text-white">Choose Pickup Stop</h3>
                  <p className="mt-2 text-sm text-zinc-400">Select a stop for your pickup items.</p>
                  {loadingStops ? (
                    <div className="mt-4 flex items-center justify-center gap-2 py-4" role="status" aria-live="polite">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-600 border-t-white" aria-hidden="true" />
                      <span className="text-sm text-zinc-400">Loading stops...</span>
                    </div>
                  ) : stops.length === 0 ? (
                    <p className="mt-4 text-sm text-zinc-400 text-center">No stops available.</p>
                  ) : (
                    <div className="mt-4 space-y-2">
                      {stops.map((stop) => (
                        <button
                          key={stop.id}
                          onClick={() => handleStopSelect(stop)}
                          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left hover:bg-white/10 transition-all text-white"
                        >
                          <p className="font-medium">{stop.city}, {stop.state}</p>
                          <p className="mt-0.5 text-sm text-zinc-400">{stop.date} · {stop.time} · {stop.location}</p>
                        </button>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => setShowStopPicker(false)}
                    className="mt-5 w-full text-center text-sm text-zinc-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Cart items */}
            <div className="mt-10 space-y-4">
              {cart.length === 0 ? (
                <div className="glass-card p-8 text-center">
                  <p className="text-zinc-500">Your cart is empty.</p>
                  <Link href="/" className="mt-4 inline-block text-emerald-400 hover:text-emerald-300 transition-colors">← Continue shopping</Link>
                </div>
              ) : (
                cart.map((item) => (
                  <article key={item.id} className="glass-card p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-base font-semibold text-white">{item.name}</h2>
                        <p className="mt-1 text-sm text-zinc-400">
                          {item.fulfillment === "pickup" ? (
                            <span className="inline-flex items-center gap-1.5">
                              <svg className="h-3.5 w-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                              Pickup
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5">
                              <svg className="h-3.5 w-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                              Shipping
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-3" role="group" aria-label={`Quantity controls for ${item.name}`}>
                        <button
                          onClick={() => decreaseQuantity(item.id)}
                          className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/20 active:scale-95 transition-all text-xl font-medium"
                          aria-label={`Decrease quantity of ${item.name}`}
                        >−</button>
                        <span className="w-10 text-center font-semibold text-white" aria-label={`Quantity: ${item.quantity}`}>{item.quantity}</span>
                        <button
                          onClick={() => increaseQuantity(item.id)}
                          className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500 text-white hover:bg-emerald-400 active:scale-95 transition-all text-xl font-medium shadow-lg shadow-emerald-500/20"
                          aria-label={`Increase quantity of ${item.name}`}
                        >+</button>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between pt-3 border-t border-white/5">
                      <p className="text-sm font-semibold text-white" aria-label={`Item total: $${(Number(item.price.replace("$", "")) * item.quantity).toFixed(2)}`}>
                        ${(Number(item.price.replace("$", "")) * item.quantity).toFixed(2)}
                      </p>
                      <button 
                        onClick={() => removeFromCart(item.id)} 
                        className="text-sm text-zinc-500 hover:text-red-400 transition-colors"
                        aria-label={`Remove ${item.name} from cart`}
                      >
                        Remove
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>

          {/* Order summary sidebar */}
          <aside aria-label="Order summary">
            <div className="glass-card p-6 sticky top-6">
              <h2 className="text-xl font-semibold text-white">Order Summary</h2>

              {hasPickupItems && (
                <div className="mt-5">
                  {hasShedPickupItems && (
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                      <p className="text-sm font-medium text-emerald-400">
                        <svg className="inline h-3.5 w-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                        Shed Pickup
                      </p>
                      <p className="mt-1.5 text-xs text-zinc-400">
                        {cart.filter((i) => i.fulfillment === "pickup" && i.pickup_type === "shed").map((i) => i.description || i.name).join(", ")}
                      </p>
                    </div>
                  )}
                  {selectedStop && (
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                      <p className="text-sm font-medium text-emerald-400">
                        <svg className="inline h-3.5 w-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                        Pickup: {selectedStop.city}, {selectedStop.state}
                      </p>
                      <p className="mt-1.5 text-xs text-zinc-400">{selectedStop.date} · {selectedStop.time}</p>
                      <p className="mt-0.5 text-xs text-zinc-400">{selectedStop.location}</p>
                      <button 
                        onClick={() => setShowStopPicker(true)} 
                        className="mt-2.5 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                        aria-label="Change pickup stop"
                      >
                        Change stop
                      </button>
                    </div>
                  )}
                  {!selectedStop && hasStopPickupItems && (
                    <button
                      onClick={() => setShowStopPicker(true)}
                      className="w-full rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-left text-sm text-amber-400 hover:bg-amber-500/20 transition-all"
                      aria-label="Select pickup stop"
                    >
                      <svg className="inline h-3.5 w-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>
                      No pickup stop selected — click to choose
                    </button>
                  )}
                </div>
              )}

              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-zinc-400">Subtotal</span>
                  <span className="text-sm font-semibold text-white">${subtotal.toFixed(2)}</span>
                </div>
                <div className="border-t border-white/5 pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-semibold text-white">Total</span>
                    <span className="text-2xl font-bold text-white">${subtotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleCheckoutClick}
                disabled={hasStopPickupItems && (!selectedStop || incompatibleItems.length > 0)}
                className="mt-6 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 px-6 py-3.5 text-base font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-500/20 hover:-translate-y-0.5"
                aria-label={
                  incompatibleItems.length > 0
                    ? "Remove incompatible items first to proceed to checkout"
                    : !selectedStop && hasStopPickupItems
                    ? "Select pickup stop first to proceed to checkout"
                    : "Continue to checkout"
                }
              >
                {incompatibleItems.length > 0
                  ? "Remove Incompatible Items First"
                  : !selectedStop && hasStopPickupItems
                  ? "Select Pickup Stop First"
                  : "Continue to Checkout"}
              </button>

              <Link 
                href="/" 
                className="mt-4 block w-full text-center text-sm text-zinc-400 hover:text-white transition-colors"
                aria-label="Continue shopping"
              >
                Continue Shopping
              </Link>
            </div>
          </aside>
        </div>
      </main>

      <StorefrontFooter brandName="Tuxedo Corn" brandSlug="tuxedo" />
    </div>
  );
}