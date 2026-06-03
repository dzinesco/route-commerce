"use client";

import { useMemo, useState } from "react";
import PlanUpgradeButton from "./PlanUpgradeButton";
import AddPaymentMethodButton from "./AddPaymentMethodButton";
import AddAddonButton from "./AddAddonButton";
import RemoveAddonButton from "./RemoveAddonButton";
import BillingCycleToggle from "./BillingCycleToggle";
import StripePortalButton from "./StripePortalButton";
import { PLAN_TIERS } from "@/lib/pricing";
import type { BillingOverview, BillingSubscriptionStatus } from "@/actions/billing/billing-overview";

type BillingCycle = "monthly" | "annual";

type Props = {
  overview: BillingOverview;
};

/**
 * Status badge class for the subscription state pill.
 * Returns null for "none" so we can hide it entirely instead of showing
 * a generic "Inactive" pill that contradicts the "Active" add-on badges.
 */
function subscriptionStatusBadgeClass(status: BillingSubscriptionStatus | null): {
  label: string;
  cls: string;
  show: boolean;
} {
  if (!status || status === "none" || status === "inactive") {
    return { label: "No active subscription", cls: "bg-stone-100 text-stone-600", show: true };
  }
  switch (status) {
    case "active":
      return { label: "Active", cls: "bg-[var(--admin-success)]/10 text-[var(--admin-success)]", show: true };
    case "trialing":
      return { label: "Trial", cls: "bg-blue-100 text-blue-600", show: true };
    case "past_due":
      return { label: "Past Due", cls: "bg-amber-100 text-amber-700", show: true };
    case "canceled":
      return { label: "Canceled", cls: "bg-red-100 text-red-600", show: true };
    case "incomplete":
      return { label: "Incomplete", cls: "bg-amber-100 text-amber-700", show: true };
    case "unpaid":
      return { label: "Unpaid", cls: "bg-red-100 text-red-600", show: true };
    default:
      return { label: String(status), cls: "bg-stone-100 text-stone-600", show: true };
  }
}

function formatPeriodEnd(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export default function BillingClientPage({ overview }: Props) {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>(overview.planCycle);
  const [compareOpen, setCompareOpen] = useState(false);

  const {
    brandId,
    planTier,
    hasStripeCustomer,
    hasActiveSubscription,
    subscriptionStatus,
    currentPeriodEnd,
    isPlatformAdmin,
    addons,
    limits,
    usage,
  } = overview;

  const currentPlan = PLAN_TIERS[planTier] ?? PLAN_TIERS.starter;

  // ── Pricing math (driven solely by billingCycle toggle) ────────────────────
  const { planDisplayPrice, addonsMonthlyTotal, addonsAnnualTotal, displayedTotal, planDisplayLabel } =
    useMemo(() => {
      const planDisplayPrice =
        billingCycle === "annual" ? currentPlan.annualPrice : currentPlan.monthlyPrice;
      const planDisplayLabel = billingCycle === "annual" ? "/yr" : "/mo";

      // Add-ons that are "live" (subscription active) — only these contribute
      // to displayed totals. Inactive add-ons would inflate the number.
      const liveAddons = addons.filter((a) => a.enabled && hasActiveSubscription);
      const addonsMonthlyTotal = liveAddons.reduce((s, a) => s + a.monthlyPrice, 0);
      const addonsAnnualTotal = liveAddons.reduce((s, a) => s + a.annualPrice, 0);

      const displayedTotal =
        billingCycle === "annual"
          ? planDisplayPrice + addonsAnnualTotal
          : planDisplayPrice + addonsMonthlyTotal;

      return { planDisplayPrice, addonsMonthlyTotal, addonsAnnualTotal, displayedTotal, planDisplayLabel };
    }, [billingCycle, currentPlan, addons, hasActiveSubscription]);

  const monthlyEquivalent =
    billingCycle === "annual"
      ? Math.round(displayedTotal / 12)
      : displayedTotal;

  const statusBadge = subscriptionStatusBadgeClass(subscriptionStatus);
  const periodEndLabel = formatPeriodEnd(currentPeriodEnd);

  // ── Invoice data (synthesized, since we have no invoice table) ─────────────
  // Amounts always equal the displayed total for the selected cycle so the
  // user never sees an invoice that disagrees with the plan above.
  const placeholderInvoices = useMemo(() => {
    const today = new Date();
    return [3, 2, 1].map((monthsAgo) => {
      const d = new Date(today);
      d.setMonth(d.getMonth() - monthsAgo);
      const dateLabel = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      return {
        id: `INV-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(3, "0")}`,
        date: dateLabel,
        amount: displayedTotal,
        status: "paid" as const,
        // Until we wire a real billing_invoices table we mark them as samples
        // so users don't mistake them for authentic records.
        isSample: !hasActiveSubscription,
      };
    });
  }, [displayedTotal, hasActiveSubscription]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── 1. Header summary bar ─────────────────────────────────────────── */}
      <div className="rounded-2xl bg-white shadow-md ring-1 ring-[var(--admin-border)] px-6 py-6">
        <div className="flex items-center justify-between flex-wrap gap-6">
          <div className="flex items-center gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${currentPlan.color}`}>
                  {currentPlan.label}
                </span>
                {statusBadge.show && (
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${statusBadge.cls}`}>
                    {statusBadge.label}
                  </span>
                )}
                {hasActiveSubscription && periodEndLabel && (
                  <span className="text-xs text-[var(--admin-text-muted)]">
                    renews {periodEndLabel}
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-[var(--admin-text-primary)]">
                  {hasActiveSubscription ? `$${displayedTotal}` : `$${currentPlan.monthlyPrice}`}
                  <span className="text-base font-normal text-[var(--admin-text-muted)]">
                    {hasActiveSubscription ? planDisplayLabel : "/mo"}
                  </span>
                </p>
                {hasActiveSubscription && billingCycle === "annual" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--admin-success)]/10 px-2.5 py-0.5 text-xs font-medium text-[var(--admin-success)]">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Save 25%
                  </span>
                )}
              </div>
              <p className="text-sm text-[var(--admin-text-muted)] mt-1">
                {hasActiveSubscription ? (
                  <>
                    {addons.filter((a) => a.enabled).length > 0 ? (
                      <>Includes plan + {addons.filter((a) => a.enabled).length} active add-on{addons.filter((a) => a.enabled).length === 1 ? "" : "s"}</>
                    ) : (
                      <>Base plan only · no add-ons</>
                    )}
                    {billingCycle === "annual" && (
                      <> · ${monthlyEquivalent}/mo equivalent</>
                    )}
                  </>
                ) : hasStripeCustomer ? (
                  <>No active subscription. Add-ons will not bill until you subscribe to a plan.</>
                ) : (
                  <>No active subscription. Add a payment method to start.</>
                )}
              </p>
            </div>
          </div>
          <BillingCycleToggle onCycleChange={(c) => setBillingCycle(c)} />
        </div>
      </div>

      {/* ── 2. Current plan + Add-ons (two-column) ────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-5">
        {/* Current plan card */}
        <div className="rounded-2xl bg-white shadow-md ring-1 ring-[var(--admin-border)] p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[var(--admin-text-primary)]">Your Plan</h3>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${currentPlan.color}`}>
              {currentPlan.label}
            </span>
          </div>
          <p className="text-xl font-bold text-[var(--admin-text-primary)] mb-1">
            {hasActiveSubscription
              ? `$${planDisplayPrice}${planDisplayLabel}`
              : `$${currentPlan.monthlyPrice}/mo`}
          </p>
          <p className="text-xs text-[var(--admin-text-muted)] mb-5">
            {hasActiveSubscription ? (
              billingCycle === "annual" && currentPlan.annualPrice
                ? `$${Math.round(currentPlan.annualPrice / 12)}/mo equivalent — saves $${Math.round(((currentPlan.monthlyPrice ?? 0) * 12 - (currentPlan.annualPrice ?? 0)))}/yr`
                : "billed monthly"
            ) : (
              "Not yet subscribed"
            )}
          </p>
          <ul className="space-y-2 mb-5">
            {(currentPlan.features as readonly string[]).slice(0, 6).map((f, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-[var(--admin-text-secondary)]">
                <svg className="w-4 h-4 text-[var(--admin-success)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {f}
              </li>
            ))}
            {(currentPlan.features as readonly string[]).length > 6 && (
              <li className="text-xs text-[var(--admin-text-muted)] pl-6">+ {(currentPlan.features as readonly string[]).length - 6} more features</li>
            )}
          </ul>
          {isPlatformAdmin && (
            <button
              onClick={() => setCompareOpen(!compareOpen)}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--admin-accent)] hover:text-[var(--admin-accent-hover)] transition-colors"
            >
              {compareOpen ? "Hide" : "Compare"} plans
              <svg className={`w-4 h-4 transition-transform ${compareOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
        </div>

        {/* Add-ons */}
        <div className="rounded-2xl bg-white shadow-md ring-1 ring-[var(--admin-border)] p-6 lg:col-span-3">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-semibold text-[var(--admin-text-primary)]">Add-ons</h3>
              <p className="text-xs text-[var(--admin-text-muted)] mt-0.5">
                {hasActiveSubscription
                  ? "Extend your plan with optional features"
                  : "Add a subscription to enable add-ons"}
              </p>
            </div>
            <span className="text-sm font-semibold text-[var(--admin-text-secondary)]">
              {hasActiveSubscription
                ? `+$${billingCycle === "annual" ? Math.round(addonsAnnualTotal / 12) : addonsMonthlyTotal}/mo`
                : "—"}
            </span>
          </div>
          <div className="space-y-3">
            {addons.map((addon) => {
              const displayPrice =
                billingCycle === "annual"
                  ? Math.round(addon.annualPrice / 12)
                  : addon.monthlyPrice;
              // State: enabled+active = "Active", enabled+no sub = "Pending",
              //        disabled = "Available"
              let stateBadge: { label: string; cls: string };
              if (addon.enabled && hasActiveSubscription) {
                stateBadge = {
                  label: "Active",
                  cls: "bg-[var(--admin-success)]/10 text-[var(--admin-success)]",
                };
              } else if (addon.enabled && !hasActiveSubscription) {
                stateBadge = {
                  label: "Pending",
                  cls: "bg-amber-100 text-amber-700",
                };
              } else {
                stateBadge = {
                  label: "Available",
                  cls: "bg-stone-100 text-stone-600",
                };
              }
              return (
                <div key={addon.key} className="flex items-center justify-between rounded-xl border border-[var(--admin-border)] bg-[var(--admin-bg)] px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xl leading-none">{addon.icon}</span>
                    <div>
                      <p className="text-sm font-medium text-[var(--admin-text-primary)]">{addon.label}</p>
                      <p className="text-xs text-[var(--admin-text-muted)]">{addon.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-semibold text-[var(--admin-text-secondary)]">+${displayPrice}/mo</span>
                    <span className={`inline-flex items-center gap-1 rounded-full text-xs px-2.5 py-1 font-medium ${stateBadge.cls}`}>
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          stateBadge.label === "Active"
                            ? "bg-[var(--admin-success)]"
                            : stateBadge.label === "Pending"
                            ? "bg-amber-500"
                            : "bg-stone-400"
                        }`}
                      />
                      {stateBadge.label}
                    </span>
                    {addon.removable ? (
                      <RemoveAddonButton brandId={brandId} addonKey={addon.key} onRemoved={() => window.location.reload()} />
                    ) : hasActiveSubscription ? (
                      <AddAddonButton brandId={brandId} addonKey={addon.key} />
                    ) : (
                      <span
                        className="text-xs text-[var(--admin-text-muted)]"
                        title="Subscribe to a plan first"
                      >
                        —
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── 3. Compare plans (collapsible) ──────────────────────────────── */}
      {compareOpen && isPlatformAdmin && (
        <div className="rounded-2xl bg-white shadow-md ring-1 ring-[var(--admin-border)] overflow-hidden">
          <div className="border-b border-[var(--admin-border)] bg-[var(--admin-bg)] px-6 py-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-[var(--admin-text-primary)]">Plan Comparison</h3>
            <button
              onClick={() => setCompareOpen(false)}
              className="inline-flex items-center gap-1.5 text-xs text-[var(--admin-text-muted)] hover:text-[var(--admin-text-primary)] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Close
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--admin-border)]">
                  <th className="pb-4 pr-6 text-left font-semibold text-[var(--admin-text-muted)] w-2/5">Feature</th>
                  {(["starter", "farm", "enterprise"] as const).map((tier) => {
                    const plan = PLAN_TIERS[tier];
                    const price = billingCycle === "annual" ? plan.annualPrice : plan.monthlyPrice;
                    return (
                      <th key={tier} className="pb-4 px-4 text-center">
                        <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${plan.color}`}>
                          {plan.label}
                        </span>
                        <div className="mt-2">
                          <span className="text-2xl font-bold text-[var(--admin-text-primary)]">
                            {price !== null ? `$${price}` : "$399"}
                          </span>
                          <span className="text-xs text-[var(--admin-text-muted)]">/{billingCycle === "annual" ? "yr" : "mo"}</span>
                        </div>
                        {tier === "enterprise" && billingCycle === "annual" && (
                          <p className="text-xs text-[var(--admin-text-muted)] mt-0.5">or $399/mo</p>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {[
                  ["Products catalog", { starter: true, farm: true, enterprise: true }],
                  ["Stops management", { starter: "10/mo", farm: "Unlimited", enterprise: "Unlimited" }],
                  ["Orders processing", { starter: true, farm: true, enterprise: true }],
                  ["Pickup & fulfillment", { starter: true, farm: true, enterprise: true }],
                  ["Multi-user", { starter: "1 user", farm: "5 users", enterprise: "Unlimited" }],
                  ["Reporting", { starter: false, farm: true, enterprise: true }],
                  ["Wholesale Portal", { starter: false, farm: true, enterprise: true }],
                  ["Harvest Reach", { starter: false, farm: true, enterprise: true }],
                  ["AI Intelligence", { starter: false, farm: false, enterprise: true }],
                  ["SMS Campaigns", { starter: false, farm: false, enterprise: true }],
                  ["Square Sync", { starter: false, farm: false, enterprise: true }],
                  ["Water Log", { starter: false, farm: false, enterprise: true }],
                  ["Unlimited brands", { starter: false, farm: false, enterprise: true }],
                  ["Custom development", { starter: false, farm: false, enterprise: true }],
                  ["Dedicated support", { starter: false, farm: false, enterprise: true }],
                ].map(([feature, tiers]) => {
                  const t = tiers as Record<string, boolean | string>;
                  return (
                    <tr key={feature as string} className="border-t border-[var(--admin-border)]">
                      <td className="py-3 pr-6 text-[var(--admin-text-secondary)]">{feature as string}</td>
                      {(["starter", "farm", "enterprise"] as const).map((tier) => (
                        <td key={tier} className="py-3 px-4 text-center">
                          {typeof t[tier] === "boolean" ? (
                            t[tier] ? (
                              <svg className="w-5 h-5 text-[var(--admin-success)] mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                              </svg>
                            ) : (
                              <span className="text-[var(--admin-text-muted)]">—</span>
                            )
                          ) : (
                            <span className="text-sm font-medium text-[var(--admin-text-secondary)]">{t[tier]}</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                })}
                <tr className="border-t-2 border-[var(--admin-border)] bg-[var(--admin-bg-subtle)]">
                  <td className="pt-4 pr-6" />
                  {(["starter", "farm", "enterprise"] as const).map((tier) => {
                    const isCurrent = tier === planTier;
                    return (
                      <td key={tier} className="pt-4 px-4 text-center">
                        {isCurrent ? (
                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--admin-success)]/10 px-3 py-1.5 text-sm font-medium text-[var(--admin-success)]">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                            Current
                          </span>
                        ) : tier === "enterprise" ? (
                          <a
                            href="mailto:team@cielohermosa.com?subject=Enterprise+Plan"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--admin-accent)] bg-white px-3 py-1.5 text-sm font-medium text-[var(--admin-accent)] hover:bg-[var(--admin-accent-light)] transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5H4.5A2.25 2.25 0 002.25 6.75m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                            </svg>
                            Contact
                          </a>
                        ) : (
                          <PlanUpgradeButton brandId={brandId} targetTier={tier} currentTier={planTier} />
                        )}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 4. Payment + Invoices (two-column) ───────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Payment method */}
        <div className="rounded-2xl bg-white shadow-md ring-1 ring-[var(--admin-border)] p-6">
          <h3 className="text-sm font-semibold text-[var(--admin-text-primary)] mb-4">Payment Method</h3>
          {hasStripeCustomer ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-xl border border-[var(--admin-border)] p-4">
                <div className="flex items-center justify-center h-10 w-12 rounded-lg bg-gradient-to-br from-blue-600 to-violet-600 shrink-0">
                  <svg className="h-5 w-8 text-white" viewBox="0 0 32 20" fill="currentColor">
                    <path d="M13.193 7.448c-.114-.272-.379-.358-.65-.358-.27 0-.535.09-.65.357-.13.277-.114.558.115.838.236.286.535.357.806.357.27 0 .534-.09.648-.357.13-.28.115-.561-.115-.837-.237-.286-.536-.357-.806-.357-.271 0-.536.09-.65.357l-.001.001-.001-.001c-.114.267-.379.357-.65.357-.27 0-.536-.09-.65-.357-.13-.277-.114-.558.115-.838.236-.286.536-.357.806-.357.271 0 .536.09.65.357l.001-.001c.115-.272.38-.358.65-.358.271 0 .536.09.65.357l.001.001c.122.28.122.56-.008.838z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--admin-text-primary)]">Card on file</p>
                  <p className="text-xs text-[var(--admin-text-muted)]">
                    {hasActiveSubscription
                      ? "Billed automatically per the cycle you selected"
                      : "On file — no active subscription yet"}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full text-xs px-2.5 py-1 font-medium shrink-0 ${
                    hasActiveSubscription
                      ? "bg-[var(--admin-success)]/10 text-[var(--admin-success)]"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      hasActiveSubscription ? "bg-[var(--admin-success)]" : "bg-amber-500"
                    }`}
                  />
                  {hasActiveSubscription ? "Active" : "On File"}
                </span>
              </div>
              <StripePortalButton brandId={brandId} variant="secondary" label="Manage in Stripe Portal" />
              <p className="text-xs text-[var(--admin-text-muted)] text-center pt-2">
                Payment powered by Stripe · Invoiced by Cielo Hermosa, LLC
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-amber-800">
                      <strong>No payment method on file</strong>
                    </p>
                    <p className="text-xs text-amber-700 mt-0.5">Add a card to activate your subscription.</p>
                  </div>
                </div>
              </div>
              <AddPaymentMethodButton brandId={brandId} />
              <p className="text-xs text-[var(--admin-text-muted)] text-center">
                Set up in{" "}
                <a href="/admin/settings" className="underline hover:text-[var(--admin-accent)]">Payments settings</a>
                {" "}to enable billing.
              </p>
            </div>
          )}
        </div>

        {/* Invoice history */}
        <div className="rounded-2xl bg-white shadow-md ring-1 ring-[var(--admin-border)] p-6">
          <h3 className="text-sm font-semibold text-[var(--admin-text-primary)] mb-4">Invoice History</h3>
          {!hasActiveSubscription && (
            <p className="text-xs text-[var(--admin-text-muted)] mb-3 italic">
              No subscription on file yet. The sample rows below show the price you would have been billed.
            </p>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--admin-border)]">
                  <th className="pb-3 text-left font-semibold text-[var(--admin-text-muted)]">Invoice</th>
                  <th className="pb-3 text-left font-semibold text-[var(--admin-text-muted)]">Date</th>
                  <th className="pb-3 text-right font-semibold text-[var(--admin-text-muted)]">Amount</th>
                  <th className="pb-3 text-right font-semibold text-[var(--admin-text-muted)]">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--admin-border)]">
                {placeholderInvoices.map((inv) => (
                  <tr key={inv.id}>
                    <td className="py-3 font-medium text-[var(--admin-text-primary)]">
                      {inv.id}
                      {inv.isSample && (
                        <span className="ml-2 inline-block text-[10px] uppercase tracking-wide text-[var(--admin-text-muted)]">
                          sample
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-[var(--admin-text-muted)]">{inv.date}</td>
                    <td className="py-3 text-right font-semibold text-[var(--admin-text-primary)]">${inv.amount}</td>
                    <td className="py-3 text-right">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                          inv.isSample
                            ? "bg-stone-100 text-stone-600"
                            : "bg-[var(--admin-success)]/10 text-[var(--admin-success)]"
                        }`}
                      >
                        {inv.isSample ? "—" : inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-xs text-[var(--admin-text-muted)] text-center">
            Invoiced by Cielo Hermosa, LLC · <a href="mailto:billing@cielohermosa.com" className="underline hover:text-[var(--admin-accent)]">billing@cielohermosa.com</a>
          </p>
        </div>
      </div>

      {/* Usage footer (small) — keep usage in sync with /admin dashboard */}
      <div className="rounded-2xl bg-white shadow-md ring-1 ring-[var(--admin-border)] px-6 py-4">
        <div className="flex items-center justify-between flex-wrap gap-3 text-sm">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-[var(--admin-text-muted)]">Current usage:</span>
            <span><strong>{usage.users}</strong>/{limits.max_users} users</span>
            <span><strong>{usage.stops_this_month}</strong>/{limits.max_stops_monthly === -1 ? "∞" : limits.max_stops_monthly} stops this month</span>
            <span><strong>{usage.products}</strong>/{limits.max_products === -1 ? "∞" : limits.max_products} products</span>
          </div>
          <span className="text-xs text-[var(--admin-text-muted)]">
            Mirrors your admin dashboard
          </span>
        </div>
      </div>
    </div>
  );
}
