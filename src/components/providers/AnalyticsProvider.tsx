// Analytics Provider with PostHog integration

"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { posthogEnabled, identifyUser, groupByBrand } from "@/lib/analytics";

// Analytics tracking component
export function AnalyticsProvider({ userId, brandId }: { userId?: string; brandId?: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Track page views
  useEffect(() => {
    if (!posthogEnabled) return;

    const url = pathname + (searchParams.toString() ? `?${searchParams}` : "");
    
    // PostHog tracks pageviews automatically with the capture_pageview option
    // But we can manually track for better control
    import("posthog-js").then(({ posthog }) => {
      posthog.capture("$pageview", {
        path: pathname,
        url,
        referrer: document.referrer,
      });
    });
  }, [pathname, searchParams]);

  // Identify user
  useEffect(() => {
    if (!posthogEnabled || !userId) return;
    identifyUser(userId, { brand_id: brandId });
  }, [userId, brandId]);

  // Group by brand
  useEffect(() => {
    if (!posthogEnabled || !brandId) return;
    groupByBrand(brandId);
  }, [brandId]);

  return null;
}

// Hook for tracking custom events
export function useAnalytics() {
  const trackEvent = async (event: string, properties?: Record<string, unknown>) => {
    if (!posthogEnabled) return;

    const { posthog } = await import("posthog-js");
    posthog.capture(event, properties);
  };

  const trackClick = (element: string, properties?: Record<string, unknown>) => {
    trackEvent("button_clicked", { element, ...properties });
  };

  const trackFormSubmit = (form: string, success: boolean, properties?: Record<string, unknown>) => {
    trackEvent("form_submitted", { form, success, ...properties });
  };

  return {
    trackEvent,
    trackClick,
    trackFormSubmit,
  };
}

// Revenue tracking helper
export function trackRevenue(amount: number, currency: string = "USD") {
  if (!posthogEnabled) return;

  import("posthog-js").then(({ posthog }) => {
    posthog.capture("revenue", {
      amount,
      currency,
    });
  });
}

// Feature usage tracking
export function trackFeatureUsage(feature: string, properties?: Record<string, unknown>) {
  if (!posthogEnabled) return;

  import("posthog-js").then(({ posthog }) => {
    posthog.capture("feature_used", {
      feature,
      ...properties,
    });
  });
}

// Session recording wrapper for development
export function SessionRecorder() {
  useEffect(() => {
    if (process.env.NODE_ENV === "development" && posthogEnabled) {
      import("posthog-js").then(({ posthog }) => {
        posthog.startSessionRecording();
      });
    }
  }, []);

  return null;
}