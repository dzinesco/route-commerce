"use client";

import { useState, useEffect, useCallback } from "react";
import { createPlanUpgradeCheckout } from "@/actions/billing/stripe-checkout";

type PlanTier = "starter" | "farm" | "enterprise";

interface Plan {
  id: PlanTier;
  name: string;
  price: number;
  annualPrice: number;
  description: string;
  features: string[];
  highlighted?: boolean;
}

const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    price: 49,
    annualPrice: 441,
    description: "Perfect for small farms just getting started",
    features: [
      "Products catalog",
      "10 stops/month",
      "Orders & pickup",
      "25 products max",
      "1 team member",
      "Email support",
    ],
  },
  {
    id: "farm",
    name: "Farm",
    price: 149,
    annualPrice: 1341,
    description: "Everything you need to grow your wholesale business",
    features: [
      "Everything in Starter",
      "Unlimited stops",
      "Wholesale portal",
      "Harvest Reach (email/SMS)",
      "Unlimited products",
      "5 team members",
      "Priority support",
    ],
    highlighted: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 399,
    annualPrice: 3591,
    description: "Custom solutions for large-scale operations",
    features: [
      "Everything in Farm",
      "AI Intelligence Pack",
      "SMS Campaigns",
      "Square Sync",
      "Water Log",
      "Unlimited team members",
      "Dedicated SLA",
    ],
  },
];

interface UpgradePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  brandId: string;
  currentTier: string;
  defaultAnnual?: boolean;
}

export default function UpgradePlanModal({
  isOpen,
  onClose,
  brandId,
  currentTier,
  defaultAnnual = false,
}: UpgradePlanModalProps) {
  const [annual, setAnnual] = useState(defaultAnnual);
  const [loading, setLoading] = useState<PlanTier | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Handle animation state
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => setIsVisible(true));
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleEscape);
      return () => window.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen, onClose]);

  const handleUpgrade = useCallback(async (targetTier: PlanTier) => {
    const tierOrder = ["starter", "farm", "enterprise"];
    const currentIndex = tierOrder.indexOf(currentTier);
    const targetIndex = tierOrder.indexOf(targetTier);

    // No upgrades for current or downgrade
    if (targetIndex <= currentIndex) return;

    setLoading(targetTier);
    try {
      const result = await createPlanUpgradeCheckout(brandId, targetTier, annual ? "annual" : "monthly");
      if (result.success && result.url) {
        window.location.href = result.url;
      } else {
        alert(result.error ?? "Failed to start upgrade");
      }
    } finally {
      setLoading(null);
    }
  }, [brandId, currentTier, annual]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!isOpen && !isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
      onClick={handleBackdropClick}
    >
      {/* Glass backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-md" />

      {/* Modal container */}
      <div
        className={`relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-3xl border border-white/20 bg-white/80 shadow-2xl backdrop-blur-xl transition-all duration-300 ${
          isVisible ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
      >
        {/* Header */}
        <div className="relative border-b border-white/20 bg-gradient-to-r from-emerald-600 to-emerald-500 px-8 py-6">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            aria-label="Close"
          >
            <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="text-center">
            <h2 className="text-2xl font-semibold text-white">Upgrade Your Plan</h2>
            <p className="mt-1 text-sm text-white/80">Choose the perfect plan for your business</p>
          </div>

          {/* Billing toggle */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2">
            <div className="flex items-center rounded-full bg-white/20 p-1 backdrop-blur-sm">
              <button
                onClick={() => setAnnual(false)}
                className={`rounded-full px-5 py-1.5 text-sm font-medium transition-all ${
                  !annual
                    ? "bg-white text-emerald-700 shadow-sm"
                    : "text-white/80 hover:text-white"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setAnnual(true)}
                className={`rounded-full px-5 py-1.5 text-sm font-medium transition-all ${
                  annual
                    ? "bg-white text-emerald-700 shadow-sm"
                    : "text-white/80 hover:text-white"
                }`}
              >
                Annual
                <span className="ml-1.5 text-xs text-emerald-200">Save 25%</span>
              </button>
            </div>
          </div>
        </div>

        {/* Plans grid */}
        <div className="flex gap-6 p-8 overflow-y-auto max-h-[calc(90vh-180px)]">
          {PLANS.map((plan) => {
            const tierOrder = ["starter", "farm", "enterprise"];
            const currentIndex = tierOrder.indexOf(currentTier);
            const targetIndex = tierOrder.indexOf(plan.id);
            const isCurrent = plan.id === currentTier;
            const isDowngrade = targetIndex < currentIndex;
            const canUpgrade = targetIndex > currentIndex;

            return (
              <div
                key={plan.id}
                className={`relative flex-1 rounded-2xl border transition-all ${
                  plan.highlighted
                    ? "border-emerald-300 bg-white shadow-lg shadow-emerald-100"
                    : "border-stone-200 bg-white/60"
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-emerald-500 px-4 py-1 text-xs font-semibold text-white shadow-sm">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="p-6">
                  {/* Plan header */}
                  <div className="text-center mb-6">
                    <h3 className="text-lg font-semibold text-stone-900">{plan.name}</h3>
                    <div className="mt-3 flex items-baseline justify-center">
                      <span className="text-4xl font-bold text-stone-900">
                        ${annual ? plan.annualPrice : plan.price}
                      </span>
                      <span className="ml-1 text-sm text-stone-500">/{annual ? "year" : "mo"}</span>
                    </div>
                    {annual && (
                      <p className="mt-1 text-xs text-emerald-600 font-medium">
                        ${Math.round(annual ? plan.annualPrice / 12 : plan.price)}/month billed annually
                      </p>
                    )}
                    <p className="mt-2 text-sm text-stone-500">{plan.description}</p>
                  </div>

                  {/* Features */}
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <div className={`flex-shrink-0 mt-0.5 rounded-full p-0.5 ${
                          plan.highlighted ? "bg-emerald-100" : "bg-stone-100"
                        }`}>
                          <svg className={`h-3.5 w-3.5 ${
                            plan.highlighted ? "text-emerald-600" : "text-stone-500"
                          }`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <span className="text-sm text-stone-600">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Action button */}
                  {isCurrent ? (
                    <div className="rounded-xl bg-emerald-50 py-3 text-center text-sm font-semibold text-emerald-700 border border-emerald-200">
                      Current Plan
                    </div>
                  ) : isDowngrade ? (
                    <div className="rounded-xl bg-stone-50 py-3 text-center text-sm font-medium text-stone-400 border border-stone-200">
                      Downgrade via support
                    </div>
                  ) : (
                    <button
                      onClick={() => handleUpgrade(plan.id)}
                      disabled={loading !== null}
                      className={`w-full rounded-xl py-3 text-sm font-semibold transition-all disabled:opacity-50 ${
                        plan.highlighted
                          ? "bg-gradient-to-r from-emerald-600 to-emerald-500 text-white hover:from-emerald-500 hover:to-emerald-400 shadow-sm shadow-emerald-200 hover:shadow-md"
                          : "bg-stone-900 text-white hover:bg-stone-800"
                      }`}
                    >
                      {loading === plan.id ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Processing...
                        </span>
                      ) : (
                        `Upgrade to ${plan.name}`
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="border-t border-white/20 px-8 py-4 bg-white/50">
          <p className="text-center text-xs text-stone-500">
            Need a custom solution?{" "}
            <a href="mailto:team@cielohermosa.com" className="text-emerald-600 hover:text-emerald-700 font-medium">
              Contact us
            </a>{" "}
            for Enterprise pricing.
          </p>
        </div>
      </div>
    </div>
  );
}

// Hook for easy integration
export function useUpgradePlanModal(brandId: string, currentTier: string) {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  const Modal = useCallback(() => (
    <UpgradePlanModal
      isOpen={isOpen}
      onClose={close}
      brandId={brandId}
      currentTier={currentTier}
    />
  ), [isOpen, close, brandId, currentTier]);

  return { open, close, Modal };
}