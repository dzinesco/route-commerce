"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { PLAN_TIERS, ADDONS } from "@/lib/pricing";

type BillingCycle = "monthly" | "annual";

const ADDON_LIST = [
  { key: "harvest_reach", label: "Harvest Reach", icon: "📧", description: "Email & SMS marketing campaigns" },
  { key: "wholesale_portal", label: "Wholesale Portal", icon: "🏪", description: "B2B buyer portal with custom pricing" },
  { key: "ai_tools", label: "AI Intelligence Pack", icon: "🤖", description: "Campaign writer, pricing advisor, forecasting" },
  { key: "water_log", label: "Water Log", icon: "💧", description: "Irrigation tracking & water usage" },
  { key: "square_sync", label: "Square Inventory Sync", icon: "◼️", description: "Sync products, orders, inventory with Square" },
  { key: "sms_campaigns", label: "SMS Campaigns", icon: "💬", description: "Text message marketing & notifications" },
];

const FAQ_ITEMS = [
  {
    q: "Can I switch plans at any time?",
    a: "Yes. You can upgrade or downgrade your plan at any time. Upgrades take effect immediately; downgrades apply at the start of your next billing cycle.",
  },
  {
    q: "Is there a free trial?",
    a: "Every new account starts on the Starter plan. You can explore all features before committing. No credit card required to start.",
  },
  {
    q: "How does annual billing work?",
    a: "Annual plans are billed upfront for 12 months at a discounted rate (25% savings). You'll be charged once per year on your subscription date.",
  },
  {
    q: "What payment methods do you accept?",
    a: "We accept all major credit cards (Visa, Mastercard, Amex) via Stripe. Enterprise customers can pay by invoice. All payments are processed securely through Stripe.",
  },
  {
    q: "Can I add add-ons à la carte?",
    a: "Add-ons are available on any plan. You can add or remove them at any time — they're billed proportionally when added mid-cycle.",
  },
  {
    q: "What is the AI Intelligence Pack?",
    a: "The AI Intelligence Pack includes a Campaign Writer (AI-powered email/SMS content), a Pricing Advisor (demand-based pricing suggestions), and Demand Forecasting (predictive analytics for inventory planning).",
  },
  {
    q: "How does Square Sync work?",
    a: "Square Sync keeps your product catalog and inventory counts in sync between Route Commerce and Square POS. Import products from Square, push inventory updates back — full bidirectional sync.",
  },
  {
    q: "Is my data secure?",
    a: "All data is encrypted in transit and at rest. We use Stripe for payment processing — we never store your card details. Our infrastructure is hosted on Vercel with enterprise-grade security.",
  },
];

export default function PricingClientPage() {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("annual");
  const [compareOpen, setCompareOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = useCallback((index: number) => {
    setOpenFaq((prev) => (prev === index ? null : index));
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* ── Nav bar ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-500 text-white font-bold text-sm" aria-hidden="true">
              RC
            </div>
            <span className="text-lg font-bold text-slate-900">Route Commerce</span>
          </div>
          <nav className="flex items-center gap-6" aria-label="Main navigation">
            <Link href="/about" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">About</Link>
            <Link href="/pricing" className="text-sm font-medium text-slate-900" aria-current="page">Pricing</Link>
            <Link 
              href="/admin" 
              className="rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-500 px-4 py-2 text-sm font-medium text-white hover:from-emerald-500 hover:to-emerald-400 transition-all shadow-md"
            >
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-b from-slate-50 to-white px-4 sm:px-6 py-16 sm:py-20 text-center" aria-labelledby="pricing-heading">
        <div className="mx-auto max-w-3xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-medium text-emerald-700">
            <span className="text-xs" aria-hidden="true">✦</span>
            Built for produce wholesale operations
          </div>
          <h1 id="pricing-heading" className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-slate-900">
            Pricing that scales<br className="hidden sm:block" /> with your operation
          </h1>
          <p className="mt-4 sm:mt-6 text-lg sm:text-xl text-slate-500">
            From small farms to enterprise distributors — everything you need to manage orders, stops, communications, and billing in one platform.
          </p>
          <div className="mt-6 sm:mt-8 flex items-center justify-center gap-4 flex-wrap">
            <BillingToggle cycle={billingCycle} onChange={setBillingCycle} />
            <span className="text-xs sm:text-sm text-emerald-600 font-medium">Save 25% with annual</span>
          </div>
        </div>
      </section>

      {/* ── Plan cards ───────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-4 sm:py-6" aria-labelledby="plans-heading">
        <h2 id="plans-heading" className="sr-only">Available Plans</h2>
        <div className="grid gap-6 lg:grid-cols-3">
          {(Object.entries(PLAN_TIERS) as [keyof typeof PLAN_TIERS, typeof PLAN_TIERS[keyof typeof PLAN_TIERS]][]).map(([key, plan]) => {
            const price = billingCycle === "annual" ? plan.annualPrice : plan.monthlyPrice;
            const monthlyEquivalent = billingCycle === "annual" && plan.annualPrice ? Math.round(plan.annualPrice / 12) : null;
            const isMostPopular = plan.highlighted;

            return (
              <article 
                key={key} 
                className={`relative flex flex-col rounded-2xl border-2 p-5 sm:p-6 transition-transform hover:-translate-y-1 ${
                  isMostPopular ? "border-emerald-500 shadow-lg shadow-emerald-100" : "border-slate-200 shadow-sm"
                }`}
              >
                {isMostPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-emerald-600 to-emerald-500 px-3 sm:px-4 py-1 text-xs font-bold text-white uppercase tracking-wide shadow-md">
                    Most Popular
                  </div>
                )}
                <div className="mb-4 sm:mb-5">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">{plan.label}</h3>
                  <p className="mt-1 text-xs sm:text-sm text-slate-500">{plan.description}</p>
                </div>
                <div className="mb-1">
                  <span className="text-3xl sm:text-4xl font-bold text-slate-900">${price}</span>
                  <span className="ml-1 text-slate-400 text-sm">/{billingCycle === "annual" ? "yr" : "mo"}</span>
                </div>
                {monthlyEquivalent !== null && (
                  <p className="mb-3 sm:mb-4 text-xs text-slate-400">${monthlyEquivalent}/mo equivalent</p>
                )}
                <Link
                  href="/admin"
                  className={`mt-auto rounded-xl px-4 py-2.5 text-center text-sm font-medium transition-all ${
                    isMostPopular 
                      ? "bg-gradient-to-r from-emerald-600 to-emerald-500 text-white hover:from-emerald-500 hover:to-emerald-400 shadow-md" 
                      : "border border-slate-300 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {key === "enterprise" ? "Contact Sales" : "Get Started"}
                </Link>
                <ul className="mt-6 space-y-2.5" aria-label={`${plan.label} features`}>
                  {(plan.features as readonly string[]).map((f, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-slate-600">
                      <svg className="mt-0.5 h-4 w-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>

        <div className="mt-6 flex items-center justify-center">
          <button
            onClick={() => setCompareOpen(!compareOpen)}
            className="text-sm text-emerald-600 hover:underline font-medium transition-colors"
            aria-expanded={compareOpen}
            aria-controls="compare-table"
          >
            {compareOpen ? "Hide" : "Compare"} all features →
          </button>
        </div>

        {/* Compare table */}
        {compareOpen && (
          <div id="compare-table" className="mt-6 rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50 px-6 py-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Full Feature Comparison</h3>
              <button 
                onClick={() => setCompareOpen(false)} 
                className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
                aria-label="Close comparison table"
              >
                ✕ Close
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="py-3 pr-6 text-left font-semibold text-slate-500 w-2/5" scope="col">Feature</th>
                    {(["starter", "farm", "enterprise"] as const).map((tier) => {
                      const p = PLAN_TIERS[tier];
                      return (
                        <th key={tier} className="py-3 px-4 text-center" scope="col">
                          <span className={`rounded-full px-3 py-0.5 text-xs font-bold uppercase ${p.color}`}>{p.label}</span>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Products catalog", { starter: true, farm: true, enterprise: true }],
                    ["Stop / route management", { starter: "10/mo", farm: "Unlimited", enterprise: "Unlimited" }],
                    ["Orders processing", { starter: true, farm: true, enterprise: true }],
                    ["Pickup & fulfillment", { starter: true, farm: true, enterprise: true }],
                    ["Admin users", { starter: "1", farm: "5", enterprise: "Unlimited" }],
                    ["Products limit", { starter: "25", farm: "Unlimited", enterprise: "Unlimited" }],
                    ["Reporting", { starter: "Standard", farm: "Advanced", enterprise: "Advanced + AI" }],
                    ["Email support", { starter: true, farm: true, enterprise: "Dedicated" }],
                    ["Wholesale Portal", { starter: false, farm: true, enterprise: true }],
                    ["Harvest Reach (Email & SMS)", { starter: false, farm: true, enterprise: true }],
                    ["AI Intelligence Pack", { starter: false, farm: false, enterprise: true }],
                    ["SMS Campaigns", { starter: false, farm: false, enterprise: true }],
                    ["Square Inventory Sync", { starter: false, farm: false, enterprise: true }],
                    ["Water Log", { starter: false, farm: false, enterprise: true }],
                    ["Unlimited brands", { starter: false, farm: false, enterprise: true }],
                    ["Custom development", { starter: false, farm: false, enterprise: true }],
                    ["SLA guarantee", { starter: false, farm: false, enterprise: true }],
                  ].map(([feature, tiers], rowIndex) => {
                    const t = tiers as Record<string, boolean | string>;
                    return (
                      <tr key={feature as string} className={`border-t ${rowIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                        <td className="py-2.5 pr-6 text-slate-600">{feature as string}</td>
                        {(["starter", "farm", "enterprise"] as const).map((tier) => {
                          const val = t[tier];
                          return (
                            <td key={tier} className="py-2.5 px-4 text-center text-sm">
                              {val === true ? (
                                <svg className="h-4 w-4 text-emerald-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-label="Included">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              ) : val === false ? (
                                <span className="text-slate-300" aria-label="Not included">—</span>
                              ) : (
                                <span className="text-slate-700">{val}</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* ── Add-ons ───────────────────────────────────────────────────────────── */}
      <section className="border-t border-slate-100 bg-slate-50 px-6 py-16" aria-labelledby="addons-heading">
        <div className="mx-auto max-w-6xl">
          <h2 id="addons-heading" className="text-center text-3xl font-bold text-slate-900 mb-2">Power-Up with Add-ons</h2>
          <p className="text-center text-slate-500 mb-10">Add capabilities à la carte on any plan. No bundles required.</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ADDON_LIST.map(({ key, label, icon, description }) => {
              const addon = ADDONS[key as keyof typeof ADDONS];
              if (!addon) return null;
              const price = billingCycle === "annual" ? addon.annualPrice : addon.monthlyPrice;
              const monthlyEquiv = billingCycle === "annual" ? Math.round(addon.annualPrice / 12) : null;
              return (
                <article key={key} className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:border-emerald-200 hover:shadow-md">
                  <span className="text-2xl leading-none" aria-hidden="true">{icon}</span>
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900">{label}</h3>
                    <p className="mt-1 text-xs text-slate-500">{description}</p>
                    <div className="mt-3 flex items-baseline gap-1">
                      <span className="text-xl font-bold text-slate-900">${price}</span>
                      <span className="text-xs text-slate-400">/{billingCycle === "annual" ? "yr" : "mo"}</span>
                      {monthlyEquiv !== null && (
                        <span className="ml-1 text-xs text-slate-400">(${monthlyEquiv}/mo equiv.)</span>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Social proof ─────────────────────────────────────────────────────── */}
      <section className="border-t border-slate-100 px-6 py-16" aria-labelledby="testimonials-heading">
        <div className="mx-auto max-w-6xl">
          <h2 id="testimonials-heading" className="text-center text-2xl font-bold text-slate-900 mb-8">Trusted by produce operations across the US</h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              { quote: "We went from managing 12 spreadsheets to one platform. Route Commerce cut our order chaos by 80%.", name: "Marcus T., Fresh Fields Farm", location: "California" },
              { quote: "Harvest Reach alone paid for the subscription. Our pickup rate went from 70% to 94% in two months.", name: "Sandra K., Pacific Produce Co-op", location: "Oregon" },
              { quote: "The wholesale portal saved us 6 hours a week on order entry. Buyers love the self-service.", name: "James R., Gulf Coast Distribution", location: "Florida" },
            ].map((item, i) => (
              <article key={i} className="rounded-2xl border border-slate-200 p-6 transition-all hover:shadow-md">
                <div className="flex gap-1 mb-3" aria-label="5 star rating">
                  {["★", "★", "★", "★", "★"].map((s, j) => (
                    <span key={j} className="text-amber-400 text-sm" aria-hidden="true">{s}</span>
                  ))}
                </div>
                <blockquote>
                  <p className="text-slate-700 text-sm leading-relaxed">&ldquo;{item.quote}&rdquo;</p>
                </blockquote>
                <p className="mt-3 text-xs font-semibold text-slate-900">{item.name}</p>
                <p className="text-xs text-slate-400">{item.location}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────────────── */}
      <section className="border-t border-slate-100 bg-slate-50 px-6 py-16" aria-labelledby="faq-heading">
        <div className="mx-auto max-w-3xl">
          <h2 id="faq-heading" className="text-center text-3xl font-bold text-slate-900 mb-10">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {FAQ_ITEMS.map((item, i) => (
              <div key={i} className="rounded-xl border border-slate-200 bg-white">
                <button
                  onClick={() => toggleFaq(i)}
                  className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-slate-50"
                  aria-expanded={openFaq === i}
                  aria-controls={`faq-answer-${i}`}
                >
                  <span className="text-sm font-medium text-slate-900">{item.q}</span>
                  <span 
                    className={`ml-3 text-slate-400 text-lg transition-transform ${openFaq === i ? "rotate-45" : ""}`} 
                    aria-hidden="true"
                  >
                    +
                  </span>
                </button>
                {openFaq === i && (
                  <div id={`faq-answer-${i}`} className="border-t border-slate-50 px-5 pb-4">
                    <p className="text-sm text-slate-600 leading-relaxed">{item.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-slate-900 to-slate-800 px-6 py-20 text-center" aria-labelledby="cta-heading">
        <div className="mx-auto max-w-2xl">
          <h2 id="cta-heading" className="text-4xl font-bold text-white">Ready to grow your operation?</h2>
          <p className="mt-4 text-lg text-slate-400">Start free on Starter. No credit card required. Upgrade when you&apos;re ready.</p>
          <div className="mt-8 flex items-center justify-center gap-4 flex-wrap">
            <Link 
              href="/admin" 
              className="rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 px-8 py-3 text-base font-bold text-white hover:from-emerald-400 hover:to-emerald-300 transition-all shadow-lg shadow-emerald-500/25"
            >
              Start for Free →
            </Link>
            <Link 
              href="/contact" 
              className="rounded-xl border border-slate-600 px-8 py-3 text-base font-medium text-slate-300 hover:border-slate-500 hover:text-white transition-all"
            >
              Talk to Us
            </Link>
          </div>
          <p className="mt-6 text-xs text-slate-500">
            Invoiced by Cielo Hermosa, LLC · <a href="mailto:billing@cielohermosa.com" className="underline hover:text-slate-400 transition-colors">billing@routecommerce.com</a>
          </p>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-200 bg-white px-6 py-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-600 to-emerald-500 text-white font-bold text-xs" aria-hidden="true">RC</div>
            <span className="text-sm font-bold text-slate-700">Route Commerce</span>
          </div>
          <nav className="flex items-center gap-6" aria-label="Footer navigation">
            <Link href="/privacy-policy" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">Privacy</Link>
            <Link href="/terms-and-conditions" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">Terms</Link>
            <a href="mailto:team@cielohermosa.com" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">Contact</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}

function BillingToggle({ cycle, onChange }: { cycle: BillingCycle; onChange: (c: BillingCycle) => void }) {
  return (
    <div className="flex items-center gap-3" role="group" aria-label="Billing cycle selection">
      <button
        onClick={() => onChange("monthly")}
        className={`rounded-lg border px-4 py-1.5 text-sm font-medium transition-all ${
          cycle === "monthly" 
            ? "border-emerald-300 bg-white text-slate-900 shadow-sm" 
            : "border-slate-200 bg-slate-50 text-slate-400 hover:border-slate-300"
        }`}
        aria-pressed={cycle === "monthly"}
      >
        Monthly
      </button>
      <button
        onClick={() => onChange("annual")}
        className={`rounded-lg border px-4 py-1.5 text-sm font-medium transition-all flex items-center gap-1.5 ${
          cycle === "annual" 
            ? "border-2 border-emerald-600 bg-emerald-50 text-emerald-700 shadow-sm" 
            : "border border-slate-200 bg-slate-50 text-slate-400 hover:border-slate-300"
        }`}
        aria-pressed={cycle === "annual"}
      >
        Annual
        <span className="rounded-full bg-emerald-100 text-emerald-700 text-xs px-1.5 py-0.5 font-bold">-25%</span>
      </button>
    </div>
  );
}