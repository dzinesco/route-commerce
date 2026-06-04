"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { useCart } from "@/context/CartContext";
import QuickCartSheet from "./QuickCartSheet";
import StorefrontHeader from "./StorefrontHeader";
import StorefrontFooter from "./StorefrontFooter";

type Props = {
  brandId: string;
  brandName: string;
  logoUrl?: string | null;
  logoUrlDark?: string | null;
};

const PRODUCT = {
  id: "sweet-corn-box-12",
  slug: "sweet-corn-box",
  name: "Fresh Sweet Corn Box – 12 Ears",
  tagline: "Straight-from-the-farm sweetness in every bite.",
  price: "$29.99",
  priceNumeric: 29.99,
  // Used by the existing /cart flow to filter pickup vs ship
  type: "Pickup & Shipping",
  imageUrl:
    "https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&w=1600&q=80",
  fallbackGradient:
    "radial-gradient(ellipse at 50% 50%, #FFE08A 0%, #E5A80F 35%, #8A5A06 80%, #1A4D2E 100%)",
};

const EASE_OUT = [0.22, 0.61, 0.36, 1] as const;

export default function SweetCornProductPage({ brandId, brandName, logoUrl, logoUrlDark }: Props) {
  const router = useRouter();
  const { addToCart, buyNow } = useCart();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [buyNowPulse, setBuyNowPulse] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  // Parallax for the hero corn ears floating decoration
  const { scrollY } = useScroll();
  const floatY1 = useTransform(scrollY, [0, 800], [0, -120]);
  const floatY2 = useTransform(scrollY, [0, 800], [0, 80]);

  // Auto-dismiss the "Added" pulse after a short delay
  useEffect(() => {
    if (!justAdded) return;
    const t = setTimeout(() => setJustAdded(false), 1800);
    return () => clearTimeout(t);
  }, [justAdded]);

  function buildBaseItem() {
    return {
      id: PRODUCT.id,
      name: PRODUCT.name,
      price: PRODUCT.price,
      brand_id: brandId,
      brand_slug: "tuxedo",
      is_taxable: true,
      pickup_type: "scheduled_stop" as const,
      description: PRODUCT.tagline,
    };
  }

  function handleAddToCart() {
    addToCart(buildBaseItem(), "pickup");
    setJustAdded(true);
    // Tiny delay so the user sees the "Added" state before the sheet slides up
    setTimeout(() => setSheetOpen(true), 280);
  }

  function handleBuyNow() {
    buyNow(buildBaseItem(), "pickup");
    setBuyNowPulse(true);
    setTimeout(() => router.push("/checkout"), 140);
  }

  return (
    <div className="min-h-screen bg-[#FAF6EA] text-stone-950">
      <StorefrontHeader
        brandName={brandName}
        brandSlug="tuxedo"
        logoUrl={logoUrl}
        logoUrlDark={logoUrlDark}
        showWholesaleLink
        brandAccent="green"
      />

      <main>
        {/* ── HERO ─────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-[#FAF6EA]">
          {/* Subtle paper grain */}
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none opacity-[0.035] mix-blend-multiply"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.7'/></svg>\")",
            }}
          />
          {/* Decorative giant "12" in the background */}
          <div
            aria-hidden
            className="absolute -top-20 -right-10 lg:-right-24 font-display text-[260px] lg:text-[420px] font-black leading-none text-[#E5A80F]/8 select-none pointer-events-none"
            style={{ color: "rgba(229, 168, 15, 0.08)" }}
          >
            12
          </div>

          {/* Floating decorative corn ears */}
          <motion.div
            aria-hidden
            style={{ y: floatY1 }}
            className="absolute top-32 right-[6%] hidden lg:block"
          >
            <FloatingCorn className="w-16 text-[#1A4D2E]/15 rotate-12" />
          </motion.div>
          <motion.div
            aria-hidden
            style={{ y: floatY2 }}
            className="absolute bottom-20 left-[4%] hidden lg:block"
          >
            <FloatingCorn className="w-12 text-[#E5A80F]/25 -rotate-12" />
          </motion.div>

          <div className="relative mx-auto max-w-6xl px-5 sm:px-6 lg:px-8 pt-10 sm:pt-14 lg:pt-20 pb-8 lg:pb-12">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-widest text-stone-500">
              <Link href="/tuxedo" className="hover:text-stone-900 transition-colors">
                Tuxedo Corn
              </Link>
              <Chevron />
              <Link href="/tuxedo#products" className="hover:text-stone-900 transition-colors">
                Shop
              </Link>
              <Chevron />
              <span className="text-stone-900">Sweet Corn Box</span>
            </nav>

            <div className="mt-8 lg:mt-12 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
              {/* LEFT — Visual */}
              <div className="lg:col-span-7 relative">
                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, ease: EASE_OUT }}
                  className="relative aspect-[4/3] sm:aspect-[5/4] lg:aspect-[6/5] w-full overflow-hidden rounded-[28px] ring-1 ring-stone-900/10 shadow-[0_30px_60px_-20px_rgba(26,77,46,0.35)]"
                >
                  {/* Gradient fallback (always behind, visible until image loads or on error) */}
                  <div
                    className="absolute inset-0"
                    style={{ background: PRODUCT.fallbackGradient }}
                  />
                  {/* Decorative corn cobs inside the image frame */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <CornIllustration className="w-3/5 max-w-[420px] text-[#1A4D2E]/55" />
                  </div>
                  {!imgError && (
                    <Image
                      src={PRODUCT.imageUrl}
                      alt="Freshly harvested Olathe Sweet sweet corn"
                      fill
                      priority
                      sizes="(min-width: 1024px) 58vw, 100vw"
                      className={`object-cover transition-opacity duration-700 ${
                        imgLoaded ? "opacity-100" : "opacity-0"
                      }`}
                      onLoad={() => setImgLoaded(true)}
                      onError={() => setImgError(true)}
                    />
                  )}
                  {/* Bottom scrim for badge legibility */}
                  <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/35 to-transparent pointer-events-none" />
                  {/* Tilted corner stamp */}
                  <motion.div
                    initial={{ opacity: 0, rotate: 0, scale: 0.6 }}
                    animate={{ opacity: 1, rotate: -8, scale: 1 }}
                    transition={{ delay: 0.55, type: "spring", stiffness: 200, damping: 14 }}
                    className="absolute top-5 left-5 lg:top-7 lg:left-7 origin-top-left"
                  >
                    <div className="flex h-[88px] w-[88px] lg:h-[100px] lg:w-[100px] flex-col items-center justify-center rounded-full border-2 border-dashed border-white/85 bg-[#1A4D2E]/90 text-white text-center shadow-lg backdrop-blur-sm">
                      <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-white/70">
                        Peak
                      </span>
                      <span className="font-display text-[20px] lg:text-[22px] font-black leading-none">
                        SEASON
                      </span>
                      <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-white/70">
                        2026
                      </span>
                    </div>
                  </motion.div>
                  {/* Right corner "12 ears" badge */}
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4, duration: 0.5 }}
                    className="absolute bottom-5 right-5 lg:bottom-7 lg:right-7"
                  >
                    <div className="rounded-2xl bg-white/95 px-3.5 py-2 ring-1 ring-stone-900/10 shadow-lg backdrop-blur-sm">
                      <p className="font-mono text-[9px] uppercase tracking-widest text-stone-500 leading-none">
                        Box contains
                      </p>
                      <p className="font-display text-[22px] font-black text-stone-950 leading-none mt-0.5">
                        12 ears
                      </p>
                    </div>
                  </motion.div>
                </motion.div>

                {/* Thumbnails row (decorative — same image) */}
                <div className="mt-4 flex gap-3">
                  {[0, 1, 2].map((i) => (
                    <button
                      key={i}
                      aria-label={`View image ${i + 1}`}
                      className={`relative aspect-square w-16 sm:w-20 overflow-hidden rounded-xl ring-2 transition-all ${
                        i === 0
                          ? "ring-[#1A4D2E]"
                          : "ring-stone-900/10 hover:ring-stone-900/30"
                      }`}
                    >
                      <div
                        className="absolute inset-0"
                        style={{ background: PRODUCT.fallbackGradient }}
                      />
                      <CornIllustration className="absolute inset-0 m-auto w-3/5 text-[#1A4D2E]/55" />
                    </button>
                  ))}
                  <div className="ml-auto hidden sm:flex items-center gap-1.5 rounded-xl bg-stone-900/5 px-3 py-2 text-[10px] font-mono uppercase tracking-widest text-stone-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Lot 04-26 · In season
                  </div>
                </div>
              </div>

              {/* RIGHT — Copy + Buy Box */}
              <div className="lg:col-span-5">
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.1, ease: EASE_OUT }}
                >
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1A4D2E] px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#FCD34D] animate-pulse" />
                      Ships fresh
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
                      Same-day harvest when possible
                    </span>
                  </div>

                  <h1 className="mt-5 font-display text-[44px] sm:text-[52px] lg:text-[60px] font-black leading-[0.95] tracking-[-0.02em] text-stone-950">
                    <span className="block">Sweet Corn</span>
                    <span className="block italic font-normal text-[#1A4D2E]">Box</span>
                  </h1>

                  <p className="mt-4 font-display text-[19px] sm:text-[21px] leading-[1.35] text-stone-700 italic">
                    {PRODUCT.tagline}
                  </p>

                  <p className="mt-5 text-[15px] leading-relaxed text-stone-700 max-w-prose">
                    Our 12-Ear Corn Box is packed with peak-season, super-sweet corn picked
                    that morning and rushed to your door. Perfect for BBQs, family dinners,
                    or freezing for winter.
                  </p>

                  {/* Why our corn (inline) */}
                  <ul className="mt-6 space-y-2.5">
                    {WHY_CORN.map((item) => (
                      <li key={item.title} className="flex items-start gap-3">
                        <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#1A4D2E] text-white">
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </span>
                        <div>
                          <span className="font-bold text-stone-950 text-[14px]">
                            {item.title}
                          </span>
                          <span className="text-stone-600 text-[14px]">
                            {item.body && <> — {item.body}</>}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>

                  {/* Price + buy box (desktop sticky) */}
                  <div
                    id="buy-box"
                    className="mt-8 lg:mt-10 rounded-3xl bg-white ring-1 ring-stone-900/10 p-6 sm:p-7 shadow-[0_20px_40px_-12px_rgba(26,77,46,0.18)]"
                  >
                    <div className="flex items-end justify-between gap-4">
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
                          One box · 12 ears
                        </p>
                        <p className="mt-1 font-display text-[44px] font-black leading-none tracking-tight text-stone-950">
                          {PRODUCT.price}
                        </p>
                        <p className="mt-1 text-[11px] text-stone-500">
                          ≈ $2.50 / ear · tax included
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
                          In stock
                        </p>
                        <p className="mt-1 font-display text-[20px] font-bold text-[#1A4D2E]">
                          240 boxes
                        </p>
                        <p className="text-[10px] text-stone-500">ready this week</p>
                      </div>
                    </div>

                    {/* Quantity */}
                    <div className="mt-5 flex items-center gap-3">
                      <span className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
                        Qty
                      </span>
                      <div className="inline-flex items-center rounded-full ring-1 ring-stone-900/15 bg-stone-50">
                        <button
                          aria-label="Decrease quantity"
                          className="h-10 w-10 flex items-center justify-center text-stone-700 hover:text-stone-950 hover:bg-stone-100 rounded-l-full transition-colors"
                          onClick={() => {
                            /* single-product page — qty is always 1 for now */
                          }}
                        >
                          −
                        </button>
                        <span className="w-10 text-center font-bold text-stone-950">1</span>
                        <button
                          aria-label="Increase quantity"
                          className="h-10 w-10 flex items-center justify-center text-stone-700 hover:text-stone-950 hover:bg-stone-100 rounded-r-full transition-colors"
                        >
                          +
                        </button>
                      </div>
                      <span className="ml-auto text-[12px] text-stone-500 hidden sm:inline">
                        Ships in a compostable cooler
                      </span>
                    </div>

                    {/* Add to Cart (primary) */}
                    <motion.button
                      onClick={handleAddToCart}
                      whileTap={{ scale: 0.98 }}
                      className={`mt-5 relative w-full overflow-hidden rounded-2xl h-14 sm:h-16 font-bold text-[15px] sm:text-[16px] tracking-wide transition-all ${
                        justAdded
                          ? "bg-[#1A4D2E] text-white"
                          : "bg-stone-950 text-white hover:bg-stone-800"
                      }`}
                    >
                      <AnimatePresence mode="wait">
                        {justAdded ? (
                          <motion.span
                            key="added"
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -12 }}
                            transition={{ duration: 0.18 }}
                            className="flex items-center justify-center gap-2"
                          >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            Added to cart
                          </motion.span>
                        ) : (
                          <motion.span
                            key="add"
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -12 }}
                            transition={{ duration: 0.18 }}
                            className="flex items-center justify-center gap-2"
                          >
                            Add Box to Cart · {PRODUCT.price}
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </motion.button>

                    {/* Buy Now (secondary, urgent orange) */}
                    <motion.button
                      onClick={handleBuyNow}
                      whileTap={{ scale: 0.98 }}
                      className={`mt-3 group relative w-full overflow-hidden rounded-2xl h-12 sm:h-[52px] font-bold text-[14px] tracking-wide transition-all ${
                        buyNowPulse
                          ? "bg-[#D97706] text-white"
                          : "bg-[#FFF1D6] text-[#9A4A06] ring-1 ring-[#E5A80F]/40 hover:bg-[#FFE7B0]"
                      }`}
                    >
                      <span className="flex items-center justify-center gap-2">
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" />
                        </svg>
                        Quick Buy — Ships Today
                        <span className="ml-1 font-mono text-[10px] font-medium uppercase tracking-widest opacity-70 hidden sm:inline">
                          1-click
                        </span>
                      </span>
                    </motion.button>

                    {/* Express row (visual only) */}
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <ExpressChip label="Apple Pay" />
                      <ExpressChip label="Google Pay" />
                      <ExpressChip label="Shop Pay" />
                    </div>

                    <p className="mt-4 text-center text-[11px] text-stone-500">
                      One click. One box. Farm-fresh delivered.
                    </p>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </section>

        {/* ── GUARANTEE / TRUST STRIP ─────────────────────────────────────── */}
        <section className="relative bg-[#1A4D2E] text-white overflow-hidden">
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.08]"
            style={{
              background:
                "radial-gradient(ellipse at 20% 50%, rgba(252, 211, 77, 0.4) 0%, transparent 50%), radial-gradient(ellipse at 80% 50%, rgba(252, 211, 77, 0.3) 0%, transparent 50%)",
            }}
          />
          <div className="relative mx-auto max-w-6xl px-5 sm:px-6 lg:px-8 py-12 sm:py-16">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
              <TrustColumn
                icon={<TruckIcon />}
                eyebrow="Ships Fresh"
                title="Same-day harvest when possible"
                body="We pick before the heat steals a single calorie of sweetness. By the time your order arrives, the corn was still in the field that morning."
              />
              <TrustColumn
                icon={<ShieldIcon />}
                eyebrow="Satisfaction"
                title="100% Sweetness Guarantee"
                body="If it’s not the sweetest corn you’ve ever had, we’ll replace it. No questions, no forms, no fuss."
                accent
              />
              <TrustColumn
                icon={<SparkleIcon />}
                eyebrow="Versatile"
                title="Great for every summer table"
                body="Grilling, boiling, freezing, or corn-on-the-cob parties — twelve ears is exactly the right amount for a family of four to share."
              />
            </div>
          </div>
        </section>

        {/* ── FARM STORY ─────────────────────────────────────────────────── */}
        <section className="relative bg-[#F3EDD8]">
          <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8 py-20 sm:py-28">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
              <div className="lg:col-span-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#9A4A06]">
                  Field notes · Vol. IV
                </p>
                <h2 className="mt-4 font-display text-[36px] sm:text-[44px] lg:text-[52px] font-black leading-[1.02] tracking-tight text-stone-950">
                  Picked by hand, <span className="italic font-normal text-[#1A4D2E]">stayed</span> sweet for days.
                </h2>
                <p className="mt-5 text-stone-700 text-[16px] leading-relaxed max-w-prose">
                  We hand-select every ear for size and quality. No machine knows when a
                  cob is at peak sugar content. That’s why your box is a little heavier
                  than you expect — and a whole lot sweeter than any corn you’ve bought
                  from a grocery store shelf.
                </p>
                <div className="mt-8 flex flex-wrap items-center gap-6">
                  <Stat number="40+" label="Years growing" />
                  <span className="h-10 w-px bg-stone-900/15" />
                  <Stat number="3" label="Generations" />
                  <span className="h-10 w-px bg-stone-900/15" />
                  <Stat number="100%" label="Hand-picked" />
                </div>
              </div>

              <div className="lg:col-span-7 relative">
                <div className="relative aspect-[5/4] overflow-hidden rounded-[28px] ring-1 ring-stone-900/10 shadow-[0_30px_60px_-20px_rgba(26,77,46,0.35)]">
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        "linear-gradient(135deg, #FCD34D 0%, #E5A80F 45%, #8A5A06 100%)",
                    }}
                  />
                  {/* Abstract corn field lines */}
                  <svg
                    viewBox="0 0 400 320"
                    className="absolute inset-0 w-full h-full"
                    aria-hidden
                  >
                    <defs>
                      <pattern id="rows" width="50" height="20" patternUnits="userSpaceOnUse" patternTransform="rotate(-8)">
                        <line x1="0" y1="10" x2="50" y2="10" stroke="#1A4D2E" strokeWidth="2" strokeLinecap="round" />
                      </pattern>
                    </defs>
                    <rect width="400" height="320" fill="url(#rows)" opacity="0.45" />
                  </svg>
                  {/* Floating cob clusters */}
                  <CornIllustration className="absolute -left-6 top-1/2 -translate-y-1/2 w-32 text-[#1A4D2E]/85 rotate-[-8deg]" />
                  <CornIllustration className="absolute right-6 top-8 w-24 text-[#1A4D2E]/75 rotate-[12deg]" />
                  <CornIllustration className="absolute right-16 bottom-8 w-20 text-[#1A4D2E]/70 -rotate-6" />
                  {/* Sun stamp */}
                  <div className="absolute top-5 right-5 h-20 w-20 rounded-full bg-[#FFE08A] ring-4 ring-[#1A4D2E]/15 flex items-center justify-center">
                    <span className="font-display text-[10px] font-bold text-[#1A4D2E] text-center leading-tight">
                      HAND
                      <br />
                      PICKED
                    </span>
                  </div>
                  {/* Bottom data strip */}
                  <div className="absolute inset-x-4 bottom-4 rounded-2xl bg-stone-950/90 backdrop-blur-sm px-4 py-3 flex items-center justify-between text-white text-[11px] font-mono">
                    <div>
                      <span className="text-white/50">FIELD</span> · 04-N
                    </div>
                    <div>
                      <span className="text-white/50">BRIX</span> · 24.2°
                    </div>
                    <div>
                      <span className="text-white/50">PICK</span> · 06:14
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── FAQ MICRO ──────────────────────────────────────────────────── */}
        <section className="relative bg-[#FAF6EA]">
          <div className="mx-auto max-w-4xl px-5 sm:px-6 lg:px-8 py-20 sm:py-24">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#9A4A06] text-center">
              Buyer’s notes
            </p>
            <h2 className="mt-4 font-display text-[36px] sm:text-[44px] font-black leading-tight text-center text-stone-950">
              Questions, answered.
            </h2>
            <div className="mt-12 divide-y divide-stone-900/10 border-t border-b border-stone-900/10">
              {FAQS.map((faq) => (
                <FAQItem key={faq.q} q={faq.q} a={faq.a} />
              ))}
            </div>
          </div>
        </section>

        {/* ── FINAL CTA STRIP (desktop) ─────────────────────────────────── */}
        <section className="hidden lg:block relative bg-stone-950 text-white overflow-hidden">
          <div
            aria-hidden
            className="absolute inset-0 opacity-30"
            style={{
              background:
                "radial-gradient(ellipse at 30% 50%, rgba(229, 168, 15, 0.5) 0%, transparent 60%), radial-gradient(ellipse at 80% 50%, rgba(26, 77, 46, 0.6) 0%, transparent 60%)",
            }}
          />
          <div className="relative mx-auto max-w-6xl px-8 py-16 flex items-center justify-between gap-10">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#FCD34D]">
                Ready when you are
              </p>
              <h3 className="mt-3 font-display text-[40px] font-black leading-[1.05]">
                Twelve ears. <span className="italic font-normal">One click.</span>
              </h3>
              <p className="mt-2 text-stone-400 max-w-md">
                Free shipping on orders over $40. Cancel anytime before harvest.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={handleAddToCart}
                className="rounded-2xl h-14 px-7 bg-white text-stone-950 font-bold hover:bg-stone-100 active:scale-[0.98] transition-all"
              >
                Add to cart — {PRODUCT.price}
              </button>
              <button
                onClick={handleBuyNow}
                className="rounded-2xl h-14 px-7 bg-[#FCD34D] text-stone-950 font-bold hover:bg-[#FBBF24] active:scale-[0.98] transition-all"
              >
                Quick Buy
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* ── STICKY MOBILE BOTTOM CTA BAR ──────────────────────────────────── */}
      <div className="lg:hidden fixed inset-x-0 bottom-0 z-40 bg-[#FAF6EA]/95 backdrop-blur-xl border-t border-stone-900/10 shadow-[0_-12px_30px_-12px_rgba(26,77,46,0.3)]">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[9px] uppercase tracking-widest text-stone-500 leading-none">
              12-Ear Box
            </p>
            <p className="mt-1 font-display text-[26px] font-black leading-none text-stone-950">
              {PRODUCT.price}
            </p>
          </div>
          <button
            onClick={handleBuyNow}
            className="h-14 min-w-[120px] rounded-2xl bg-[#FFF1D6] text-[#9A4A06] font-bold text-[14px] ring-1 ring-[#E5A80F]/40 active:scale-[0.98] transition-all"
          >
            Quick Buy
          </button>
          <button
            onClick={handleAddToCart}
            className="h-14 min-w-[160px] rounded-2xl bg-stone-950 text-white font-bold text-[15px] active:scale-[0.98] transition-all"
          >
            Add · {PRODUCT.price}
          </button>
        </div>
        {/* Safe-area spacer for iOS */}
        <div className="h-[env(safe-area-inset-bottom)]" />
      </div>

      {/* Bottom padding so sticky bar doesn't cover last content on mobile */}
      <div className="lg:hidden h-28" aria-hidden />

      <StorefrontFooter
        brandName={brandName}
        brandSlug="tuxedo"
        logoUrl={logoUrl}
        logoUrlDark={logoUrlDark}
        brandAccent="green"
      />

      <QuickCartSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        productName={PRODUCT.name}
      />
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────────── */

function TrustColumn({
  icon,
  eyebrow,
  title,
  body,
  accent,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  body: string;
  accent?: boolean;
}) {
  return (
    <div className="relative">
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
          accent ? "bg-[#FCD34D] text-stone-950" : "bg-white/10 text-[#FCD34D]"
        } ring-1 ring-white/15`}
      >
        {icon}
      </div>
      <p
        className={`mt-5 font-mono text-[10px] uppercase tracking-[0.25em] ${
          accent ? "text-[#FCD34D]" : "text-white/60"
        }`}
      >
        {eyebrow}
      </p>
      <h3 className="mt-2 font-display text-[24px] font-bold leading-[1.15] text-white">
        {title}
      </h3>
      <p className="mt-3 text-[14px] leading-relaxed text-white/75 max-w-sm">{body}</p>
    </div>
  );
}

function Stat({ number, label }: { number: string; label: string }) {
  return (
    <div>
      <p className="font-display text-[40px] font-black leading-none text-stone-950">
        {number}
      </p>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-stone-500">
        {label}
      </p>
    </div>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="py-5">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-4 text-left group"
      >
        <span className="font-display text-[18px] sm:text-[20px] font-bold text-stone-950 group-hover:text-[#1A4D2E] transition-colors">
          {q}
        </span>
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1 ring-stone-900/15 transition-transform duration-300 ${
            open ? "rotate-45 bg-stone-950 text-white" : "text-stone-700"
          }`}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: EASE_OUT }}
            className="overflow-hidden"
          >
            <p className="pt-3 text-[15px] leading-relaxed text-stone-700 max-w-prose">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Chevron() {
  return (
    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

function ExpressChip({ label }: { label: string }) {
  return (
    <div className="flex h-9 items-center justify-center rounded-lg bg-stone-100 ring-1 ring-stone-900/5 text-[11px] font-semibold text-stone-700">
      {label}
    </div>
  );
}

function TruckIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h11v10H3z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 10h4l3 3v4h-7z" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="17" cy="18" r="2" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5z" />
    </svg>
  );
}

function CornIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 140" className={className} aria-hidden="true">
      {/* Husk leaves */}
      <path
        d="M30 70c-12-15-15-40-5-60 5 18 15 30 25 38"
        fill="currentColor"
        opacity="0.55"
      />
      <path
        d="M70 70c12-15 15-40 5-60-5 18-15 30-25 38"
        fill="currentColor"
        opacity="0.55"
      />
      <path
        d="M50 75c-3-20 0-50 5-65 1 20-1 45-3 60"
        fill="currentColor"
        opacity="0.45"
      />
      {/* Cob */}
      <ellipse cx="50" cy="78" rx="20" ry="34" fill="currentColor" />
      {/* Kernels */}
      <g fill="#FAF6EA" opacity="0.75">
        {Array.from({ length: 8 }).map((_, row) =>
          Array.from({ length: 5 }).map((_, col) => {
            const x = 50 - 14 + col * 7 + (row % 2 ? 3.5 : 0);
            const y = 55 + row * 6;
            return <circle key={`${row}-${col}`} cx={x} cy={y} r="1.6" />;
          })
        )}
      </g>
      {/* Silk at top */}
      <g stroke="currentColor" strokeWidth="1.4" fill="none" opacity="0.7" strokeLinecap="round">
        <path d="M50 45c-6-8-12-12-18-12" />
        <path d="M50 45c0-10 4-15 8-20" />
        <path d="M50 45c6-6 12-8 18-10" />
      </g>
    </svg>
  );
}

function FloatingCorn({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 80" className={className} aria-hidden="true">
      <ellipse cx="30" cy="40" rx="14" ry="24" fill="currentColor" />
      <g fill="white" opacity="0.3">
        <circle cx="26" cy="28" r="1.2" />
        <circle cx="32" cy="32" r="1.2" />
        <circle cx="28" cy="38" r="1.2" />
        <circle cx="34" cy="42" r="1.2" />
        <circle cx="26" cy="48" r="1.2" />
        <circle cx="32" cy="52" r="1.2" />
        <circle cx="28" cy="58" r="1.2" />
      </g>
    </svg>
  );
}

/* ── Static data ─────────────────────────────────────────────── */

const WHY_CORN = [
  { title: "Naturally grown & non-GMO", body: "no lab has touched this seed" },
  { title: "Harvested at peak sugar content", body: "before the heat can steal a calorie" },
  { title: "Hand-selected for size & quality", body: "the only machine we trust is a cooler" },
  { title: "Stays sweet for days in the fridge", body: "and freezes beautifully for winter" },
];

const FAQS = [
  {
    q: "How fast will my box ship?",
    a: "Same-day harvest when the weather cooperates. You’ll get a tracking link the moment the cooler leaves the farm — typically within 24 hours of your order.",
  },
  {
    q: "Can I pick up at a local stop instead?",
    a: "Yes — at checkout, choose pickup and select a stop near you. We deliver to scheduled stops in Colorado, Utah, New Mexico, and Arizona through the summer.",
  },
  {
    q: "What if my corn isn’t the sweetest I’ve ever had?",
    a: "We replace it. Send a photo to hello@tuxedocorn.com and we’ll send a fresh box the next morning. No forms, no questions.",
  },
  {
    q: "How long does it stay fresh?",
    a: "Seven days in the fridge with the husks on. Three months in the freezer if you blanch it for three minutes first.",
  },
];
