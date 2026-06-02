// Global Error Handler for uncaught exceptions

import { captureError, addBreadcrumb } from "./sentry";

// Handle uncaught errors
if (typeof window !== "undefined") {
  window.onerror = (message, source, lineno, colno, error) => {
    captureError(error || new Error(String(message)), {
      source,
      lineno,
      colno,
      type: "uncaught_error",
    });
    return false;
  };

  // Handle unhandled promise rejections
  window.onunhandledrejection = (event) => {
    captureError(
      event.reason instanceof Error 
        ? event.reason 
        : new Error(String(event.reason)),
      {
        type: "unhandled_rejection",
        promise: event.promise ? String(event.promise) : undefined,
      }
    );
  };
}

// Add breadcrumb for page navigation
export function trackPageNavigation(path: string) {
  addBreadcrumb(`Navigated to ${path}`, { path });
}

// Add breadcrumb for user actions
export function trackUserAction(action: string, details?: Record<string, unknown>) {
  addBreadcrumb(`User action: ${action}`, { action, ...details });
}

// Performance monitoring
export function measurePerformance(name: string, callback: () => void | Promise<void>) {
  const start = performance.now();
  
  const measure = async () => {
    await callback();
    const duration = performance.now() - start;
    
    addBreadcrumb(`Performance: ${name}`, {
      name,
      duration: `${duration.toFixed(2)}ms`,
    });
  };

  return measure();
}

// API call tracking
export async function trackApiCall<T>(
  endpoint: string,
  method: string,
  fn: () => Promise<T>
): Promise<T> {
  addBreadcrumb(`API call: ${method} ${endpoint}`, { endpoint, method });
  
  try {
    const result = await fn();
    addBreadcrumb(`API success: ${method} ${endpoint}`, { endpoint, method, success: true });
    return result;
  } catch (error) {
    captureError(error as Error, { endpoint, method });
    addBreadcrumb(`API error: ${method} ${endpoint}`, { endpoint, method, success: false });
    throw error;
  }
}

// Debug logging for development
export const debugLog = {
  info: (message: string, data?: unknown) => {
    if (process.env.NODE_ENV === "development") {
      console.info(`[DEBUG] ${message}`, data);
    }
  },
  warn: (message: string, data?: unknown) => {
    if (process.env.NODE_ENV === "development") {
      console.warn(`[DEBUG] ${message}`, data);
    }
  },
  error: (message: string, data?: unknown) => {
    if (process.env.NODE_ENV === "development") {
      console.error(`[DEBUG] ${message}`, data);
    }
  },
};