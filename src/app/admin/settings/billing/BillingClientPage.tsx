"use client";

import { useState } from "react";
import PlanUpgradeButton from "./PlanUpgradeButton";
import AddPaymentMethodButton from "./AddPaymentMethodButton";
import AddAddonButton from "./AddAddonButton";
import RemoveAddonButton from "./RemoveAddonButton";
import BillingCycleToggle from "./BillingCycleToggle";
import StripePortalButton from "./StripePortalButton";
import { PLAN_TIERS, ADDONS } from "@/lib/pricing";

type BillingCycle = "monthly" | "annual";

type AddonData = { key: string; label: string; icon: string; monthlyPrice: number; annualPrice: number };

type Props = {
  brandId: string;
  planTier: string;
  brandName: string | null;
  hasStripeCustomer: boolean;
  enabledAddons: Record<string, boolean>;
  isPlatformAdmin: boolean;
  subscriptionStatus: string | null;
  currentPeriodEnd: string | null;
};

export default function BillingClientPage({
  brandId,
  planTier,
  brandName,
  hasStripeCustomer,
  enabledAddons,
  isPlatformAdmin,
  subscriptionStatus,
  currentPeriodEnd,
}: Props) {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("annual");
  const [compareOpen, setCompareOpen] = useState(false);

  const currentPlan = PLAN_TIERS[planTier as keyof typeof PLAN_TIERS] ?? PLAN_TIERS.starter;
  const planMonthly = billingCycle === "annual"
    ? Math.round((currentPlan.annualPrice ?? 0) / 12)
    : (currentPlan.monthlyPrice ?? 0);

  const enabledAddonsList: AddonData[] = Object.entries(enabledAddons)
    .filter(([, v]) => v)
    .map(([key]) => {
      const a = ADDONS[key as keyof typeof ADDONS];
      return a ? { key, label: a.label, icon: a.icon, monthlyPrice: a.monthlyPrice, annualPrice: a.annualPrice } : null;
    })
    .filter(Boolean) as AddonData[];

  const allAddonKeys = Object.keys(ADDONS) as Array<keyof typeof ADDONS>;

  const addonsMonthlyTotal = enabledAddonsList.reduce((sum, a) => {
    return sum + (billingCycle === "annual" ? Math.round(a.annualPrice / 12) : a.monthlyPrice);
  }, 0);

  const totalMonthly = planMonthly + addonsMonthlyTotal;

  const annualSavings = enabledAddonsList.reduce(
    (s, a) => s + (a.monthlyPrice * 12 - a.annualPrice),
    (billingCycle === "annual" ? (currentPlan.monthlyPrice ?? 0) * 12 - (currentPlan.annualPrice ?? 0) : 0)
  );

  return (
    <div className="space-y-4">
      {/* ── 1. Header summary bar ───────────────────────────────────────────── */}
      <div className="rounded-2xl bg-white shadow-md ring-1 ring-[var(--admin-border)] px-6 py-5">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${currentPlan.color}`}>
                  {currentPlan.label}
                </span>
                {subscriptionStatus && (
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${
                    subscriptionStatus === "active" ? "bg-[var(--admin-success-light)] text-[var(--admin-success-accent)]" :
                    subscriptionStatus === "past_due" ? "bg-amber-100 text-amber-700" :
                    subscriptionStatus === "canceled" ? "bg-red-100 text-red-600" :
                    subscriptionStatus === "trialing" ? "bg-blue-100 text-blue-600" :
                    "bg-[var(--admin-bg)] text-[var(--admin-text-muted)]"
                  }`}>
                    {subscriptionStatus.replace("_", " ")}
                  </span>
                )}
                <span className="text-sm text-[var(--admin-text-muted)]">
                  {currentPeriodEnd ? (
                    <>Next billing: <span className="font-medium text-[var(--admin-text-primary)]">{new Date(currentPeriodEnd).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span></>
                  ) : (
                    "No active subscription"
                  )}
                </span>
              </div>
              <p className="text-2xl font-bold text-[var(--admin-text-primary)]">
                ${totalMonthly}<span className="text-sm font-normal text-[var(--admin-text-muted)]">/mo</span>
                <span className="ml-2 text-sm font-medium text-[var(--admin-success-accent)]">
                  {billingCycle === "annual" ? "Annual (saves 25%)" : ""}
                </span>
              </p>
            </div>
          </div>
          <BillingCycleToggle onCycleChange={(c) => setBillingCycle(c)} />
        </div>
      </div>

      {/* ── 2. Current plan + Add-ons (two-column) ───────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-5">
        {/* Current plan card */}
        <div className="rounded-2xl bg-white shadow-md ring-1 ring-[var(--admin-border)] p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[var(--admin-text-primary)]">Your Plan</h3>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${currentPlan.color}`}>
              {currentPlan.label}
            </span>
          </div>
          <p className="text-lg font-bold text-[var(--admin-text-primary)] mb-1">
            {billingCycle === "annual" ? `$${currentPlan.annualPrice}/yr` : `$${currentPlan.monthlyPrice}/mo`}
          </p>
          <p className="text-xs text-[var(--admin-text-muted)] mb-4">
            {billingCycle === "annual" && currentPlan.annualPrice
              ? `$${Math.round(currentPlan.annualPrice / 12)}/mo equivalent`
              : "billed monthly"}
          </p>
          <ul className="space-y-1 mb-4">
            {(currentPlan.features as readonly string[]).slice(0, 5).map((f, i) => (
              <li key={i} className="flex items-center gap-2 text-xs text-[var(--admin-text-secondary)]">
                <span className="text-[var(--admin-success)] shrink-0">✓</span> {f}
              </li>
            ))}
            {(currentPlan.features as readonly string[]).length > 5 && (
              <li className="text-xs text-[var(--admin-text-muted)] pl-5">+ {(currentPlan.features as readonly string[]).length - 5} more</li>
            )}
          </ul>
          {isPlatformAdmin && (
            <button
              onClick={() => setCompareOpen(!compareOpen)}
              className="text-xs text-[var(--admin-accent)] hover:underline font-medium"
            >
              {compareOpen ? "Hide plan comparison" : "Compare plans →"}
            </button>
          )}
        </div>

        {/* Add-ons */}
        <div className="rounded-2xl bg-white shadow-md ring-1 ring-[var(--admin-border)] p-5 lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[var(--admin-text-primary)]">Add-ons</h3>
            <span className="text-xs text-[var(--admin-text-muted)]">+{addonsMonthlyTotal}/mo</span>
          </div>
          <div className="space-y-2.5">
            {allAddonKeys.map((key) => {
              const addon = ADDONS[key];
              const isEnabled = !!enabledAddons[key];
              const displayPrice = billingCycle === "annual"
                ? Math.round(addon.annualPrice / 12)
                : addon.monthlyPrice;
              return (
                <div key={key} className="flex items-center justify-between rounded-lg border border-[var(--admin-border)] bg-[var(--admin-bg)] px-3 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="text-base leading-none">{addon.icon}</span>
                    <div>
                      <p className="text-sm font-medium text-[var(--admin-text-primary)]">{addon.label}</p>
                      <p className="text-xs text-[var(--admin-text-muted)]">{addon.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-semibold text-[var(--admin-text-secondary)]">+${displayPrice}/mo</span>
                    {isEnabled ? (
                      <div className="flex items-center gap-1.5">
                        <span className="rounded-full bg-[var(--admin-success-light)] text-[var(--admin-success-accent)] text-xs px-2 py-0.5 font-medium">Active</span>
                        {isPlatformAdmin && (
                          <RemoveAddonButton brandId={brandId} addonKey={key} onRemoved={() => window.location.reload()} />
                        )}
                      </div>
                    ) : (
                      <AddAddonButton brandId={brandId} addonKey={key} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── 3. Compare plans (collapsible) ───────────────────────────────────── */}
      {compareOpen && (
        <div className="rounded-2xl bg-white shadow-md ring-1 ring-[var(--admin-border)] overflow-hidden">
          <div className="border-b border-[var(--admin-border)] bg-[var(--admin-bg)] px-5 py-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--admin-text-primary)]">Plan Comparison</h3>
            <button onClick={() => setCompareOpen(false)} className="text-xs text-[var(--admin-text-muted)] hover:text-[var(--admin-text-primary)]">
              ✕ Close
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--admin-border)]">
                  <th className="pb-3 pr-4 text-left font-semibold text-[var(--admin-text-muted)] w-2/5" />
                  {(["starter", "farm", "enterprise"] as const).map((tier) => {
                    const plan = PLAN_TIERS[tier];
                    const price = billingCycle === "annual" ? plan.annualPrice : plan.monthlyPrice;
                    return (
                      <th key={tier} className="pb-3 px-3 text-center">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-bold uppercase tracking-wide ${plan.color}`}>
                          {plan.label}
                        </span>
                        <div className="mt-1">
                          <span className="text-lg font-bold text-[var(--admin-text-primary)]">
                            {price !== null ? `$${price}` : "$399"}
                          </span>
                          <span className="text-[var(--admin-text-muted)] text-xs">/{billingCycle === "annual" ? "yr" : "mo"}</span>
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
                  ["Stops management", { starter: false, farm: true, enterprise: true }],
                  ["Orders processing", { starter: true, farm: true, enterprise: true }],
                  ["Pickup & fulfillment", { starter: true, farm: true, enterprise: true }],
                  ["Multi-user", { starter: false, farm: true, enterprise: true }],
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
                  const t = tiers as Record<string, boolean>;
                  return (
                    <tr key={feature as string} className="border-t border-[var(--admin-border)]">
                      <td className="py-2 pr-4 text-[var(--admin-text-secondary)]">{feature as string}</td>
                      {(["starter", "farm", "enterprise"] as const).map((tier) => (
                        <td key={tier} className="py-2 px-3 text-center">
                          {t[tier]
                            ? <span className="text-[var(--admin-success)]">✓</span>
                            : <span className="text-[var(--admin-text-muted)]">—</span>}
                        </td>
                      ))}
                    </tr>
                  );
                })}
                <tr className="border-t border-[var(--admin-border)]">
                  <td className="pt-3 pr-4" />
                  {(["starter", "farm", "enterprise"] as const).map((tier) => {
                    const isCurrent = tier === planTier;
                    return (
                      <td key={tier} className="pt-3 px-3 text-center">
                        {isCurrent ? (
                          <span className="inline-block rounded-lg bg-[var(--admin-success-light)] px-2 py-1 text-xs font-medium text-[var(--admin-success-accent)]">Current</span>
                        ) : tier === "enterprise" ? (
                          <a href="mailto:team@cielohermosa.com?subject=Enterprise+Plan" className="inline-block rounded-lg border border-[var(--admin-accent)] bg-[var(--admin-accent-light)] px-2 py-1 text-xs font-medium text-[var(--admin-accent-text)] hover:opacity-80">
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

      {/* ── 4. Payment + Invoices (two-column) ──────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Payment method */}
        <div className="rounded-2xl bg-white shadow-md ring-1 ring-[var(--admin-border)] p-5">
          <h3 className="text-sm font-semibold text-[var(--admin-text-primary)] mb-4">Payment Method</h3>
          {hasStripeCustomer ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-xl border border-[var(--admin-border)] p-3.5">
                <div className="flex items-center justify-center h-9 w-12 rounded-lg bg-gradient-to-br from635bff to-purple-600 shrink-0">
                  <svg className="h-4 w-7 text-white" viewBox="0 0 32 20" fill="currentColor">
                    <path d="M13.193 7.448c-.114-.272-.379-.358-.65-.358-.27 0-.535.09-.65.357-.13.277-.114.558.115.838.236.286.535.357.806.357.27 0 .534-.09.648-.357.13-.28.115-.561-.115-.837-.237-.286-.536-.357-.806-.357-.271 0-.536.09-.65.357l-.001.001-.001-.001c-.114.267-.379.357-.65.357-.27 0-.536-.09-.65-.357-.13-.277-.114-.558.115-.838.236-.286.536-.357.806-.357.271 0 .536.09.65.357l.001-.001c.115-.272.38-.358.65-.358.271 0 .536.09.65.357l.001.001c.122.28.122.56-.008.838zm8.697-.001c-.122-.276-.379-.357-.65-.357-.27 0-.535.09-.649.357-.13.277-.114.558.115.838.236.286.535.357.806.357.27 0 .535-.09.65-.357.13-.28.114-.561-.115-.837-.238-.286-.536-.357-.807-.357-.27 0-.535.09-.65.357l-.001-.001-.001.001c-.114-.267-.379-.357-.65-.357-.27 0-.536.09-.649.357-.13.277-.114.558.115.838.236.286.535.357.806.357.27 0 .535-.09.649-.357.13-.277.114-.558-.115-.838-.236-.286-.536-.357-.806-.357-.271 0-.536.09-.65.357l-.001.001-.001-.001c-.114.267-.379.357-.65.357-.271 0-.536-.09-.65-.357-.114-.276-.379-.357-.65-.357-.271 0-.536.09-.649.357-.13.277-.114.558.115.838.236.286.536.357.806.357.271 0 .536-.09.65-.357.13-.277.114-.558-.115-.838-.237-.286-.536-.357-.806-.357-.271 0-.536.09-.65.357l-.001-.001c-.114.267-.379.357-.65.357-.271 0-.536-.09-.65-.357-.13-.277-.114-.558.115-.838.236-.286.535.357.806-.357.27 0 .535.09.65.357l.001.001c.122.28.122.56-.008.838z"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--admin-text-primary)]">Visa ending in 4242</p>
                  <p className="text-xs text-[var(--admin-text-muted)]">Expires 12/26</p>
                </div>
                <span className="rounded-full bg-[var(--admin-success-light)] text-[var(--admin-success-accent)] text-xs px-2 py-0.5 font-medium shrink-0">Active</span>
              </div>
              <StripePortalButton brandId={brandId} variant="secondary" label="Manage in Stripe Portal →" />
              <p className="text-xs text-[var(--admin-text-muted)] text-center">
                Payment powered by Stripe · Invoiced by Cielo Hermosa, LLC
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5">
                <p className="text-sm text-amber-700">
                  <strong>No payment method on file.</strong> Add a card to activate your subscription.
                </p>
              </div>
              <AddPaymentMethodButton brandId={brandId} />
              <p className="text-xs text-[var(--admin-text-muted)] text-center">
                Set up in{" "}
                <a href="/admin/settings/payments" className="underline hover:text-[var(--admin-text-primary)]">Payments settings</a>
                {" "}to enable billing.
              </p>
            </div>
          )}
        </div>

        {/* Invoice history */}
        <div className="rounded-2xl bg-white shadow-md ring-1 ring-[var(--admin-border)] p-5">
          <h3 className="text-sm font-semibold text-[var(--admin-text-primary)] mb-4">Invoice History</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--admin-border)]">
                  <th className="pb-2 text-left font-semibold text-[var(--admin-text-muted)]">Invoice</th>
                  <th className="pb-2 text-left font-semibold text-[var(--admin-text-muted)]">Date</th>
                  <th className="pb-2 text-right font-semibold text-[var(--admin-text-muted)]">Amount</th>
                  <th className="pb-2 text-right font-semibold text-[var(--admin-text-muted)]">Status</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--admin-border)]">
                {[
                  { id: "INV-2026-004", date: "May 1, 2026", amount: totalMonthly, status: "paid" },
                  { id: "INV-2026-003", date: "Apr 1, 2026", amount: totalMonthly, status: "paid" },
                  { id: "INV-2026-002", date: "Mar 1, 2026", amount: totalMonthly, status: "paid" },
                ].map((inv) => (
                  <tr key={inv.id}>
                    <td className="py-2 font-medium text-[var(--admin-text-primary)]">{inv.id}</td>
                    <td className="py-2 text-[var(--admin-text-muted)]">{inv.date}</td>
                    <td className="py-2 text-right font-semibold text-[var(--admin-text-primary)]">${inv.amount}</td>
                    <td className="py-2 text-right">
                      <span className="rounded-full bg-[var(--admin-success-light)] text-[var(--admin-success-accent)] px-1.5 py-0.5 text-xs font-medium capitalize">{inv.status}</span>
                    </td>
                    <td className="py-2 text-right">
                      <button className="text-xs text-[var(--admin-text-muted)] hover:text-[var(--admin-accent)]">PDF</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-[var(--admin-text-muted)] text-center">
            Invoiced by Cielo Hermosa, LLC · <a href="mailto:billing@cielohermosa.com" className="underline">billing@cielohermosa.com</a>
          </p>
        </div>
      </div>
    </div>
  );
}