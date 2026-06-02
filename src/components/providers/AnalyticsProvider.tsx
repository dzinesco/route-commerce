// Analytics Provider Component
"use client";

import { useEffect } from "react";

export default function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Track initial page view
    if (typeof window !== "undefined") {
      console.log("[Analytics] Page loaded:", window.location.pathname);
    }
  }, []);

  return <>{children}</>;
}