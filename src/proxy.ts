// Clerk Middleware for Next.js App Router
// Must be exported as default from proxy.ts in src/ directory

import { clerkMiddleware } from "@clerk/nextjs/server";

// Define public routes that don't require authentication
const publicRoutes = [
  "/",
  "/login",
  "/login2",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/pricing",
  "/terms-and-conditions",
  "/privacy-policy",
  "/contact",
  "/api/health",
  "/api/webhooks/clerk",
  "/api/stripe/webhook",
  // Brand storefronts are public
  "/tuxedo",
  "/tuxedo/*",
  "/indian-river-direct",
  "/indian-river-direct/*",
  // Error pages
  "/error",
  "/not-found",
];

// Export the clerkMiddleware as the default export
export default clerkMiddleware({
  // Public routes configuration
  publicRoutes,
  
  // Debug mode in development
  debug: process.env.NODE_ENV === "development",
});

export const config = {
  matcher: [
    // Skip Next.js internals and all files in the _next directory
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
    // Include Clerk's auto-proxy path for authentication
    "/__clerk/(.*)",
  ],
};