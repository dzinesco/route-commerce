// Clerk middleware for route protection

import { authMiddleware } from "@clerk/nextjs";

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
  // Brand storefronts are public
  "/tuxedo",
  "/tuxedo/*",
  "/indian-river-direct",
  "/indian-river-direct/*",
  // Error pages
  "/error",
  "/not-found",
];

// Define routes that require specific roles
const roleProtectedRoutes = [
  { path: "/admin/*", roles: ["platform_admin", "brand_admin", "store_employee"] },
  { path: "/wholesale/portal/*", roles: ["wholesale_customer"] },
  { path: "/water/admin/*", roles: ["platform_admin", "brand_admin"] },
];

export default authMiddleware({
  // Public routes - don't require auth
  publicRoutes,
  
  // Ignore auth for these paths (API routes with their own auth)
  ignoredRoutes: [
    "/api/*", // API routes handle their own auth
    "/_next/*", // Next.js internals
    "/favicon.ico",
    "/robots.txt",
    "/sitemap.xml",
  ],
  
  // After auth middleware - check roles
  afterAuth: (auth, req, evt) => {
    const { userId, sessionId } = auth;
    const path = req.nextUrl.pathname;
    
    // Skip role check for public routes
    if (publicRoutes.some(route => path.startsWith(route.replace("/*", "")))) {
      return;
    }
    
    // Check if route is role-protected
    for (const protectedRoute of roleProtectedRoutes) {
      if (path.startsWith(protectedRoute.path.replace("/*", ""))) {
        if (!userId) {
          // Redirect to login if not authenticated
          const signInUrl = new URL("/login", req.url);
          signInUrl.searchParams.set("redirect_url", path);
          return Response.redirect(signInUrl);
        }
        
        // For admin routes, check session and role
        if (protectedRoute.path.startsWith("/admin")) {
          // Admin routes require one of the allowed roles
          // This is handled by the admin-permissions module in app layer
        }
        
        if (protectedRoute.path.startsWith("/wholesale/portal")) {
          // Wholesale portal requires wholesale_customer role
          // This is handled by wholesale-auth module in app layer
        }
      }
    }
  },
  
  // Debug in development
  debug: process.env.NODE_ENV === "development",
});

export const config = {
  matcher: [
    // Skip Next.js internals and all files in the _next directory
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};