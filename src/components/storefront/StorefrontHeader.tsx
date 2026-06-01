"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/context/CartContext";

type StorefrontHeaderProps = {
  brandName: string;
  brandSlug: string;
  logoUrl?: string | null;
  logoUrlDark?: string | null;
  showWholesaleLink?: boolean;
  isAdmin?: boolean;
  brandAccent?: "green" | "orange" | "blue";
};

const ACCENT_CONFIG = {
  green: {
    wholesaleBg: "bg-emerald-700 hover:bg-emerald-800",
    wholesaleText: "text-white",
    cartBg: "bg-stone-900 hover:bg-stone-800",
    cartText: "text-white",
    cartBadge: "bg-emerald-600",
  },
  orange: {
    wholesaleBg: "bg-orange-500 hover:bg-orange-600",
    wholesaleText: "text-white",
    cartBg: "bg-stone-800 hover:bg-stone-700",
    cartText: "text-white",
    cartBadge: "bg-orange-500",
  },
  blue: {
    wholesaleBg: "bg-blue-600 hover:bg-blue-500",
    wholesaleText: "text-white",
    cartBg: "bg-stone-800 hover:bg-stone-700",
    cartText: "text-white",
    cartBadge: "bg-blue-600",
  },
};

export default function StorefrontHeader({
  brandName,
  brandSlug,
  logoUrl,
  logoUrlDark,
  showWholesaleLink = true,
  isAdmin = false,
  brandAccent = "green",
}: StorefrontHeaderProps) {
  const { cart } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const accent = ACCENT_CONFIG[brandAccent] ?? ACCENT_CONFIG.green;
  const isBlue = brandAccent === "blue";
  const isOrange = brandAccent === "orange";

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    const navLinks = [
    { label: "Home", href: `/${brandSlug}` },
    { label: "Stops", href: `/${brandSlug}#stops` },
    { label: "Products", href: `/${brandSlug}#products` },
    { label: "Our Story", href: `/${brandSlug}/about` },
    { label: "FAQ", href: `/${brandSlug}/faq` },
  ];

  const headerBg = isBlue
    ? "bg-white/95 border-stone-200 shadow-sm"
    : isOrange
    ? "bg-white/95 border-stone-200 shadow-sm"
    : "bg-white/95 border-stone-200 shadow-sm";

  const navColor = "text-stone-600";
  const navHover = "hover:text-blue-600";

  return (
    <header className={`sticky top-0 z-40 border-b backdrop-blur-md ${headerBg}`}>
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        {/* Brand */}
        <Link href={`/${brandSlug}`} className="flex items-center gap-3 group">
          {logoUrlDark ? (
            <span className="relative h-10 w-[160px]">
              <Image src={logoUrlDark} alt={brandName} fill className="object-contain object-left" />
            </span>
          ) : logoUrl ? (
            <span className="relative h-10 w-[160px]">
              <Image src={logoUrl} alt={brandName} fill className="object-contain object-left" />
            </span>
          ) : (
            <span className="text-xl font-bold tracking-tight text-stone-800">{brandName}</span>
          )}
        </Link>

        {/* Desktop nav */}
        <nav className={`hidden items-center gap-7 text-sm font-medium ${navColor} md:flex`}>
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className={`${navHover} transition-colors duration-150`}>
              {link.label}
            </Link>
          ))}
          {showWholesaleLink && (
            <Link
              href="/wholesale/login"
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${accent.wholesaleBg} ${accent.wholesaleText}`}
            >
              Wholesale
            </Link>
          )}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <Link
            href="/cart"
            className={`relative rounded-full px-4 py-2 text-sm font-semibold transition-colors ${accent.cartBg} ${accent.cartText}`}
          >
            Cart
            {cartCount > 0 && (
              <span className={`absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full ${accent.cartBadge} text-[10px] font-bold text-white`}>
                {cartCount > 9 ? "9+" : cartCount}
              </span>
            )}
          </Link>

          {/* Mobile menu button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-stone-200 text-stone-500 hover:border-stone-400 hover:text-stone-700 transition-colors md:hidden"
          >
            {menuOpen ? (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {menuOpen && (
        <div className="border-t border-stone-100 bg-white px-6 py-6 md:hidden">
          <nav className="flex flex-col gap-1 text-sm font-medium text-stone-600">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="py-2.5 transition-colors hover:text-stone-900"
              >
                {link.label}
              </Link>
            ))}
            {showWholesaleLink && (
              <Link
                href="/wholesale/login"
                onClick={() => setMenuOpen(false)}
                className="mt-2 py-2.5 font-semibold text-emerald-700 hover:text-emerald-800 transition-colors"
              >
                Wholesale Portal
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}