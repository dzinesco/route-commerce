// Sentry Configuration for Next.js
import type { SentryConfig } from "@sentry/nextjs/types/config/types";

const config: SentryConfig = {
  // Automatically analyze source maps in production
  analyzeSourceMap: process.env.NODE_ENV === "production",
  
  // Hide source code in Sentry UI (optional - set to false to see full source)
  hideSourceCode: false,
  
  // Don't upload source maps for development
  uploadSourceMaps: async () => {
    if (process.env.NODE_ENV === "production") {
      return true;
    }
    return false;
  },
  
  // Additional configuration options
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT || "route-commerce",
  
  // Release management
  release: process.env.GIT_SHA || process.env.VERCEL_GIT_COMMIT_SHA,
  
  // Enable debug mode in development
  debug: process.env.NODE_ENV === "development",
};

export default config;