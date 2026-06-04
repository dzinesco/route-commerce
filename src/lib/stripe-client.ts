/**
 * Browser-only Stripe.js loader.
 *
 * Reads `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` and returns a cached
 * `loadStripe` promise. Never call this from a server component — it
 * pulls in `@stripe/stripe-js` which depends on `window`.
 *
 * The published key is safe to ship to the browser; the secret key
 * never leaves the server (see `src/actions/billing/retail-checkout.ts`).
 */
"use client";

import { loadStripe, type Stripe } from "@stripe/stripe-js";

let stripePromise: Promise<Stripe | null> | null = null;

/**
 * Returns the cached Stripe.js promise, creating it on the first call.
 * Returns `null` if the publishable key is not configured — callers
 * should fall back to the hosted Stripe Checkout flow in that case.
 */
export function getStripe(): Promise<Stripe | null> | null {
  if (typeof window === "undefined") return null;
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!key) return null;
  if (!stripePromise) {
    stripePromise = loadStripe(key);
  }
  return stripePromise;
}

/** Synchronous check — useful for deciding whether to render Stripe Elements. */
export function hasStripePublishableKey(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
}
