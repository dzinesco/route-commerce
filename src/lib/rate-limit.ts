// Rate Limiting Configuration
import { NextResponse } from "next/server";

// Rate limit configuration
type Duration = `${number}${"s" | "m" | "h"}`;

interface RateLimitConfig {
  windowMs: number;
  max: number;
}

// Rate limit definitions
const RATE_LIMITS: Record<string, RateLimitConfig> = {
  api: { windowMs: 60000, max: 100 }, // 100 requests per minute
  checkout: { windowMs: 300000, max: 20 }, // 20 checkouts per 5 minutes
  email: { windowMs: 600000, max: 50 }, // 50 emails per 10 minutes
  auth: { windowMs: 900000, max: 10 }, // 10 auth attempts per 15 minutes
};

// Simple in-memory store for rate limiting (use Redis in production)
const rateLimitStore = new Map<string, { count: number; reset: number }>();

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.reset < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000);

export async function checkRateLimit(
  limiter: { windowMs: number; max: number },
  identifier: string
): Promise<{ success: boolean; remaining: number; reset: number }> {
  const key = `rate_limit_${identifier}`;
  const now = Date.now();
  const windowStart = now - limiter.windowMs;

  const current = rateLimitStore.get(key);

  if (!current || current.reset < now) {
    // New window
    rateLimitStore.set(key, { count: 1, reset: now + limiter.windowMs });
    return { success: true, remaining: limiter.max - 1, reset: now + limiter.windowMs };
  }

  if (current.count >= limiter.max) {
    // Rate limit exceeded
    return { success: false, remaining: 0, reset: current.reset };
  }

  // Increment count
  current.count++;
  rateLimitStore.set(key, current);

  return { success: true, remaining: limiter.max - current.count, reset: current.reset };
}

export function rateLimitExceeded(seconds: number) {
  return NextResponse.json(
    { error: "Rate limit exceeded. Please try again later.", retry_after: seconds },
    { status: 429, headers: { "Retry-After": String(seconds) } }
  );
}

export function securityHeaders() {
  return {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "Content-Security-Policy": "default-src 'self'",
  } as const;
}

export function rateLimitHeaders(rateCheck: { remaining: number; reset: number }) {
  return {
    "X-RateLimit-Limit": String(100),
    "X-RateLimit-Remaining": String(rateCheck.remaining),
    "X-RateLimit-Reset": String(Math.ceil(rateCheck.reset / 1000)),
  } as const;
}

// Pre-configured limiters
export const apiLimiter = RATE_LIMITS.api;
export const checkoutLimiter = RATE_LIMITS.checkout;
export const emailLimiter = RATE_LIMITS.email;
export const authLimiter = RATE_LIMITS.auth;