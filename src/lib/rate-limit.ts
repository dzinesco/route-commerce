// Rate limiting configuration using Upstash Redis
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Only enable in production or when Redis is configured
const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

export const rateLimitEnabled = Boolean(redisUrl && redisToken);

// Create rate limiters for different tiers
const createRateLimiter = (
  requests: number,
  window: string,
  prefix: string
): Ratelimit | null => {
  if (!rateLimitEnabled) return null;
  
  const redis = new Redis({
    url: redisUrl!,
    token: redisToken!,
  });

  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, window),
    analytics: true,
    prefix,
    // Custom callback for when rate limit is exceeded
    handler: async (remaining, reset, next) => {
      if (remaining === 0) {
        throw new Error(`Rate limit exceeded. Try again in ${Math.ceil((reset - Date.now()) / 1000)} seconds.`);
      }
      return next();
    },
  });
};

// API rate limits
export const apiLimiter = createRateLimiter(100, "1 m", "api:global");
export const authLimiter = createRateLimiter(10, "1 m", "api:auth");
export const checkoutLimiter = createRateLimiter(20, "1 m", "api:checkout");
export const emailLimiter = createRateLimiter(50, "1 h", "api:email");
export const bulkOpsLimiter = createRateLimiter(10, "1 m", "api:bulk");

// User-specific rate limits
export const createUserLimiter = (identifier: string, limit: number, window: string) => {
  if (!rateLimitEnabled) return null;
  
  const redis = new Redis({
    url: redisUrl!,
    token: redisToken!,
  });

  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, window),
    analytics: true,
    prefix: `user:${identifier}`,
  });
};

// Brand-specific rate limits (for multi-tenant enforcement)
export const createBrandLimiter = (brandId: string, limit: number, window: string) => {
  if (!rateLimitEnabled) return null;
  
  const redis = new Redis({
    url: redisUrl!,
    token: redisToken!,
  });

  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, window),
    analytics: true,
    prefix: `brand:${brandId}`,
  });
};

// Rate limit middleware helper
export async function checkRateLimit(
  limiter: Ratelimit | null,
  identifier: string
): Promise<{ success: boolean; remaining: number; reset: number }> {
  if (!limiter) {
    return { success: true, remaining: Infinity, reset: Date.now() };
  }

  const result = await limiter.limit(identifier);
  return {
    success: result.success,
    remaining: result.remaining,
    reset: result.reset,
  };
}

// Response headers helper
export function rateLimitHeaders(result: { remaining: number; reset: number }) {
  return {
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.reset / 1000)),
  };
}

// CORS headers for API routes
export function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
    "Access-Control-Max-Age": "86400",
  };
}

// Security headers
export function securityHeaders() {
  return {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  };
}

// Combined API response helper
export function apiResponse<T>(
  data: T,
  status: number = 200,
  meta?: Record<string, unknown>
) {
  return Response.json(
    { success: true, data, meta },
    { status, headers: securityHeaders() }
  );
}

// Error response helper
export function apiError(message: string, status: number = 400, details?: unknown) {
  return Response.json(
    { success: false, error: message, details },
    { status, headers: securityHeaders() }
  );
}

// Validation error helper
export function validationError(errors: z.ZodError) {
  return Response.json(
    {
      success: false,
      error: "Validation failed",
      details: errors.errors.map((e) => ({
        path: e.path.join("."),
        message: e.message,
      })),
    },
    { status: 400, headers: securityHeaders() }
  );
}

// Rate limit exceeded response
export function rateLimitExceeded(retryAfter: number) {
  return Response.json(
    { success: false, error: "Rate limit exceeded" },
    {
      status: 429,
      headers: {
        ...securityHeaders(),
        "Retry-After": String(retryAfter),
        "X-RateLimit-Remaining": "0",
      },
    }
  );
}

// Not authorized response
export function unauthorized(message: string = "Not authorized") {
  return Response.json(
    { success: false, error: message },
    { status: 401, headers: securityHeaders() }
  );
}

// Forbidden response
export function forbidden(message: string = "Access denied") {
  return Response.json(
    { success: false, error: message },
    { status: 403, headers: securityHeaders() }
  );
}

// Not found response
export function notFound(resource: string = "Resource") {
  return Response.json(
    { success: false, error: `${resource} not found` },
    { status: 404, headers: securityHeaders() }
  );
}