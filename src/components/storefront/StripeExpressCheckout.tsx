"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Elements, ExpressCheckoutElement, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import type { StripeExpressCheckoutElementConfirmEvent } from "@stripe/stripe-js";
import { getStripe, hasStripePublishableKey } from "@/lib/stripe-client";
import { createRetailPaymentIntent } from "@/actions/billing/retail-payment-intent";

type Stop = {
  id: string;
  city: string;
  state: string;
  date: string;
  time?: string;
  location: string;
  brand_id: string;
};

export type CheckoutItem = {
  id: string;
  name: string;
  price: string; // dollars, with or without $ sign
  quantity: number;
  fulfillment?: "pickup" | "ship";
};

type Props = {
  items: CheckoutItem[];
  brandId: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  selectedStop: Stop | null;
  /** Required shipping address fields (only used when items include ship fulfillment). */
  shippingState?: string;
  shippingPostal?: string;
  shippingCity?: string;
  /** Called after the user submits via the form submit button (hosted checkout fallback). */
  onHostedCheckout?: () => void;
  /** Stable id used to group intents for the same logical checkout (UUID per page load). */
  checkoutSessionKey?: string;
};

/**
 * Renders the embedded Stripe Elements (Express Checkout + Payment Element)
 * on top of the existing hosted Stripe Checkout fallback.
 *
 * Express Checkout Element is the primary CTA — it surfaces Apple Pay /
 * Google Pay / Link / PayPal buttons automatically based on the user's
 * browser and wallet availability. Tapping one opens the wallet's
 * payment sheet, confirms the PaymentIntent in-page, and we navigate
 * to /checkout/success to create the order.
 *
 * If Stripe.js can't load (no publishable key, network error, etc.),
 * the component renders a graceful error and the parent falls back to
 * the hosted Stripe Checkout button.
 */
export default function StripeExpressCheckout(props: Props) {
  const router = useRouter();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [intentAmount, setIntentAmount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState(false);

  const hasShip = props.items.some((i) => i.fulfillment === "ship");
  const hasPickup = props.items.some(
    (i) => (i.fulfillment ?? "pickup") === "pickup" && (i as { pickup_type?: string }).pickup_type !== "shed"
  );

  // Block express checkout if pickup items exist but no stop is selected
  const stopBlocked = hasPickup && !props.selectedStop;
  const emailBlocked = !props.customerEmail.trim();

  // Stable key for grouping intents by checkout session (in case of retry)
  const sessionKey = useMemo(
    () => props.checkoutSessionKey ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    [props.checkoutSessionKey]
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    if (!hasStripePublishableKey()) {
      setAvailable(false);
      setError("Stripe publishable key not configured. Use the secure checkout button below.");
      setLoading(false);
      return;
    }

    if (props.items.length === 0) {
      setLoading(false);
      return;
    }

    if (stopBlocked) {
      setLoading(false);
      return;
    }

    (async () => {
      const result = await createRetailPaymentIntent(
        props.items.map((i) => ({
          id: i.id,
          name: i.name,
          price: Number(String(i.price).replace(/[$,]/g, "")) || 0,
          quantity: i.quantity,
        })),
        {
          name: props.customerName,
          email: props.customerEmail,
        },
        props.brandId,
        props.selectedStop?.id ?? null,
        hasShip
          ? {
              state: props.shippingState,
              postal_code: props.shippingPostal,
              city: props.shippingCity,
            }
          : null
      );

      if (cancelled) return;
      if (result.success) {
        setClientSecret(result.clientSecret);
        setPaymentIntentId(result.paymentIntentId);
        setIntentAmount(result.amount);
        setAvailable(true);
        setError(null);
      } else {
        setAvailable(false);
        setError(result.error);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
    // Re-fetch when the inputs that affect the PaymentIntent change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    sessionKey,
    props.brandId,
    props.selectedStop?.id,
    props.customerName,
    props.customerEmail,
    hasShip ? `${props.shippingState}|${props.shippingPostal}|${props.shippingCity}` : "",
    stopBlocked,
  ]);

  // Persist the pending-checkout payload to sessionStorage so the
  // success page can create the order. The wallet may overwrite the
  // name/email (Apple Pay provides them), so we read from the PaymentIntent
  // metadata on the success page where appropriate.
  function persistPendingCheckout(intentId: string) {
    if (typeof sessionStorage === "undefined") return;
    sessionStorage.setItem(
      "pending_checkout",
      JSON.stringify({
        customerName: props.customerName,
        customerEmail: props.customerEmail,
        customerPhone: props.customerPhone,
        stopId: props.selectedStop?.id ?? null,
        items: props.items.map((i) => ({
          id: i.id,
          name: i.name,
          price: Number(String(i.price).replace(/[$,]/g, "")) || 0,
          quantity: i.quantity,
          fulfillment: (i.fulfillment ?? "pickup") as "pickup" | "ship",
        })),
        cartBrandId: props.brandId,
        shippingAddress: hasShip
          ? {
              state: props.shippingState,
              postal_code: props.shippingPostal,
              city: props.shippingCity,
            }
          : undefined,
        idempotencyKey: sessionKey,
        paymentIntentId: intentId,
        paymentIntentAmount: intentAmount,
      })
    );
  }

  // Stripe.js loader promise
  const stripePromise = useMemo(() => getStripe(), []);

  if (loading) {
    return (
      <ExpressShell>
        <div className="flex items-center gap-2 text-stone-500 text-sm py-3">
          <span className="h-4 w-4 rounded-full border-2 border-stone-300 border-t-stone-700 animate-spin" />
          Preparing express checkout…
        </div>
      </ExpressShell>
    );
  }

  if (!available || !clientSecret || !stripePromise) {
    return (
      <ExpressShell>
        {error && (
          <p className="text-xs text-stone-500 mb-2">
            {error}
          </p>
        )}
        <button
          type="button"
          onClick={props.onHostedCheckout}
          className="w-full rounded-xl bg-gradient-to-r from-stone-900 to-stone-700 px-6 py-3.5 text-sm font-semibold text-white hover:from-stone-800 hover:to-stone-600 transition-all shadow-lg shadow-stone-900/20"
        >
          Continue to secure checkout →
        </button>
      </ExpressShell>
    );
  }

  return (
    <ExpressShell>
      <Elements
        stripe={stripePromise}
        options={{
          clientSecret,
          appearance: {
            theme: "flat",
            variables: {
              colorPrimary: "#1A4D2E",
              colorBackground: "#ffffff",
              colorText: "#0a0a0a",
              colorDanger: "#dc2626",
              fontFamily: "system-ui, -apple-system, sans-serif",
              spacingUnit: "4px",
              borderRadius: "12px",
            },
            rules: {
              ".Input": { boxShadow: "none", border: "1px solid #e7e5e4" },
              ".Input:focus": { border: "1px solid #1A4D2E" },
              ".Label": { fontWeight: "600", color: "#0a0a0a" },
            },
          },
        }}
      >
        <CheckoutInner
          {...props}
          emailBlocked={emailBlocked}
          stopBlocked={stopBlocked}
          paymentIntentId={paymentIntentId}
          intentAmount={intentAmount}
          persistPendingCheckout={persistPendingCheckout}
          onError={setError}
          onSuccess={() => {
            // Express / Card confirmed in-page. Navigate to success.
            router.push("/checkout/success?payment_intent=" + (paymentIntentId ?? ""));
          }}
          onHostedCheckout={props.onHostedCheckout}
        />
      </Elements>
    </ExpressShell>
  );
}

function ExpressShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <svg className="h-4 w-4 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <p className="text-[11px] font-bold uppercase tracking-widest text-stone-700">
          Express checkout
        </p>
      </div>
      {children}
    </div>
  );
}

type InnerProps = Props & {
  emailBlocked: boolean;
  stopBlocked: boolean;
  paymentIntentId: string | null;
  intentAmount: number | null;
  persistPendingCheckout: (intentId: string) => void;
  onError: (msg: string) => void;
  onSuccess: () => void;
};

function CheckoutInner({
  items,
  brandId,
  customerName,
  customerEmail,
  customerPhone,
  selectedStop,
  shippingState,
  shippingPostal,
  shippingCity,
  emailBlocked,
  stopBlocked,
  paymentIntentId,
  persistPendingCheckout,
  onError,
  onSuccess,
  onHostedCheckout,
}: InnerProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [expressReady, setExpressReady] = useState(false);

  const blocked = emailBlocked || stopBlocked;
  const siteUrl =
    typeof window !== "undefined" ? window.location.origin : "https://route-commerce-platform.vercel.app";

  async function handleExpressConfirm(event: StripeExpressCheckoutElementConfirmEvent) {
    if (blocked) {
      event.paymentFailed({ reason: 'fail' });
      onError(
        emailBlocked
          ? "Enter your email above before paying."
          : "Pick a pickup stop before paying."
      );
      return;
    }

    if (!stripe || !elements) {
      event.paymentFailed({ reason: 'fail' });
      onError("Stripe is not ready yet. Please try again.");
      return;
    }

    // Persist the pending checkout payload so the success page can
    // create the order. We do this BEFORE confirmPayment because the
    // wallet may navigate away briefly during the payment sheet.
    if (paymentIntentId) persistPendingCheckout(paymentIntentId);

    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${siteUrl}/checkout/success?source=express`,
        payment_method_data: {
          billing_details: {
            name: customerName || undefined,
            email: customerEmail || undefined,
            phone: customerPhone || undefined,
            address: shippingState
              ? {
                  state: shippingState,
                  postal_code: shippingPostal,
                  city: shippingCity,
                  country: "US",
                }
              : undefined,
          },
        },
      },
    });

    if (confirmError) {
      event.paymentFailed({ reason: 'fail' });
      onError(confirmError.message ?? "Payment failed. Please try again.");
    } else {
      // payment confirmed in-page — wallet closes its sheet automatically.
      onSuccess();
    }
  }

  async function handleCardSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) {
      onError("Stripe is not ready yet. Please try again.");
      return;
    }
    if (blocked) {
      onError(
        emailBlocked
          ? "Enter your email above before paying."
          : "Pick a pickup stop before paying."
      );
      return;
    }

    setSubmitting(true);
    if (paymentIntentId) persistPendingCheckout(paymentIntentId);

    const { error: submitError } = await elements.submit();
    if (submitError) {
      onError(submitError.message ?? "Form is incomplete.");
      setSubmitting(false);
      return;
    }

    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${siteUrl}/checkout/success?source=card`,
        payment_method_data: {
          billing_details: {
            name: customerName || undefined,
            email: customerEmail || undefined,
            phone: customerPhone || undefined,
            address: shippingState
              ? {
                  state: shippingState,
                  postal_code: shippingPostal,
                  city: shippingCity,
                  country: "US",
                }
              : undefined,
          },
        },
      },
    });

    if (confirmError) {
      onError(confirmError.message ?? "Payment failed.");
      setSubmitting(false);
      return;
    }
    onSuccess();
  }

  return (
    <div className="space-y-4">
      {/* Express (Apple Pay, Google Pay, Link, PayPal) */}
      <div>
        <ExpressCheckoutElement
          onConfirm={handleExpressConfirm}
          onReady={(ev) => {
            const m = ev.availablePaymentMethods;
            const any = !!m && (m.applePay || m.googlePay || m.link || m.paypal || m.amazonPay);
            setExpressReady(any);
          }}
          options={{
            buttonType: { applePay: "buy", googlePay: "buy" },
            buttonTheme: { applePay: "black", googlePay: "black" },
            paymentMethodOrder: ["apple_pay", "google_pay", "link", "paypal"],
            layout: { maxColumns: 3, maxRows: 1 },
          }}
        />
        {!expressReady && !blocked && (
          <p className="mt-2 text-[11px] text-stone-500 text-center">
            No express wallets detected on this device — you can still pay by card below.
          </p>
        )}
        {blocked && (
          <p className="mt-2 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-center">
            {emailBlocked
              ? "Enter your email above to enable express checkout."
              : "Pick a pickup stop above to enable express checkout."}
          </p>
        )}
      </div>

      {/* Divider */}
      <div className="relative my-2">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-stone-200" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white px-3 text-[10px] font-bold uppercase tracking-widest text-stone-400">
            or pay by card
          </span>
        </div>
      </div>

      {/* Card form */}
      <form onSubmit={handleCardSubmit}>
        <PaymentElement
          options={{
            layout: "tabs",
            fields: { billingDetails: "auto" },
            wallets: { applePay: "never", googlePay: "never" },
          }}
        />
        <button
          type="submit"
          disabled={!stripe || !elements || submitting || blocked}
          className="mt-4 w-full rounded-xl bg-stone-900 hover:bg-stone-800 disabled:bg-stone-400 disabled:cursor-not-allowed px-6 py-3.5 text-sm font-semibold text-white transition-all shadow-lg shadow-stone-900/15"
        >
          {submitting ? "Processing…" : "Pay by card"}
        </button>
      </form>

      {/* Fallback to hosted checkout (existing flow) */}
      {onHostedCheckout && (
        <button
          type="button"
          onClick={onHostedCheckout}
          className="w-full text-xs text-stone-500 hover:text-stone-800 underline underline-offset-4 transition-colors"
        >
          Having trouble? Use the secure hosted checkout instead.
        </button>
      )}
    </div>
  );
}
