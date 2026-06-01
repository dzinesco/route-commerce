/**
 * Feature flags / add-on licensing system for Route Commerce platform.
 *
 * Add-ons can be enabled per brand via the `brand_features` table or
 * via environment-variable defaults for self-hosted/white-label deployments.
 *
 * To add a new add-on:
 * 1. Add the feature key to BrandFeatureKey
 * 2. Add a display entry to ADDON_CATALOG
 * 3. Use isFeatureEnabled(brandId, "key") to gate UI elements
 */

import { svcHeaders } from "@/lib/svc-headers";

export type BrandFeatureKey =
  | "harvest_reach"
  | "wholesale_portal"
  | "water_log"
  | "ai_tools"
  | "square_sync"
  | "sms_campaigns"
  | "route_trace";

export type FeatureTier = "core" | "add-on" | "enterprise";

export type BrandFeature = {
  key: BrandFeatureKey;
  name: string;
  description: string;
  tier: FeatureTier;
  icon: string;
  badge?: string;
  badgeVariant?: "default" | "blue" | "violet" | "amber";
  adminRoute: string;
  addOnPrice?: string;
};

// Add-on catalog — used to render upgrade prompts and settings UI
export const ADDON_CATALOG: Record<BrandFeatureKey, BrandFeature> = {
  harvest_reach: {
    key: "harvest_reach",
    name: "Harvest Reach",
    description: "Email and SMS marketing campaigns, audience segments, stop blast messaging, and automated customer outreach.",
    tier: "add-on",
    icon: "📧",
    badge: "Popular",
    badgeVariant: "violet",
    adminRoute: "/admin/communications",
  },
  wholesale_portal: {
    key: "wholesale_portal",
    name: "Wholesale Portal",
    description: "Standalone B2B ordering portal for approved wholesale buyers with custom pricing, credit limits, and net-30 billing.",
    tier: "add-on",
    icon: "🏪",
    badge: "B2B",
    badgeVariant: "blue",
    adminRoute: "/admin/wholesale",
    addOnPrice: "Contact us",
  },
  water_log: {
    key: "water_log",
    name: "Water Log",
    description: "Irrigation tracking, headgate measurements, and water usage reporting for agricultural operations.",
    tier: "add-on",
    icon: "💧",
    badge: "Ag",
    badgeVariant: "blue",
    adminRoute: "/admin/water-log",
    addOnPrice: "Contact us",
  },
  ai_tools: {
    key: "ai_tools",
    name: "AI Intelligence Pack",
    description: "AI-powered campaign writer, product copywriter, report explainer, pricing advisor, customer insights, demand forecasting, and route optimization.",
    tier: "add-on",
    icon: "🤖",
    badge: "AI",
    badgeVariant: "violet",
    adminRoute: "/admin/settings/ai",
    addOnPrice: "OpenAI API required",
  },
  square_sync: {
    key: "square_sync",
    name: "Square Inventory Sync",
    description: "Two-way sync between Route Commerce and Square Point of Sale. Import products and sync inventory counts automatically.",
    tier: "add-on",
    icon: "◼️",
    adminRoute: "/admin/settings/square-sync",
    addOnPrice: "Square account required",
  },
  sms_campaigns: {
    key: "sms_campaigns",
    name: "SMS Campaigns",
    description: "Text message marketing and transactional SMS alerts via Twilio. Requires Harvest Reach.",
    tier: "add-on",
    icon: "💬",
    adminRoute: "/admin/communications",
    addOnPrice: "Twilio account required",
  },
  route_trace: {
    key: "route_trace",
    name: "Route Trace",
    description: "Full supply chain traceability with lot tracking, QR-enabled thermal stickers, and one-up/one-down compliance reporting.",
    tier: "add-on",
    icon: "🌱",
    badge: "Compliance",
    badgeVariant: "default",
    adminRoute: "/admin/route-trace",
    addOnPrice: "$49/mo",
  },
};

// Core features that cannot be disabled
export const CORE_FEATURES: BrandFeatureKey[] = [
  // Core platform features (always enabled)
  // These are not add-ons — the platform doesn't function without them
];

// Environment variable fallback for self-hosted / white-label deployments
// Format: NEXT_PUBLIC_ENABLED_ADDONS=harvest_reach,wholesale_portal,water_log,ai_tools
function getEnvEnabledAddons(): BrandFeatureKey[] {
  if (typeof window === "undefined") {
    const env = process.env.NEXT_PUBLIC_ENABLED_ADDONS ?? "";
    if (!env) return [];
    return env.split(",").filter(Boolean) as BrandFeatureKey[];
  }
  return [];
}

// Cache for brand feature lookup (server-side only, 5-min TTL)
const brandFeatureCache = new Map<string, { promise: Promise<Record<BrandFeatureKey, boolean>>; ts: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Check if a brand has a specific add-on feature enabled.
 * Falls back to env-var defaults if no per-brand setting exists.
 *
 * Usage in server components:
 *   const { isFeatureEnabled } = await import("@/lib/feature-flags");
 *   const enabled = await isFeatureEnabled(brandId, "harvest_reach");
 *
 * Usage in client components (reads from props/context):
 *   Pass `enabledFeatures` from server component as prop.
 */
export async function isFeatureEnabled(
  brandId: string,
  feature: BrandFeatureKey
): Promise<boolean> {
  // Check env-var override first (white-label / self-hosted)
  const envEnabled = getEnvEnabledAddons();
  if (envEnabled.includes(feature)) return true;

  // Per-brand check via RPC (5-min cache)
  const cacheKey = brandId;
  const now = Date.now();
  const cached = brandFeatureCache.get(cacheKey);
  if (cached && now - cached.ts < CACHE_TTL_MS) {
    const features = await cached.promise;
    return features[feature] ?? false;
  }
  brandFeatureCache.set(
    cacheKey,
    { promise: fetchBrandFeatures(brandId).then((f) => (f ?? {} as Record<BrandFeatureKey, boolean>)), ts: now }
  );
  const features = await brandFeatureCache.get(cacheKey)!.promise;
  return features[feature] ?? false;
}

async function fetchBrandFeatures(
  brandId: string
): Promise<Record<BrandFeatureKey, boolean> | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) return null;

  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/rpc/get_brand_features`,
      {
        method: "POST",
        headers: {
          ...svcHeaders(supabaseKey),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ p_brand_id: brandId }),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data ?? null;
  } catch {
    return null;
  }
}

/**
 * Invalidate cached features for a brand (call after feature toggle).
 */
export function invalidateBrandFeatureCache(brandId: string): void {
  brandFeatureCache.delete(brandId);
}