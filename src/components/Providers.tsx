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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
      <CartProvider>
        {!isBrandRoute && !isLandingPage && !isAuthPage && <SiteHeader />}
        {mounted ? children : <div style={{ visibility: 'hidden' }}>{children}</div>}
        {!isBrandRoute && !isLandingPage && !isAuthPage && <SiteFooter />}
        <CartToast />
        <CartRestoredToast />
      </CartProvider>
    </ThemeProvider>
  );
}