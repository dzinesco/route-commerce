// Supabase Auth Middleware - keeps existing auth working

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Public routes that don't require authentication
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
  "/api/stripe/webhook",
  "/api/resend/webhook",
  // Brand storefronts are public
  "/tuxedo",
  "/tuxedo/*",
  "/indian-river-direct",
  "/indian-river-direct/*",
  "/cart",
  "/cart/*",
  "/checkout",
  "/checkout/*",
  // Error pages
  "/error",
  "/not-found",
];

// Admin routes that require auth
const adminRoutes = ["/admin", "/water/admin"];

// Wholesale routes
const wholesaleRoutes = ["/wholesale"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if route is public
  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(route.replace("/*", ""))
  );

  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Check for auth cookie (Supabase session)
  const hasAuthCookie =
    request.cookies.get("rc_auth_uid")?.value ||
    request.cookies.get("rc_uid")?.value ||
    request.cookies.get("dev_session")?.value;

  if (!hasAuthCookie) {
    // Redirect to login
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Check for admin routes (may need additional role checking)
  const isAdminRoute = adminRoutes.some((route) => pathname.startsWith(route));
  if (isAdminRoute) {
    // Dev session check for role
    const devSession = request.cookies.get("dev_session")?.value;
    if (devSession === "store_employee") {
      // Store employees have limited admin access
      // More granular checks happen in the page components
    }
  }

  // Add security headers to all responses
  const response = NextResponse.next();
  
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  
  return response;
}

export const config = {
  matcher: [
    // Skip Next.js internals and all files in the _next directory
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Run for API routes that need auth checking
    "/(api)(?!.*\\.(?:json|ico|png|jpg|jpeg|gif|webp|svg|ttf|woff|woff2|less|css)).*)",
  ],
};