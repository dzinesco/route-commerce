// Sentry configuration for production error monitoring
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  
  // Performance monitoring
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  
  // Environment
  environment: process.env.NODE_ENV,
  
  // Release tracking
  release: process.env.GIT_SHA || process.env.VERCEL_GIT_COMMIT_SHA,
  
  // Error sampling - capture more errors in production
  sampleRate: 1.0,
  
  // Replay sessions for debugging
  replaysSessionSampleRate: process.env.NODE_ENV === "production" ? 0.05 : 0,
  replaysOnErrorSampleRate: 0.5,
  
  // Ignore common non-actionable errors
  ignoreErrors: [
    "ResizeObserver loop",
    "Non-Error promise rejection captured",
    "The operation was aborted",
  ],
  
  // Tags for filtering in Sentry dashboard
  initialScope: {
    tags: {
      source: "route-commerce",
    },
  },
  
  // BeforeSend hook for data sanitization
  beforeSend(event) {
    // Remove any PII or sensitive data before sending
    if (event.user) {
      delete event.user.ip;
      delete event.user.email;
    }
    return event;
  },
});

// Export for manual error capture
export const captureError = (error: Error, context?: Record<string, unknown>) => {
  Sentry.captureException(error, {
    extra: context,
  });
};

// Export for manual breadcrumb logging
export const addBreadcrumb = (message: string, data?: Record<string, unknown>) => {
  Sentry.addBreadcrumb({
    message,
    data,
    timestamp: Date.now() / 1000,
  });
};

// Export for user tracking during errors
export const setUserContext = (userId: string, brandId?: string) => {
  Sentry.setUser({
    id: userId,
    tags: { brand_id: brandId || "unknown" },
  });
};

// Export for transaction tracing - simplified wrapper
export async function withTransaction<T>(
  name: string,
  op: string,
  fn: () => Promise<T>
): Promise<T> {
  return Sentry.withScope(async (scope) => {
    scope.setTransactionName(name);
    try {
      const result = await fn();
      return result;
    } catch (error) {
      Sentry.captureException(error);
      throw error;
    }
  });
}