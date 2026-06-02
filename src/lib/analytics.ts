// Route Commerce Analytics Configuration
// Analytics helpers with PostHog integration ready

const posthogApiKey = process.env.NEXT_PUBLIC_POSTHOG_API_KEY;
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://app.posthog.com";

// Only enable in production or when API key is set
export const posthogEnabled = Boolean(posthogApiKey);

// Analytics helper functions
export const analytics = {
  pageView: (url: string, _properties?: Record<string, unknown>) => {
    if (posthogEnabled && typeof window !== "undefined") {
      console.log("[Analytics] Page view:", url);
    }
  },

  featureUsed: (feature: string, _properties?: Record<string, unknown>) => {
    if (posthogEnabled && typeof window !== "undefined") {
      console.log("[Analytics] Feature used:", feature);
    }
  },

  buttonClicked: (buttonName: string, page: string, _properties?: Record<string, unknown>) => {
    if (posthogEnabled && typeof window !== "undefined") {
      console.log("[Analytics] Button clicked:", buttonName, page);
    }
  },

  formSubmitted: (formName: string, success: boolean, _properties?: Record<string, unknown>) => {
    if (posthogEnabled && typeof window !== "undefined") {
      console.log("[Analytics] Form submitted:", formName, success);
    }
  },

  userSignedUp: (method: string, _brandId?: string) => {
    if (posthogEnabled && typeof window !== "undefined") {
      console.log("[Analytics] User signed up:", method);
    }
  },

  subscriptionCreated: (plan: string, amount: number, interval: string) => {
    if (posthogEnabled && typeof window !== "undefined") {
      console.log("[Analytics] Subscription created:", plan, amount, interval);
    }
  },

  subscriptionUpgraded: (fromPlan: string, toPlan: string, amount: number) => {
    if (posthogEnabled && typeof window !== "undefined") {
      console.log("[Analytics] Subscription upgraded:", fromPlan, "->", toPlan, amount);
    }
  },

  subscriptionCancelled: (plan: string, _reason?: string) => {
    if (posthogEnabled && typeof window !== "undefined") {
      console.log("[Analytics] Subscription cancelled:", plan);
    }
  },

  orderCreated: (orderId: string, amount: number, brandId: string) => {
    if (posthogEnabled && typeof window !== "undefined") {
      console.log("[Analytics] Order created:", orderId, amount, brandId);
    }
  },

  orderCompleted: (orderId: string, amount: number, fulfillment: string) => {
    if (posthogEnabled && typeof window !== "undefined") {
      console.log("[Analytics] Order completed:", orderId, amount, fulfillment);
    }
  },

  campaignCreated: (campaignId: string, type: string, audienceSize: number) => {
    if (posthogEnabled && typeof window !== "undefined") {
      console.log("[Analytics] Campaign created:", campaignId, type, audienceSize);
    }
  },

  campaignSent: (campaignId: string, sent: number, opened: number) => {
    if (posthogEnabled && typeof window !== "undefined") {
      console.log("[Analytics] Campaign sent:", campaignId, sent, opened);
    }
  },

  adminAction: (action: string, resource: string, _resourceId?: string) => {
    if (posthogEnabled && typeof window !== "undefined") {
      console.log("[Analytics] Admin action:", action, resource);
    }
  },

  referralShared: (referralCode: string, platform: string) => {
    if (posthogEnabled && typeof window !== "undefined") {
      console.log("[Analytics] Referral shared:", referralCode, platform);
    }
  },

  referralCompleted: (referralCode: string, newUserId: string) => {
    if (posthogEnabled && typeof window !== "undefined") {
      console.log("[Analytics] Referral completed:", referralCode, newUserId);
    }
  },

  error: (errorType: string, message: string, _context?: Record<string, unknown>) => {
    if (posthogEnabled && typeof window !== "undefined") {
      console.error("[Analytics] Error:", errorType, message);
    }
  },

  searchPerformed: (query: string, resultCount: number, _category?: string) => {
    if (posthogEnabled && typeof window !== "undefined") {
      console.log("[Analytics] Search performed:", query, resultCount);
    }
  },

  onboardingStep: (step: string, completed: boolean) => {
    if (posthogEnabled && typeof window !== "undefined") {
      console.log("[Analytics] Onboarding step:", step, completed);
    }
  },
};

export function identifyUser(_userId: string, _properties?: Record<string, unknown>) {
  if (posthogEnabled && typeof window !== "undefined") {
    console.log("[Analytics] User identified");
  }
}

export function groupByBrand(_brandId: string, _properties?: Record<string, unknown>) {
  if (posthogEnabled && typeof window !== "undefined") {
    console.log("[Analytics] Grouped by brand");
  }
}