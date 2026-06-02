"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const BRAND_NAMES: Record<string, string> = {
  tuxedo: "Tuxedo Corn",
  "indian-river-direct": "Indian River Direct",
};

export default function SiteHeader() {
  const pathname = usePathname();

  const showBrandName = pathname?.startsWith("/tuxedo") || pathname?.startsWith("/indian-river-direct");
  const brandKey = pathname?.split("/")[1];
  const brandName = brandKey ? BRAND_NAMES[brandKey] : null;

  const isAdminRoute = pathname?.startsWith("/admin");
  const isStorefrontRoute = pathname?.startsWith("/tuxedo") || pathname?.startsWith("/indian-river-direct") || pathname?.startsWith("/cart") || pathname?.startsWith("/wholesale");

  return (
    <header
      className="sticky top-0 z-50 border-b backdrop-blur-xl"
      style={{
        backgroundColor: "rgba(250, 248, 245, 0.85)",
        borderColor: "rgba(107, 143, 113, 0.15)",
      }}
    >
      {/* Google Fonts */}
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap");
      `}</style>

      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center transition-transform group-hover:scale-105"
            style={{ backgroundColor: "#1a4d2e" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M13 2L4.5 13.5H11.5L10.5 22L19 10.5H12L13 2Z" fill="#faf8f5" stroke="#faf8f5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span
            className="text-lg sm:text-xl font-semibold tracking-tight"
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              color: "#1a1a1a",
            }}
          >
            {showBrandName && brandName ? brandName : "Route Commerce"}
          </span>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-5 sm:gap-6">
          {/* Brand quick links */}
          {(!isAdminRoute || isStorefrontRoute) && (
            <>
              <Link
                href="/tuxedo"
                className="text-xs sm:text-sm font-medium uppercase tracking-wider transition-colors hover:opacity-70"
                style={{
                  fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
                  color: "#6b8f71",
                  letterSpacing: "0.06em",
                }}
              >
                Tuxedo
              </Link>
              <Link
                href="/indian-river-direct"
                className="text-xs sm:text-sm font-medium uppercase tracking-wider transition-colors hover:opacity-70"
                style={{
                  fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
                  color: "#6b8f71",
                  letterSpacing: "0.06em",
                }}
              >
                IRD
              </Link>
            </>
          )}

          {/* Admin link */}
          {!isAdminRoute && (
            <Link
              href="/admin"
              className="text-xs sm:text-sm font-medium uppercase tracking-wider transition-colors hover:opacity-70"
              style={{
                fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
                color: "#6b8f71",
                letterSpacing: "0.06em",
              }}
            >
              Admin
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}