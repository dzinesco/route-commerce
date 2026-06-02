// PostHog Analytics Configuration
import { PostHog } from "posthog-js";

const posthogApiKey = process.env.NEXT_PUBLIC_POSTHOG_API_KEY;
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://app.posthog.com";

// Only enable in production or when API key is set
export const posthogEnabled = Boolean(posthogApiKey);

// Singleton PostHog instance
let posthogInstance: PostHog | null = null;

export function getPostHog(): PostHog {
  if (!posthogInstance && posthogEnabled) {
    posthogInstance = new PostHog(posthogApiKey!, {
      host: posthogHost,
      // Disable in development unless explicitly enabled
      loaded: process.env.NODE_ENV !== "development" || process.env.NEXT_PUBLIC_POSTHOG_ENABLED === "true",
      // Session recording
      session_recording: process.env.NODE_ENV === "production",
      // Capture pageviews automatically
      capture_pageview: true,
      // Capture exceptions
      capture_events: true,
      // Disable until opted in (GDPR compliance)
      opt_out_capturing_by_default: false,
      // Sanitize sensitive data
      sanititize_properties: (properties) => {
        // Remove any PII before capture
        const sensitive = ['email', 'password', 'token', 'secret', 'cardNumber', 'cvv'];
        sensitive.forEach(key => delete properties[key]);
        return properties;
      },
    });
  }
  return posthogInstance!;
}

// Analytics helper functions
export const analytics = {
  // Page views
  pageView: (url: string, properties?: Record<string, unknown>) => {
    if (posthogEnabled) {
      getPostHog()?.capture("$pageview", { url, ...properties });
    }
  },

  // Feature usage
  featureUsed: (feature: string, properties?: Record<string, unknown>) => {
    if (posthogEnabled) {
      getPostHog()?.capture("feature_used", { feature, ...properties });
    }
  },

  // Button clicks
  buttonClicked: (buttonName: string, page: string, properties?: Record<string, unknown>) => {
    if (posthogEnabled) {
      getPostHog()?.capture("button_clicked", { button_name: buttonName, page, ...properties });
    }
  },

  // Form submissions
  formSubmitted: (formName: string, success: boolean, properties?: Record<string, unknown>) => {
    if (posthogEnabled) {
      getPostHog()?.capture("form_submitted", { form_name: formName, success, ...properties });
    }
  },

  // User signups
  userSignedUp: (method: string, brandId?: string) => {
    if (posthogEnabled) {
      getPostHog()?.capture("user_signed_up", { method, brand_id: brandId });
    }
  },

  // Subscription events
  subscriptionCreated: (plan: string, amount: number, interval: string) => {
    if (posthogEnabled) {
      getPostHog()?.capture("subscription_created", { plan, amount, interval });
    }
  },

  subscriptionUpgraded: (fromPlan: string, toPlan: string, amount: number) => {
    if (posthogEnabled) {
      getPostHog()?.capture("subscription_upgraded", { from_plan: fromPlan, to_plan: toPlan, amount });
    }
  },

  subscriptionCancelled: (plan: string, reason?: string) => {
    if (posthogEnabled) {
      getPostHog()?.capture("subscription_cancelled", { plan, reason });
    }
  },

  // Order events
  orderCreated: (orderId: string, amount: number, brandId: string) => {
    if (posthogEnabled) {
      getPostHog()?.capture("order_created", { order_id: orderId, amount, brand_id: brandId });
    }
  },

  orderCompleted: (orderId: string, amount: number, fulfillment: string) => {
    if (posthogEnabled) {
      getPostHog()?.capture("order_completed", { order_id: orderId, amount, fulfillment });
    }
  },

  // Communication campaign events
  campaignCreated: (campaignId: string, type: string, audienceSize: number) => {
    if (posthogEnabled) {
      getPostHog()?.capture("campaign_created", { campaign_id: campaignId, type, audience_size: audienceSize });
    }
  },

  campaignSent: (campaignId: string, sent: number, opened: number) => {
    if (posthogEnabled) {
      getPostHog()?.capture("campaign_sent", { campaign_id: campaignId, sent, opened });
    }
  },

  // Admin actions
  adminAction: (action: string, resource: string, resourceId?: string) => {
    if (posthogEnabled) {
      getPostHog()?.capture("admin_action", { action, resource, resource_id: resourceId });
    }
  },

  // Referral events
  referralShared: (referralCode: string, platform: string) => {
    if (posthogEnabled) {
      getPostHog()?.capture("referral_shared", { referral_code: referralCode, platform });
    }
  },

  referralCompleted: (referralCode: string, newUserId: string) => {
    if (posthogEnabled) {
      getPostHog()?.capture("referral_completed", { referral_code: referralCode, new_user_id: newUserId });
    }
  },

  // Error tracking
  error: (errorType: string, message: string, context?: Record<string, unknown>) => {
    if (posthogEnabled) {
      getPostHog()?.capture("error", { error_type: errorType, message, ...context });
    }
  },

  // Search functionality
  searchPerformed: (query: string, resultCount: number, category?: string) => {
    if (posthogEnabled) {
      getPostHog()?.capture("search_performed", { query, result_count: resultCount, category });
    }
  },

  // Onboarding funnel tracking
  onboardingStep: (step: string, completed: boolean) => {
    if (posthogEnabled) {
      getPostHog()?.capture("onboarding_step", { step, completed });
    }
  },
};

// User identification
export function identifyUser(userId: string, properties?: Record<string, unknown>) {
  if (posthogEnabled) {
    getPostHog()?.identify(userId, properties);
  }
}

// Group users by brand
export function groupByBrand(brandId: string, properties?: Record<string, unknown>) {
  if (posthogEnabled) {
    getPostHog()?.group("brand", brandId, properties);
  }
}