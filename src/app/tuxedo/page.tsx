"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { useCart } from "@/context/CartContext";
import TuxedoVideoHero from "@/components/storefront/TuxedoVideoHero";
import CinematicShowcase from "@/components/storefront/CinematicShowcase";
import LayoutContainer from "@/components/layout/LayoutContainer";
import ProductCard from "@/components/storefront/ProductCard";
import PaginatedStops from "@/components/storefront/PaginatedStops";
import StorefrontHeader from "@/components/storefront/StorefrontHeader";
import StorefrontFooter from "@/components/storefront/StorefrontFooter";
import BrandStylesProvider from "@/components/storefront/BrandStylesProvider";
import { ScrollReveal, ParallaxLayer, FadeOnScroll } from "@/components/ui/ScrollAnimations";
import { supabase } from "@/lib/supabase";
import { getBrandSettingsPublic } from "@/actions/brand-settings";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Register GSAP plugins
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

type Brand = {
  id: string;
  name: string;
  slug: string;
};

type Stop = {
  id: string;
  city: string;
  state: string;
  date: string;
  time: string;
  location: string;
  slug: string;
  brand_id: string;
};

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  type: string;
  image_url: string | null;
  brand_id: string;
  is_taxable?: boolean;
  pickup_type?: "scheduled_stop" | "shed";
};

// ── Why Choose Tuxedo Corn — editorial masonry redesign ─────────────
type FeatureColor = "emerald" | "amber";

interface Feature {
  color: FeatureColor;
  label: string;
  headline: string;
  story: string;
  accentColor: string;
  accentGlow: string;
  accentHover: string;
  size: "tall" | "normal";
  icon: React.ReactNode;
}

const FEATURES: Feature[] = [
  {
    color: "emerald",
    label: "Hand-Harvested",
    headline: "Picked by Hand, Every Ear",
    story: "Three generations of careful hands move through every row. No machine knows when an ear is perfectly ripe the way a farmer's daughter does.",
    accentColor: "bg-emerald-500",
    accentGlow: "hover:shadow-emerald-500/20",
    accentHover: "group-hover:bg-gradient-to-r group-hover:from-emerald-500 group-hover:to-emerald-600",
    size: "tall",
    icon: (
      <svg viewBox="0 0 48 48" fill="none" className="w-14 h-14 -mt-1" stroke="currentColor" strokeWidth="1.2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 14c0-1 .9-2 2-2s2 1 2 2-.9 2-2 2-2-1-2-2z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 20v6c0 3 3 5 6 5s6-2 6-5v-6" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 20v2M20 18v4" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M28 14c0-1 .9-2 2-2s2 1 2 2-.9 2-2 2-2-1-2-2z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M28 20v6c0 3 3 5 6 5s6-2 6-5v-6" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M32 20v2M36 18v4" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 31v6h12v-6" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M22 31h4M32 31h4" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M24 14l4-4 4 4" />
      </svg>
    ),
  },
  {
    color: "emerald",
    label: "Non-GMO",
    headline: "Seed to Field, Naturally",
    story: "Our Olathe Sweet seed has never been touched by a laboratory. The flavor was shaped by forty summers of patient selection — nothing added, nothing altered.",
    accentColor: "bg-emerald-500",
    accentGlow: "hover:shadow-emerald-500/20",
    accentHover: "group-hover:bg-gradient-to-r group-hover:from-emerald-500 group-hover:to-emerald-600",
    size: "normal",
    icon: (
      <svg viewBox="0 0 48 48" fill="none" className="w-14 h-14 -mt-1" stroke="currentColor" strokeWidth="1.2">
        <circle cx="24" cy="24" r="10" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M24 14v10l6 4" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 10l-3-3 3-3 3 3-3 3" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M30 10l3-3-3-3-3 3 3 3" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 38l-3 3 3 3 3-3-3-3" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M30 38l3 3 3-3-3-3 3-3" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 24l-3 3 3 3 3-3-3-3" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M38 24l3 3 3-3-3-3 3-3" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M14 18l2 2M32 18l2 2M14 30l2-2M32 30l2-2" />
      </svg>
    ),
  },
  {
    color: "emerald",
    label: "Colorado Grown",
    headline: "Born in the High Country",
    story: "Olathe Sweet was developed for Colorado's mountain climate — intense sun by day, crisp nights by morning. That contrast makes a sweetness no other soil can claim.",
    accentColor: "bg-emerald-500",
    accentGlow: "hover:shadow-emerald-500/20",
    accentHover: "group-hover:bg-gradient-to-r group-hover:from-emerald-500 group-hover:to-emerald-600",
    size: "normal",
    icon: (
      <svg viewBox="0 0 48 48" fill="none" className="w-14 h-14 -mt-1" stroke="currentColor" strokeWidth="1.2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M24 8l12 20H12L24 8z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M24 8l-6 10h12l-6-10" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 28l6 12 6-12" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M24 40v-4" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 40h36" />
      </svg>
    ),
  },
  {
    color: "emerald",
    label: "Regenerative",
    headline: "Our Roots Run Deep",
    story: "We give back more than we take. Our soil is healthier today than forty years ago — not because we had to, but because this land deserves that kind of care.",
    accentColor: "bg-emerald-500",
    accentGlow: "hover:shadow-emerald-500/20",
    accentHover: "group-hover:bg-gradient-to-r group-hover:from-emerald-500 group-hover:to-emerald-600",
    size: "tall",
    icon: (
      <svg viewBox="0 0 48 48" fill="none" className="w-14 h-14 -mt-1" stroke="currentColor" strokeWidth="1.2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M24 40v-16" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M24 24c0-8 6-14 14-14-2 8-8 14-14 14" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M24 24c0-8-6-14-14-14 2 8 8 14 14 14" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M24 28c0 6 5 10 10 10-2-6-6-10-10-10" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M24 28c0 6-5 10-10 10 2-6 6-10 10-10" />
      </svg>
    ),
  },
  {
    color: "amber",
    label: "Peak Freshness",
    headline: "Harvested the Morning You Order",
    story: "We pick before the heat steals a single calorie of sweetness. By the time your order arrives, the corn was still in the field that same morning.",
    accentColor: "bg-amber-500",
    accentGlow: "hover:shadow-amber-500/20",
    accentHover: "group-hover:bg-gradient-to-r group-hover:from-amber-500 group-hover:to-amber-600",
    size: "normal",
    icon: (
      <svg viewBox="0 0 48 48" fill="none" className="w-14 h-14 -mt-1" stroke="currentColor" strokeWidth="1.2">
        <circle cx="24" cy="24" r="10" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M24 14v10l6 4" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 12l-2-2 2-2 2 2-2 2" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M30 12l2-2-2-2-2 2 2 2" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 36l-2 2 2 2 2-2-2-2" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M30 36l2 2-2 2-2-2 2-2" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18l-2-2-2 2 2 2 2-2" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 30l-2 2-2-2 2-2 2 2" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M36 18l2-2 2 2-2 2-2-2" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M36 30l2 2 2-2-2-2-2 2" />
      </svg>
    ),
  },
  {
    color: "amber",
    label: "Grown in CO",
    headline: "Your Neighborhood Farm",
    story: "Forty years of Colorado stops. We know every town we serve — when they like to pick up, where they gather. Your order isn't a transaction; it's a relationship.",
    accentColor: "bg-amber-500",
    accentGlow: "hover:shadow-amber-500/20",
    accentHover: "group-hover:bg-gradient-to-r group-hover:from-amber-500 group-hover:to-amber-600",
    size: "tall",
    icon: (
      <svg viewBox="0 0 48 48" fill="none" className="w-14 h-14 -mt-1" stroke="currentColor" strokeWidth="1.2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 30h32M8 30l6-10h20l6 10" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 30v6h32v-6" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 30v6M24 30v6M32 30v6" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 26h16" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 36h8M36 36h8" />
      </svg>
    ),
  },
  {
    color: "amber",
    label: "No Middleman",
    headline: "From Our Rows to Your Table",
    story: "No distribution center. No supermarket back shelf. Just the field, the cooler, and your front door — the same day. That's the promise we keep.",
    accentColor: "bg-amber-500",
    accentGlow: "hover:shadow-amber-500/20",
    accentHover: "group-hover:bg-gradient-to-r group-hover:from-amber-500 group-hover:to-amber-600",
    size: "normal",
    icon: (
      <svg viewBox="0 0 48 48" fill="none" className="w-14 h-14 -mt-1" stroke="currentColor" strokeWidth="1.2">
        <rect x="8" y="14" width="32" height="24" rx="2" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 22h32" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 28h16M16 32h10" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 14v-4a6 6 0 0112 0v4" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 10h12" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 38l4 4 4-4 4 4 4-4 4 4 4-4 4 4 4-4 4 4" />
      </svg>
    ),
  },
  {
    color: "amber",
    label: "Easy Preorder",
    headline: "Reserve in 30 Seconds",
    story: "Choose your stop, tap your order, done. We'll have your corn in a labeled cooler with your name on it — no account, no app, no confusion.",
    accentColor: "bg-amber-500",
    accentGlow: "hover:shadow-amber-500/20",
    accentHover: "group-hover:bg-gradient-to-r group-hover:from-amber-500 group-hover:to-amber-600",
    size: "tall",
    icon: (
      <svg viewBox="0 0 48 48" fill="none" className="w-14 h-14 -mt-1" stroke="currentColor" strokeWidth="1.2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 16h16M16 22h16M16 28h12" />
        <circle cx="36" cy="28" r="6" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M34 28l2 2 4-4" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 12V8a4 4 0 014-4h16a4 4 0 014 4v4" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 12h24" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 12h4v10h-4" />
      </svg>
    ),
  },
];

// Single feature card with scroll-triggered entrance and hover effects
function FeatureCard({ feature, index }: { feature: Feature; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 48 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 48 }}
      transition={{
        duration: 0.7,
        delay: (index % 4) * 0.1 + Math.floor(index / 4) * 0.08,
        ease: [0.22, 0.61, 0.36, 1],
      }}
      className={`relative flex flex-col gap-5 rounded-2xl bg-stone-900/40 p-7 overflow-hidden group transition-all duration-500 hover:bg-stone-900/80 hover:translate-y-[-4px] hover:shadow-2xl ${feature.accentGlow} ${feature.accentHover}`}
    >
      {/* Animated top accent line */}
      <div className="absolute top-0 left-7 right-7 h-px overflow-hidden">
        <motion.div
          className={`h-full ${feature.accentColor}`}
          initial={{ scaleX: 0 }}
          whileHover={{ scaleX: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          style={{ originX: 0 }}
        />
      </div>

      {/* Icon with glow on hover */}
      <div className={`relative w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-500 ${
        feature.color === "emerald"
          ? "bg-emerald-900/30 text-emerald-400 group-hover:bg-emerald-900/50 group-hover:text-emerald-300 group-hover:shadow-[0_0_28px_rgba(52,211,153,0.35)]"
          : "bg-amber-900/30 text-amber-400 group-hover:bg-amber-900/50 group-hover:text-amber-300 group-hover:shadow-[0_0_28px_rgba(251,191,36,0.35)]"
      }`}>
        {feature.icon}
      </div>

      {/* Label */}
      <p className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] transition-colors duration-300 ${
        feature.color === "emerald"
          ? "text-emerald-600/60 group-hover:text-emerald-400/80"
          : "text-amber-600/60 group-hover:text-amber-400/80"
      }`}>
        {feature.label}
      </p>

      {/* Headline */}
      <h3 className="text-white font-bold text-[15px] leading-snug tracking-tight">
        {feature.headline}
      </h3>

      {/* Story */}
      <p className="text-stone-500 text-[12px] leading-relaxed mt-auto">
        {feature.story}
      </p>

      {/* Corner decoration */}
      <div className={`absolute bottom-0 right-0 w-24 h-24 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${
        feature.color === "emerald" ? "bg-emerald-600/10" : "bg-amber-600/10"
      }`} />
    </motion.div>
  );
}

function WhyTuxedoCorn() {
  const headerRef = useRef<HTMLDivElement>(null);
  const headerInView = useInView(headerRef, { once: true, margin: "-80px" });

  return (
    <section className="relative bg-stone-950 py-32 overflow-hidden">
      {/* Atmospheric glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_30%,rgba(16,100,50,0.15)_0%,transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_80%,rgba(120,75,20,0.12)_0%,transparent_50%)]" />

      <LayoutContainer>
        {/* Header */}
        <div ref={headerRef} className="text-center mb-20 max-w-xl mx-auto">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={headerInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
            transition={{ duration: 0.6 }}
            className="text-[11px] font-bold uppercase tracking-[0.3em] text-emerald-600/70 mb-6"
          >
            Why Olathe Sweet&trade;
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            animate={headerInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.05] mb-6"
          >
            Why Choose<br className="hidden sm:block" />Tuxedo Corn
          </motion.h2>
          <motion.div
            initial={{ scaleX: 0 }}
            animate={headerInView ? { scaleX: 1 } : { scaleX: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mx-auto mt-1 mb-7 h-px w-16 bg-emerald-600/60"
            style={{ originX: 0 }}
          />
          <motion.p
            initial={{ opacity: 0 }}
            animate={headerInView ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-stone-400 text-base leading-relaxed"
          >
            Colorado has trusted Olathe Sweet at their tables for over four decades. Here is why.
          </motion.p>
        </div>

        {/* Asymmetric masonry grid with staggered offsets */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {/* Row 1: tall, normal, tall, normal — with vertical offset stagger */}
          <div>
            <FeatureCard feature={FEATURES[0]} index={0} />
          </div>
          <div className="lg:mt-10">
            <FeatureCard feature={FEATURES[1]} index={1} />
          </div>
          <div>
            <FeatureCard feature={FEATURES[2]} index={2} />
          </div>
          <div className="lg:mt-10">
            <FeatureCard feature={FEATURES[3]} index={3} />
          </div>

          {/* Row 2: normal, tall, normal, tall — offset in opposite direction */}
          <div className="lg:mt-[-60px] hidden lg:block">
            <FeatureCard feature={FEATURES[4]} index={4} />
          </div>
          <div>
            <FeatureCard feature={FEATURES[5]} index={5} />
          </div>
          <div className="lg:mt-[-60px] hidden lg:block">
            <FeatureCard feature={FEATURES[6]} index={6} />
          </div>
          <div>
            <FeatureCard feature={FEATURES[7]} index={7} />
          </div>
        </div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center text-[10px] font-medium uppercase tracking-[0.25em] text-stone-700 mt-16"
        >
          Olathe Sweet&trade; &nbsp;·&nbsp; Olathe, Colorado
        </motion.p>
      </LayoutContainer>
    </section>
  );
}

// ── Section header ──────────────────────────────────────────────────
function SectionHeader({
  eyebrow,
  headline,
  subtext,
  accent = "emerald",
}: {
  eyebrow: string;
  headline: string;
  subtext: string;
  accent?: "emerald" | "stone";
}) {
  return (
    <div className="mb-10 sm:mb-14">
      <p className={`text-[10px] sm:text-[11px] font-semibold uppercase tracking-widest ${accent === "emerald" ? "text-emerald-600" : "text-stone-500"} mb-3 sm:mb-4`}>
        {eyebrow}
      </p>
      <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-stone-950 leading-[1.05]">
        {headline}
      </h2>
      <div className="mt-5 sm:mt-6 h-px w-10 sm:w-12 bg-emerald-600" />
      <p className="mt-5 sm:mt-6 max-w-2xl text-base sm:text-lg text-stone-500 leading-relaxed">
        {subtext}
      </p>
    </div>
  );
}

export default function TuxedoPage() {
  const [brand, setBrand] = useState<Brand | null>(null);
  const [stops, setStops] = useState<Stop[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [wholesaleEnabled, setWholesaleEnabled] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoUrlDark, setLogoUrlDark] = useState<string | null>(null);
  const [olatheSweetLogoUrl, setOlatheSweetLogoUrl] = useState<string | null>(null);
  const [olatheSweetLogoUrlDark, setOlatheSweetLogoUrlDark] = useState<string | null>(null);
  const [showSchedulePdf, setShowSchedulePdf] = useState(true);
  const [showWholesaleLink, setShowWholesaleLink] = useState(true);
  const [heroTagline, setHeroTagline] = useState<string | null>(null);
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [customFooterText, setCustomFooterText] = useState<string | null>(null);
  const [contactEmail, setContactEmail] = useState<string | null>(null);
  const [contactPhone, setContactPhone] = useState<string | null>(null);
  const [brandPrimaryColor, setBrandPrimaryColor] = useState<string | null>(null);
  const [brandBgColor, setBrandBgColor] = useState<string | null>(null);
  const [brandTextColor, setBrandTextColor] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const slug = "tuxedo";

      const [brandResult, settingsResult] = await Promise.all([
        supabase.from("brands").select("*").eq("slug", slug).single(),
        getBrandSettingsPublic(slug),
      ]);

      const brandData = brandResult.data;
      setBrand(brandData);

      if (settingsResult.success && settingsResult.settings) {
        const s = settingsResult.settings;
        setLogoUrl(s.logo_url ?? null);
        setLogoUrlDark(s.logo_url_dark ?? null);
        setOlatheSweetLogoUrl(s.olathe_sweet_logo_url ?? null);
        setOlatheSweetLogoUrlDark(s.olathe_sweet_logo_url_dark ?? null);
        setHeroImageUrl(s.hero_image_url ?? null);
        setHeroTagline(s.hero_tagline ?? null);
        setCustomFooterText(s.custom_footer_text ?? null);
        setContactEmail(s.email ?? null);
        setContactPhone(s.phone ?? null);
        setShowSchedulePdf(s.show_schedule_pdf ?? true);
        setShowWholesaleLink(s.show_wholesale_link ?? true);
        setWholesaleEnabled(settingsResult.wholesaleEnabled ?? false);
        setBrandPrimaryColor(s.brand_primary_color ?? null);
        setBrandBgColor(s.brand_bg_color ?? null);
        setBrandTextColor(s.brand_text_color ?? null);
      }

      try {
        const { getCurrentAdminUser } = await import("@/actions/admin-user");
        const adminUser = await getCurrentAdminUser();
        setIsAdmin(!!adminUser);
      } catch {
        // not logged in as admin
      }

      if (brandData?.id) {
        const [{ data: stopsData }, { data: productsData }] = await Promise.all([
          supabase.from("stops").select("*").eq("brand_id", brandData.id).eq("active", true),
          supabase.from("products").select("*").eq("brand_id", brandData.id).eq("active", true),
        ]);
        setStops(stopsData ?? []);
        setProducts(productsData ?? []);
      }
    }
    load();
  }, []);

  function scrollToStops() {
    document.getElementById("stops")?.scrollIntoView({ behavior: "smooth" });
  }
  function scrollToStory() {
    document.getElementById("story")?.scrollIntoView({ behavior: "smooth" });
  }
  function scrollToProducts() {
    document.getElementById("products")?.scrollIntoView({ behavior: "smooth" });
  }

  // ─── GSAP SCROLL ANIMATIONS ──────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;

    const ctx = gsap.context(() => {
      // Parallax floating elements
      gsap.utils.toArray<Element>(".parallax-float").forEach((el, i) => {
        gsap.to(el, {
          y: -60 - i * 15,
          scrollTrigger: {
            trigger: el,
            start: "top bottom",
            end: "bottom top",
            scrub: 1,
          },
        });
      });

      // Staggered text reveal on scroll
      const revealTextElements = gsap.utils.toArray<Element>(".reveal-text");
      revealTextElements.forEach((el) => {
        gsap.fromTo(
          el,
          { opacity: 0, y: 40, skewY: 2 },
          {
            opacity: 1,
            y: 0,
            skewY: 0,
            duration: 1,
            ease: "power3.out",
            scrollTrigger: {
              trigger: el,
              start: "top 85%",
              toggleActions: "play none none reverse",
            },
          }
        );
      });

      // Scale reveal for cards
      const revealScaleElements = gsap.utils.toArray<Element>(".reveal-scale");
      revealScaleElements.forEach((el, i) => {
        gsap.fromTo(
          el,
          { opacity: 0, scale: 0.9, y: 40 },
          {
            opacity: 1,
            scale: 1,
            y: 0,
            duration: 0.8,
            delay: i * 0.08,
            ease: "back.out(1.4)",
            scrollTrigger: {
              trigger: el,
              start: "top 85%",
              toggleActions: "play none none reverse",
            },
          }
        );
      });

      // Counter animations
      const counterElements = gsap.utils.toArray<Element>(".counter-animate");
      counterElements.forEach((el) => {
        const target = parseInt(el.getAttribute("data-target") || "0", 10);
        const obj = { val: 0 };
        gsap.to(obj, {
          val: target,
          duration: 2,
          ease: "power2.out",
          onUpdate: () => {
            if (el.textContent !== null) {
              el.textContent = Math.floor(obj.val).toLocaleString();
            }
          },
          scrollTrigger: {
            trigger: el,
            start: "top 85%",
            toggleActions: "play none none none",
          },
        });
      });

      // Horizontal reveal for section headers
      gsap.utils.toArray<Element>(".reveal-slide").forEach((el) => {
        gsap.fromTo(
          el,
          { opacity: 0, x: -40 },
          {
            opacity: 1,
            x: 0,
            duration: 0.8,
            ease: "power3.out",
            scrollTrigger: {
              trigger: el,
              start: "top 85%",
              toggleActions: "play none none reverse",
            },
          }
        );
      });
    });

    return () => ctx.revert();
  }, []);

  const featuredProducts = products.slice(0, 3);

  return (
    <div className="min-h-screen bg-stone-50">
      <BrandStylesProvider
        primaryColor={brandPrimaryColor}
        bgColor={brandBgColor}
        textColor={brandTextColor}
      />
      <StorefrontHeader
        brandName={brand?.name ?? "Tuxedo Corn"}
        brandSlug="tuxedo"
        logoUrl={logoUrl}
        logoUrlDark={logoUrlDark}
        showWholesaleLink={showWholesaleLink}
        isAdmin={isAdmin}
        brandAccent="green"
      />

      <main>
        {showWholesaleLink && wholesaleEnabled && (
          <div className="bg-stone-950 border-b border-zinc-800 py-3.5">
            <div className="mx-auto max-w-6xl px-6">
              <Link
                href="/wholesale/login"
                className="inline-flex items-center gap-2 rounded-full bg-emerald-700 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-600 active:bg-emerald-800 transition-all duration-200 hover:-translate-y-0.5"
              >
                Wholesale Portal →
              </Link>
            </div>
          </div>
        )}

        <TuxedoVideoHero
          eyebrow="Olathe Sweet™ — Olathe, Colorado"
          title="Tuxedo Corn"
          description={
            heroTagline ??
            "Premium Olathe Sweet™ sweet corn — hand-picked at peak freshness from our family farm in Colorado."
          }
          olatheSweetLogoUrl={olatheSweetLogoUrl}
          primaryButton="Find a Stop"
          secondaryButton="Our Story"
          onPrimaryClick={scrollToStops}
          onSecondaryClick={scrollToStory}
        />

        {/* ─── CINEMATIC PRODUCT SHOWCASE ────────────────────────────────── */}
        <CinematicShowcase
          products={featuredProducts.map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description ?? "",
            price: `$${p.price}`,
            type: p.type,
            imageUrl: p.image_url,
          }))}
          brandSlug="tuxedo"
        />

        <WhyTuxedoCorn />

        <section id="stops" className="relative bg-gradient-to-b from-stone-100 to-stone-50 scroll-mt-20">
          {/* Parallax background layers */}
          <ParallaxLayer speed={0.2} className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 right-0 w-[40%] h-full bg-gradient-to-l from-emerald-50/30 to-transparent" />
          </ParallaxLayer>

          <div className="relative py-28">
            <LayoutContainer>
              <div className="mb-14 flex items-end justify-between">
                <div>
                  <FadeOnScroll from="left">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-600 mb-4">Delivery Stops</p>
                  </FadeOnScroll>
                  <FadeOnScroll from="up" delay={0.1}>
                    <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-stone-950 leading-[1.05]">
                      Upcoming<br className="hidden md:block" /> Stops
                    </h2>
                  </FadeOnScroll>
                  <FadeOnScroll from="up" delay={0.15}>
                    <div className="mt-6 h-px w-12 bg-emerald-600" />
                  </FadeOnScroll>
                  <FadeOnScroll from="up" delay={0.2}>
                    <p className="mt-6 max-w-2xl text-lg text-stone-500 leading-relaxed">
                      Find a nearby stop and preorder your corn. Pickup is easy and guaranteed.
                    </p>
                  </FadeOnScroll>
                </div>
                {showSchedulePdf && (
                  <FadeOnScroll from="right" delay={0.3}>
                    <a
                      href="/api/tuxedo/schedule-pdf"
                      download
                      className="shrink-0 hidden md:inline-flex items-center gap-2.5 rounded-2xl bg-stone-900 px-6 py-3.5 text-sm font-semibold text-white hover:bg-stone-800 active:bg-stone-950 transition-colors"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Download Schedule
                    </a>
                  </FadeOnScroll>
                )}
              </div>
              <FadeOnScroll from="up" delay={0.3}>
                {stops.length === 0 ? (
                  <div className="rounded-3xl bg-white p-14 text-center ring-1 ring-stone-200/60">
                    <p className="text-stone-500">No upcoming stops scheduled. Check back soon!</p>
                  </div>
                ) : (
                  <PaginatedStops stops={stops} brandSlug="tuxedo" brandAccent="green" />
                )}
              </FadeOnScroll>
            </LayoutContainer>
          </div>
        </section>

        {/* Section divider */}
        <div className="relative h-24 bg-stone-50 overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex items-center gap-6">
              <div className="h-px w-24 bg-gradient-to-r from-transparent via-stone-300 to-transparent" />
              <svg className="h-6 w-6 text-stone-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0 0V8m0 13V4m0 9H4m8 0h8m-8-4h8" />
              </svg>
              <div className="h-px w-24 bg-gradient-to-r from-transparent via-stone-300 to-transparent" />
            </div>
          </div>
        </div>

        <section id="products" className="relative bg-white">
          {/* Scroll-driven reveal for section header */}
          <div className="py-20 bg-gradient-to-b from-stone-50 to-white">
            <LayoutContainer>
              <ScrollReveal from="up" className="mb-14">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-600 mb-4">Farm-Direct</p>
                <h2 className="text-5xl md:text-6xl font-black tracking-tight text-stone-950 leading-[1.05]">
                  This Week&apos;s<br className="hidden md:block" /> Harvest
                </h2>
                <div className="mt-6 h-px w-12 bg-emerald-600" />
                <p className="mt-6 max-w-2xl text-lg text-stone-500 leading-relaxed">
                  Preorder for pickup at a stop, or have cooler boxes shipped directly to your door after the season.
                </p>
              </ScrollReveal>
            </LayoutContainer>
          </div>

          {/* Cinematic showcase replaces static grid */}
          <CinematicShowcase
            products={products.slice(0, 3).map((p) => ({
              id: p.id,
              name: p.name,
              description: p.description ?? "",
              price: `$${p.price}`,
              type: p.type,
              imageUrl: p.image_url,
            }))}
            brandSlug="tuxedo"
          />

          {/* Mobile-friendly fallback grid for smaller screens */}
          <div className="md:hidden py-16 bg-stone-50">
            <LayoutContainer>
              <div className="grid gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {products.slice(0, 6).map((product) => (
                  <ProductCard
                    key={product.id}
                    id={product.id}
                    name={product.name}
                    description={product.description}
                    price={`$${product.price}`}
                    type={product.type}
                    imageUrl={product.image_url}
                    brandSlug="tuxedo"
                    brandName="Tuxedo Corn"
                    brandId={product.brand_id}
                    brandAccent="green"
                    is_taxable={product.is_taxable}
                    pickup_type={product.pickup_type}
                    olatheSweetLogoUrlDark={olatheSweetLogoUrlDark}
                  />
                ))}
              </div>
            </LayoutContainer>
          </div>

          {products.length > 3 && (
            <div className="mt-10 text-center pb-16">
              <p className="text-sm text-stone-400">{products.length - 3} more products available in the full catalog.</p>
            </div>
          )}
        </section>

        <section id="story" className="py-32 bg-stone-950 relative overflow-hidden">
          {/* Parallax decorative elements */}
          <div className="absolute inset-0 pointer-events-none">
            <ParallaxLayer speed={0.3} className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-5" style={{
              background: "radial-gradient(circle, rgba(16,185,129,0.3) 0%, transparent 70%)",
              filter: "blur(80px)",
            }}>
              <div />
            </ParallaxLayer>
            <ParallaxLayer speed={0.5} className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full opacity-5" style={{
              background: "radial-gradient(circle, rgba(255,215,0,0.3) 0%, transparent 70%)",
              filter: "blur(60px)",
            }}>
              <div />
            </ParallaxLayer>
          </div>

          {/* Large background text for parallax depth */}
          <div className="absolute inset-0 flex items-center justify-center overflow-hidden opacity-5 pointer-events-none">
            <ParallaxLayer speed={0.2}>
              <span className="text-[20vw] font-black text-white leading-none">SINCE</span>
            </ParallaxLayer>
          </div>

          <LayoutContainer>
            <div className="text-center max-w-3xl mx-auto relative z-10">
              <FadeOnScroll from="up" className="mb-8">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-400/60 mb-4">Our Story</p>
              </FadeOnScroll>

              <FadeOnScroll from="up" delay={0.1}>
                <h2 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.05] mb-8">
                  Three Generations of<br className="hidden md:block" /> Sweet Corn Excellence
                </h2>
              </FadeOnScroll>

              <FadeOnScroll from="up" delay={0.2}>
                <div className="mx-auto mt-8 mb-10 h-px w-16 bg-gradient-to-r from-emerald-600 to-amber-500" />
              </FadeOnScroll>

              <FadeOnScroll from="up" delay={0.3}>
                <p className="text-stone-400 leading-relaxed text-lg md:text-xl max-w-2xl mx-auto">
                  Tuxedo Corn is the exclusive grower and shipper of Olathe Sweet Sweet Corn — developed for Colorado&apos;s high-altitude mountain climate and grown by the same family for over 40 years.
                </p>
              </FadeOnScroll>

              {/* Stats with counter animation */}
              <FadeOnScroll from="up" delay={0.4}>
                <div className="flex items-center justify-center gap-12 md:gap-16 mt-16 flex-wrap">
                  {[
                    { stat: "40", suffix: "+", label: "Years Growing" },
                    { stat: "3", suffix: "", label: "Generations" },
                    { stat: "100", suffix: "%", label: "Hand-Picked" },
                  ].map((item, i) => (
                    <div key={i} className="text-center">
                      <div className="text-4xl md:text-5xl lg:text-6xl font-black text-white" style={{ textShadow: "0 4px 30px rgba(16,185,129,0.3)" }}>
                        <span className="counter-animate" data-target={parseInt(item.stat, 10)}>0</span>
                        <span style={{ color: "#10b981" }}>{item.suffix}</span>
                      </div>
                      <div className="mt-2 text-[10px] uppercase tracking-[0.2em] text-stone-500">
                        {item.label}
                      </div>
                    </div>
                  ))}
                </div>
              </FadeOnScroll>

              <FadeOnScroll from="up" delay={0.5}>
                <div className="mt-16">
                  <Link
                    href="/tuxedo/about"
                    className="group inline-flex items-center gap-3 rounded-full px-10 py-4 text-sm font-bold transition-all duration-300"
                    style={{
                      background: "linear-gradient(135deg, #059669 0%, #10b981 100%)",
                      boxShadow: "0 8px 32px rgba(16, 185, 129, 0.3), inset 0 1px 0 rgba(255,255,255,0.2)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-3px)";
                      e.currentTarget.style.boxShadow = "0 12px 40px rgba(16, 185, 129, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "0 8px 32px rgba(16, 185, 129, 0.3), inset 0 1px 0 rgba(255,255,255,0.2)";
                    }}
                  >
                    <span>Read Our Story</span>
                    <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </FadeOnScroll>
            </div>
          </LayoutContainer>
        </section>
      </main>

      <StorefrontFooter
        brandName={brand?.name ?? "Tuxedo Corn"}
        brandSlug="tuxedo"
        logoUrl={logoUrl}
        logoUrlDark={logoUrlDark}
        customFooterText={customFooterText}
        contactEmail={contactEmail}
        contactPhone={contactPhone}
        isAdmin={isAdmin}
        brandAccent="green"
      />
    </div>
  );
}
