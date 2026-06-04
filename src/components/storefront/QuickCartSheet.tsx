"use client";

import { useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "@/context/CartContext";
import { formatDate } from "@/lib/format-date";

type QuickCartSheetProps = {
  open: boolean;
  onClose: () => void;
  /** Optional override for the product just added (used when re-opening). */
  productName?: string;
  /** Optional message override (e.g. "Added ✓" vs default). */
  justAddedLabel?: string;
};

const EASE_OUT = [0.22, 0.61, 0.36, 1] as const;

/**
 * Slide-up cart drawer that appears immediately after the buyer adds an item.
 *
 * Mobile: bottom sheet that slides up from the bottom of the screen,
 *         full width, ~85vh tall. Drag handle at top.
 * Desktop: right-side drawer (420px wide) that slides in from the right.
 *
 * Contains:
 *  - "✓ Added" confirmation
 *  - The added item card (name, price, qty, fulfillment)
 *  - Express checkout row (Apple Pay / Google Pay / Shop Pay)
 *  - Primary "Checkout" CTA
 *  - Secondary "View full cart" link
 *  - "Continue shopping" dismiss link
 */
export default function QuickCartSheet({
  open,
  onClose,
  productName,
  justAddedLabel,
}: QuickCartSheetProps) {
  const { cart, subtotal, selectedStop, justAdded, dismissToast } = useCart();

  // Lock body scroll while open (mobile only — desktop keeps scroll)
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
    if (!isDesktop) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const displayName = productName ?? justAdded?.name ?? cart[0]?.name ?? "Your box";
  const addedAt = new Date();
  const headerLabel = justAddedLabel ?? "Just added";

  function handleViewCart() {
    dismissToast();
    onClose();
  }

  function handleCheckout() {
    dismissToast();
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.button
            type="button"
            aria-label="Close cart"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: EASE_OUT }}
            className="fixed inset-0 z-[60] bg-stone-950/55 backdrop-blur-[3px] cursor-default"
          />

          {/* Mobile: bottom sheet */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Quick cart"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 38, mass: 0.9 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 90 || info.velocity.y > 480) onClose();
            }}
            className="lg:hidden fixed inset-x-0 bottom-0 z-[61] max-h-[88vh] rounded-t-[28px] bg-[#FAF6EA] shadow-[0_-24px_60px_-12px_rgba(26,77,46,0.35)] flex flex-col"
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing">
              <div className="h-1.5 w-12 rounded-full bg-stone-300/70" />
            </div>

            <SheetContent
              displayName={displayName}
              addedAt={addedAt}
              headerLabel={headerLabel}
              cart={cart}
              subtotal={subtotal}
              selectedStop={selectedStop}
              onViewCart={handleViewCart}
              onCheckout={handleCheckout}
              onContinue={onClose}
            />
          </motion.div>

          {/* Desktop: right-side drawer */}
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Quick cart"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 36, mass: 0.9 }}
            className="hidden lg:flex fixed inset-y-0 right-0 z-[61] w-full sm:w-[420px] xl:w-[460px] bg-[#FAF6EA] shadow-[-24px_0_60px_-12px_rgba(26,77,46,0.35)] flex-col"
          >
            <SheetContent
              displayName={displayName}
              addedAt={addedAt}
              headerLabel={headerLabel}
              cart={cart}
              subtotal={subtotal}
              selectedStop={selectedStop}
              onViewCart={handleViewCart}
              onCheckout={handleCheckout}
              onContinue={onClose}
              showCloseButton
            />
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

type CartRow = {
  id: string;
  name: string;
  price: string;
  quantity: number;
  fulfillment?: "pickup" | "ship";
};

type StopInfo = {
  id: string;
  city: string;
  state: string;
  date: string;
  time: string;
  location: string;
  brand_id: string;
};

type SheetContentProps = {
  displayName: string;
  addedAt: Date;
  headerLabel: string;
  cart: CartRow[];
  subtotal: number;
  selectedStop: StopInfo | null;
  onViewCart: () => void;
  onCheckout: () => void;
  onContinue: () => void;
  showCloseButton?: boolean;
};

function SheetContent({
  displayName,
  addedAt,
  headerLabel,
  cart,
  subtotal,
  selectedStop,
  onViewCart,
  onCheckout,
  onContinue,
  showCloseButton,
}: SheetContentProps) {
  return (
    <>
      {/* Header */}
      <div className="relative px-6 sm:px-8 pt-2 pb-5 border-b border-stone-900/10">
        <div className="flex items-center gap-3">
          <motion.div
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 18, delay: 0.05 }}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1A4D2E] text-white shadow-[0_4px_14px_rgba(26,77,46,0.4)]"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </motion.div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#1A4D2E]/70">
              {headerLabel}
            </p>
            <h2 className="font-display text-[22px] sm:text-[24px] font-bold leading-[1.1] text-stone-950 truncate">
              {displayName}
            </h2>
          </div>
          {showCloseButton && (
            <button
              onClick={onContinue}
              aria-label="Close"
              className="flex h-9 w-9 items-center justify-center rounded-full text-stone-500 hover:bg-stone-900/5 hover:text-stone-900 transition-colors"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-stone-500">
          {addedAt.toLocaleString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          })} · Today
        </p>
      </div>

      {/* Body — scrollable */}
      <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-5">
        <ul className="space-y-3">
          {cart.map((item) => (
            <li
              key={item.id}
              className="flex items-start gap-4 rounded-2xl bg-white/70 ring-1 ring-stone-900/8 p-4"
            >
              {/* Tiny product swatch */}
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-[#FFD86A] via-[#F0B81C] to-[#A47A0B] ring-1 ring-stone-900/10">
                <CornGlyph className="absolute inset-0 m-auto h-9 w-9 text-[#1A4D2E]/85" />
                <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#1A4D2E] text-[10px] font-bold text-white shadow-sm">
                  {item.quantity}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-stone-950 text-[15px] leading-tight truncate">
                  {item.name}
                </p>
                <p className="mt-0.5 text-[11px] font-mono uppercase tracking-widest text-stone-500">
                  {item.fulfillment === "ship" ? "Ships to door" : "Pickup at stop"}
                </p>
                <p className="mt-1.5 text-[15px] font-bold text-stone-950">
                  {item.price}
                </p>
              </div>
            </li>
          ))}
        </ul>

        {/* Selected stop banner (if any) */}
        {selectedStop && (
          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-dashed border-[#1A4D2E]/40 bg-[#1A4D2E]/5 p-3.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1A4D2E] text-white">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-mono uppercase tracking-widest text-[#1A4D2E]/70">Pickup at</p>
              <p className="text-sm font-semibold text-stone-950 truncate">
                {selectedStop.city}, {selectedStop.state}
              </p>
              <p className="text-[11px] text-stone-600">
                {formatDate(selectedStop.date)} · {selectedStop.time}
              </p>
            </div>
          </div>
        )}

        {/* Subtotal */}
        <div className="mt-5 flex items-baseline justify-between border-t border-stone-900/10 pt-4">
          <span className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
            Subtotal
          </span>
          <span className="font-display text-2xl font-bold text-stone-950">
            ${subtotal.toFixed(2)}
          </span>
        </div>
        <p className="mt-1.5 text-[11px] text-stone-500 text-right">
          + tax & shipping at checkout
        </p>
      </div>

      {/* Footer — sticky CTA + express */}
      <div className="border-t border-stone-900/10 bg-[#F5EFD9] px-6 sm:px-8 pt-5 pb-7 space-y-3">
        {/* Express checkout row */}
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-stone-500 mb-2 text-center">
            Express checkout
          </p>
          <div className="grid grid-cols-3 gap-2">
            <ExpressButton
              href="/checkout?express=apple_pay"
              onClick={onCheckout}
              label="Pay"
              icon={<ApplePayMark />}
              className="bg-black text-white hover:bg-stone-900"
            />
            <ExpressButton
              href="/checkout?express=google_pay"
              onClick={onCheckout}
              label="Pay"
              icon={<GooglePayMark />}
              className="bg-white text-stone-900 ring-1 ring-stone-900/10 hover:bg-stone-50"
            />
            <ExpressButton
              href="/checkout?express=shop_pay"
              onClick={onCheckout}
              label="Shop"
              icon={<ShopPayMark />}
              className="bg-[#5A31F4] text-white hover:bg-[#4A22E0]"
            />
          </div>
        </div>

        {/* Primary checkout */}
        <Link
          href="/checkout"
          onClick={onCheckout}
          className="group flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#1A4D2E] text-white font-bold tracking-wide shadow-[0_10px_24px_-8px_rgba(26,77,46,0.5)] hover:bg-[#143C24] active:scale-[0.99] transition-all"
        >
          Checkout · ${subtotal.toFixed(2)}
          <svg className="h-5 w-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </Link>

        {/* Secondary actions */}
        <div className="flex items-center justify-between pt-1 text-[13px]">
          <Link
            href="/cart"
            onClick={onViewCart}
            className="font-semibold text-stone-600 hover:text-stone-950 underline-offset-4 hover:underline transition-colors"
          >
            View full cart
          </Link>
          <button
            onClick={onContinue}
            className="font-semibold text-stone-600 hover:text-stone-950 underline-offset-4 hover:underline transition-colors"
          >
            Continue shopping
          </button>
        </div>
      </div>
    </>
  );
}

function ExpressButton({
  href,
  onClick,
  label,
  icon,
  className,
}: {
  href: string;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
  className: string;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`group flex h-12 items-center justify-center gap-1.5 rounded-xl font-bold text-[13px] tracking-tight transition-all active:scale-[0.97] ${className}`}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}

/* ── Express brand marks (stylized, not official) ─────────────────── */

function ApplePayMark() {
  return (
    <svg viewBox="0 0 28 14" className="h-4 w-auto" aria-hidden="true">
      <text x="0" y="11" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="700" fontSize="12" fill="currentColor" letterSpacing="-0.5">
        Pay
      </text>
      <path
        d="M5.5 3.2c.5-.6.8-1.4.7-2.2-.7 0-1.5.5-2 1.1-.4.5-.8 1.3-.7 2.1.8 0 1.6-.4 2-1zm.7.9c-1.1 0-2 .6-2.6.6-.6 0-1.4-.6-2.3-.6-1.2 0-2.3.7-2.9 1.8C-2.9 8.1-2 11 1 11c.8 0 1.4-.5 2.3-.5s1.4.5 2.3.5c1 0 1.6-.8 2.2-1.6.7-1 .9-1.9.9-2-.1 0-1.7-.6-1.7-2.4 0-1.5 1.2-2.2 1.3-2.2-.7-1.1-1.9-1.2-2.3-1.2z"
        transform="translate(0, -3) scale(0.5)"
        fill="currentColor"
      />
    </svg>
  );
}

function GooglePayMark() {
  return (
    <svg viewBox="0 0 36 16" className="h-3.5 w-auto" aria-hidden="true">
      <text
        x="0"
        y="12"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="600"
        fontSize="11"
        fill="currentColor"
        letterSpacing="-0.3"
      >
        G
        <tspan dx="0.5" fontWeight="400" fontStyle="italic">
          Pay
        </tspan>
      </text>
    </svg>
  );
}

function ShopPayMark() {
  return (
    <svg viewBox="0 0 38 14" className="h-3.5 w-auto" aria-hidden="true">
      <text
        x="0"
        y="11"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="700"
        fontSize="11"
        fill="currentColor"
        letterSpacing="-0.4"
      >
        shop
        <tspan fontWeight="400">Pay</tspan>
      </text>
    </svg>
  );
}

function CornGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      {/* Husk leaves */}
      <path
        d="M9 16c-2-4-2-9 0-12 1 3 3 5 5 6"
        fill="currentColor"
        opacity="0.4"
      />
      <path
        d="M23 16c2-4 2-9 0-12-1 3-3 5-5 6"
        fill="currentColor"
        opacity="0.4"
      />
      {/* Cob */}
      <ellipse cx="16" cy="17" rx="6" ry="9" fill="currentColor" />
      {/* Kernels (dots) */}
      <g fill="#FAF6EA" opacity="0.7">
        <circle cx="14" cy="12" r="0.8" />
        <circle cx="18" cy="12" r="0.8" />
        <circle cx="13" cy="15" r="0.8" />
        <circle cx="16" cy="14" r="0.8" />
        <circle cx="19" cy="15" r="0.8" />
        <circle cx="14" cy="18" r="0.8" />
        <circle cx="18" cy="18" r="0.8" />
        <circle cx="16" cy="20" r="0.8" />
        <circle cx="14" cy="22" r="0.8" />
        <circle cx="18" cy="22" r="0.8" />
      </g>
    </svg>
  );
}
