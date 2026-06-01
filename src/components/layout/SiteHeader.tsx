"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/context/CartContext";
import ThemeToggle from "@/components/shared/ThemeToggle";

const BRAND_NAMES: Record<string, string> = {
  tuxedo: "Tuxedo Corn",
  "indian-river-direct": "Indian River Direct",
};

export default function SiteHeader() {
  const { cart } = useCart();
  const pathname = usePathname();

  const showBrandName = pathname?.startsWith("/tuxedo") || pathname?.startsWith("/indian-river-direct");
  const brandKey = pathname?.split("/")[1];
  const brandName = brandKey ? BRAND_NAMES[brandKey] : null;

  return (
    <header className="glass border-b border-white/10 sticky top-0 z-50">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        {showBrandName && brandName ? (
          <Link href={`/${brandKey}`} className="text-lg font-semibold tracking-tight text-white hover:text-emerald-400 transition-colors">
            {brandName}
          </Link>
        ) : (
          <Link href="/" className="text-lg font-semibold tracking-tight text-white hover:text-emerald-400 transition-colors">
            Route Commerce
          </Link>
        )}

        <nav className="flex items-center gap-6 text-sm font-medium text-zinc-400">
          <Link href="/tuxedo" className="hover:text-white transition-colors">
            Tuxedo
          </Link>

          <Link href="/indian-river-direct" className="hover:text-white transition-colors">
            IRD
          </Link>

          <Link href="/admin" className="hover:text-white transition-colors">
            Admin
          </Link>

          <ThemeToggle />

          <Link href="/cart" className="rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 px-4 py-2 text-sm font-semibold text-white hover:from-emerald-400 hover:to-emerald-300 transition-all shadow-lg shadow-emerald-500/20">
            Cart ({cart.reduce((total, item) => total + item.quantity, 0)})
          </Link>
        </nav>
      </div>
    </header>
  );
}