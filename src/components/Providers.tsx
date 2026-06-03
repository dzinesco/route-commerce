"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { ThemeProvider } from "next-themes";
import { CartProvider } from "@/context/CartContext";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import CartToast from "@/components/storefront/CartToast";
import CartRestoredToast from "@/components/cart/CartRestoredToast";

export function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isBrandRoute = pathname?.startsWith("/tuxedo") || pathname?.startsWith("/indian-river-direct");
  const isLandingPage = pathname === "/" || pathname === "/brands";
  const isAuthPage = pathname === "/login" || pathname === "/admin/login";
  // Admin routes have their own AdminSidebar + design-system shell; suppress
  // the public SiteHeader/SiteFooter to avoid a duplicate header on every
  // admin page.
  const isAdminRoute = pathname?.startsWith("/admin");
  // Cart + checkout + wholesale pages render their own StorefrontHeader/Footer
  // (or wholesale-specific layout) — skip the public chrome to avoid doubles.
  const isStandalonePage =
    pathname?.startsWith("/cart") ||
    pathname?.startsWith("/checkout") ||
    pathname?.startsWith("/wholesale") ||
    pathname?.startsWith("/water");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
      <CartProvider>
        {!isBrandRoute && !isLandingPage && !isAuthPage && !isAdminRoute && !isStandalonePage && <SiteHeader />}
        {mounted ? children : <div style={{ visibility: 'hidden' }}>{children}</div>}
        {!isBrandRoute && !isLandingPage && !isAuthPage && !isAdminRoute && !isStandalonePage && <SiteFooter />}
        <CartToast />
        <CartRestoredToast />
      </CartProvider>
    </ThemeProvider>
  );
}