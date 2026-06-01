// Route Commerce Platform — Pricing Configuration
// All pricing constants used across billing UI, server actions, and webhooks

export const PLAN_TIERS = {
  starter: {
    label: "Starter",
    color: "bg-slate-100 text-slate-700",
    badge: null,
    monthlyPrice: 49,
    annualPrice: 441, // ~25% off
    description: "Everything you need to get started",
    highlighted: false,
    features: [
      "Products catalog",
      "Stops management (up to 10/month)",
      "Orders processing",
      "Basic Pickup",
      "1 admin user",
      "Up to 25 products",
      "Email support",
    ],
    limits: { max_users: 1, max_stops_monthly: 10, max_products: 25 },
  },
  farm: {
    label: "Farm",
    color: "bg-blue-100 text-blue-700",
    badge: "Most Popular",
    monthlyPrice: 149,
    annualPrice: 1341,
    description: "For growing farm businesses",
    highlighted: true,
    features: [
      "Everything in Starter",
      "Wholesale Portal",
      "Harvest Reach (Email & SMS)",
      "Unlimited stops",
      "Unlimited products",
      "Multi-user (up to 5)",
      "Priority support",
      "Advanced reporting",
    ],
    limits: { max_users: 5, max_stops_monthly: -1, max_products: -1 },
  },
  enterprise: {
    label: "Enterprise",
    color: "bg-violet-100 text-violet-700",
    badge: null,
    monthlyPrice: 399,
    annualPrice: 3591, // $399/mo * 12 * 0.75
    description: "For established operations that need more",
    highlighted: false,
    features: [
      "Everything in Farm",
      "AI Intelligence Pack",
      "SMS Campaigns",
      "Square Inventory Sync",
      "Water Log",
      "Unlimited users",
      "Unlimited brands",
      "Custom development",
      "Dedicated support",
      "SLA guarantee",
      "Advanced reporting",
    ],
    limits: { max_users: -1, max_stops_monthly: -1, max_products: -1 },
  },
} as const;

export type PlanTierKey = keyof typeof PLAN_TIERS;

// ── Add-ons ──────────────────────────────────────────────────────────────────

export const ADDONS = {
  harvest_reach: {
    label: "Harvest Reach",
    icon: "📧",
    description: "Email & SMS marketing campaigns",
    monthlyPrice: 79,
    annualPrice: 711,
    featureKey: "harvest_reach",
    stripePriceEnv: "STRIPE_PRICE_HARVEST_REACH",
  },
  wholesale_portal: {
    label: "Wholesale Portal",
    icon: "🏪",
    description: "B2B buyer portal with custom pricing",
    monthlyPrice: 99,
    annualPrice: 891,
    featureKey: "wholesale_portal",
    stripePriceEnv: "STRIPE_PRICE_WHOLESALE_PORTAL",
  },
  water_log: {
    label: "Water Log",
    icon: "💧",
    description: "Irrigation tracking & water usage",
    monthlyPrice: 39,
    annualPrice: 351,
    featureKey: "water_log",
    stripePriceEnv: "STRIPE_PRICE_WATER_LOG",
  },
  ai_tools: {
    label: "AI Intelligence Pack",
    icon: "🤖",
    description: "Campaign writer, pricing advisor, forecasting",
    monthlyPrice: 59,
    annualPrice: 531,
    featureKey: "ai_tools",
    stripePriceEnv: "STRIPE_PRICE_AI_TOOLS",
  },
  square_sync: {
    label: "Square Inventory Sync",
    icon: "◼️",
    description: "Sync products, orders, inventory with Square",
    monthlyPrice: 39,
    annualPrice: 351,
    featureKey: "square_sync",
    stripePriceEnv: "STRIPE_PRICE_SQUARE_SYNC",
  },
  sms_campaigns: {
    label: "SMS Campaigns",
    icon: "💬",
    description: "Text message marketing & notifications",
    monthlyPrice: 29,
    annualPrice: 261,
    featureKey: "sms_campaigns",
    stripePriceEnv: "STRIPE_PRICE_SMS_CAMPAIGNS",
  },
} as const;

export type AddonKey = keyof typeof ADDONS;

// ── Feature list per tier (for comparison table) ────────────────────────────

export const TIER_FEATURE_MATRIX: Record<PlanTierKey, string[]> = {
  starter: [
    "Products catalog",
    "Stops management (10/mo)",
    "Orders processing",
    "Basic Pickup",
    "1 admin user",
    "Up to 25 products",
    "Email support",
    "Standard reporting",
  ],
  farm: [
    "Everything in Starter",
    "Wholesale Portal",
    "Harvest Reach (Email & SMS)",
    "Unlimited stops",
    "Unlimited products",
    "Multi-user (5)",
    "Priority support",
    "Advanced reporting",
  ],
  enterprise: [
    "Everything in Farm",
    "AI Intelligence Pack",
    "SMS Campaigns",
    "Square Inventory Sync",
    "Water Log",
    "Unlimited users",
    "Unlimited brands",
    "Custom development",
    "SLA guarantee",
    "Dedicated support",
  ],
};

// ── Utility functions ────────────────────────────────────────────────────────

export function formatPrice(amount: number | null): string {
  if (amount === null) return "Custom";
  return `$${amount.toFixed(0)}`;
}

export function formatPricePerMonth(amount: number | null): string {
  if (amount === null) return "Custom";
  return `$${amount}/mo`;
}

export function getPlanMonthlyPrice(tier: PlanTierKey): number | null {
  return PLAN_TIERS[tier]?.monthlyPrice ?? null;
}

export function getPlanAnnualPrice(tier: PlanTierKey): number | null {
  return PLAN_TIERS[tier]?.annualPrice ?? null;
}

export function getAddonMonthlyPrice(addon: AddonKey): number {
  return ADDONS[addon]?.monthlyPrice ?? 0;
}

export function getAddonAnnualPrice(addon: AddonKey): number {
  return ADDONS[addon]?.annualPrice ?? 0;
}

export function calculateAnnualSavings(monthlyTotal: number): number {
  return Math.round(monthlyTotal * 0.25); // 25% annual discount
}

export const BILLING_COMPANY_NAME = "Cielo Hermosa, LLC";
export const BILLING_EMAIL = "billing@cielohermosa.com";