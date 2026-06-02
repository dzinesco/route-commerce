"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
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
    wholesaleBg: "bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900",
    wholesaleText: "text-white",
    cartBg: "bg-stone-900 hover:bg-stone-800 active:bg-stone-950",
    cartText: "text-white",
    cartBadge: "bg-emerald-600",
    navHover: "hover:text-emerald-600",
    activeNav: "text-emerald-600",
  },
  orange: {
    wholesaleBg: "bg-orange-500 hover:bg-orange-600 active:bg-orange-700",
    wholesaleText: "text-white",
    cartBg: "bg-stone-800 hover:bg-stone-700 active:bg-stone-900",
    cartText: "text-white",
    cartBadge: "bg-orange-500",
    navHover: "hover:text-orange-500",
    activeNav: "text-orange-500",
  },
  blue: {
    wholesaleBg: "bg-blue-600 hover:bg-blue-500 active:bg-blue-700",
    wholesaleText: "text-white",
    cartBg: "bg-stone-800 hover:bg-stone-700 active:bg-stone-900",
    cartText: "text-white",
    cartBadge: "bg-blue-600",
    navHover: "hover:text-blue-600",
    activeNav: "text-blue-600",
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

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const navLinks = [
    { label: "Home", href: `/${brandSlug}` },
    { label: "Stops", href: `/${brandSlug}#stops` },
    { label: "Products", href: `/${brandSlug}#products` },
    { label: "Our Story", href: `/${brandSlug}/about` },
    { label: "FAQ", href: `/${brandSlug}/faq` },
  ];

  const headerBg = "bg-white/95 backdrop-blur-md border-b border-stone-200/60 shadow-sm";

  return (
    <header className={`sticky top-0 z-40 ${headerBg}`}>
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 sm:px-6 py-3 sm:py-4">
        {/* Brand Logo */}
        <Link href={`/${brandSlug}`} className="flex items-center gap-3 group">
          {logoUrlDark ? (
            <span className="relative h-9 sm:h-10 w-[140px] sm:w-[160px]">
              <Image src={logoUrlDark} alt={brandName} fill className="object-contain object-left transition-transform duration-300 group-hover:scale-[1.02]" />
            </span>
          ) : logoUrl ? (
            <span className="relative h-9 sm:h-10 w-[140px] sm:w-[160px]">
              <Image src={logoUrl} alt={brandName} fill className="object-contain object-left transition-transform duration-300 group-hover:scale-[1.02]" />
            </span>
          ) : (
            <span className="text-lg sm:text-xl font-bold tracking-tight text-stone-800 group-hover:text-stone-900 transition-colors">
              {brandName}
            </span>
          )}
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-6 sm:gap-7 text-sm font-medium text-stone-600 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`relative py-1 ${accent.navHover} transition-all duration-200 group`}
            >
              <span className="relative z-10">{link.label}</span>
              <span className={`absolute -bottom-0.5 left-0 w-0 h-0.5 ${accent.activeNav.replace('hover:', '')} transition-all duration-200 group-hover:w-full rounded-full`} />
            </Link>
          ))}
          {showWholesaleLink && (
            <Link
              href="/wholesale/login"
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-200 ${accent.wholesaleBg} ${accent.wholesaleText} hover:shadow-md hover:shadow-black/10`}
            >
              Wholesale
            </Link>
          )}
        </nav>

        {/* Right Side - Cart & Mobile Menu */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Cart Button */}
          <Link
            href="/cart"
            className={`relative rounded-full px-4 sm:px-5 py-2.5 sm:py-2 text-sm font-semibold transition-all duration-200 ${accent.cartBg} ${accent.cartText} hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/10 active:scale-95`}
          >
            <span className="hidden sm:inline">Cart</span>
            <svg className="h-5 w-5 sm:hidden" fill="none" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            {cartCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className={`absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full ${accent.cartBadge} text-[10px] font-bold text-white shadow-sm`}
              >
                {cartCount > 9 ? "9+" : cartCount}
              </motion.span>
            )}
          </Link>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-stone-200 text-stone-500 transition-all duration-200 hover:border-stone-400 hover:text-stone-700 active:scale-95 md:hidden"
            aria-expanded={menuOpen}
            aria-label="Toggle menu"
          >
            <motion.div
              animate={menuOpen ? "open" : "closed"}
              className="relative w-5 h-4"
            >
              <motion.span
                animate={menuOpen ? { y: 8, rotate: 45 } : { y: 0, rotate: 0 }}
                className="absolute top-0 left-0 w-full h-0.5 bg-current rounded-full"
                transition={{ duration: 0.2 }}
              />
              <motion.span
                animate={menuOpen ? { opacity: 0 } : { opacity: 1 }}
                className="absolute top-1/2 left-0 w-full h-0.5 bg-current -translate-y-1/2 rounded-full"
                transition={{ duration: 0.2 }}
              />
              <motion.span
                animate={menuOpen ? { y: -8, rotate: -45 } : { y: 0, rotate: 0 }}
                className="absolute bottom-0 left-0 w-full h-0.5 bg-current rounded-full"
                transition={{ duration: 0.2 }}
              />
            </motion.div>
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden border-t border-stone-100 bg-white md:hidden"
          >
            <motion.nav
              initial={{ y: -10 }}
              animate={{ y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex flex-col gap-1 px-5 py-5"
            >
              {navLinks.map((link, index) => (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 py-3 px-4 rounded-xl text-stone-600 font-medium transition-all duration-200 hover:bg-stone-50 hover:text-stone-900"
                  >
                    {link.label}
                    <svg className="h-4 w-4 ml-auto text-stone-400" fill="none" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </motion.div>
              ))}
              {showWholesaleLink && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: navLinks.length * 0.05 }}
                >
                  <Link
                    href="/wholesale/login"
                    onClick={() => setMenuOpen(false)}
                    className="mt-3 flex items-center gap-3 py-3 px-4 rounded-xl bg-emerald-50 text-emerald-700 font-semibold transition-all duration-200 hover:bg-emerald-100"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Wholesale Portal
                  </Link>
                </motion.div>
              )}
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}