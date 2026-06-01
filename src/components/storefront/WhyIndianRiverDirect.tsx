"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import LayoutContainer from "@/components/layout/LayoutContainer";

// ── Feature type & data ──────────────────────────────────────────────

type FeatureColor = "blue";

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
    color: "blue",
    label: "Since 1985",
    headline: "Four Decades of Florida Sunshine",
    story: "Our family's been growing in the Indian River citrus district since before your parents were born. That's not marketing — it's memory.",
    accentColor: "bg-blue-500",
    accentGlow: "hover:shadow-blue-500/20",
    accentHover: "group-hover:bg-gradient-to-r group-hover:from-blue-500 group-hover:to-blue-600",
    size: "tall",
    icon: (
      <svg viewBox="0 0 48 48" fill="none" className="w-14 h-14 -mt-1" stroke="currentColor" strokeWidth="1.2">
        <circle cx="24" cy="24" r="14" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M24 10v4M24 34v4M10 24h4M34 24h4" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.5 14.5l2.8 2.8M30.7 30.7l2.8 2.8M33.5 14.5l-2.8 2.8M17.3 30.7l-2.8 2.8" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M24 18v12l6 4" />
      </svg>
    ),
  },
  {
    color: "blue",
    label: "Farm Ownership",
    headline: "From Our Grove to Your Table",
    story: "We own Fort B Groves, so we control every step — growing, harvesting, packing, delivering.",
    accentColor: "bg-blue-500",
    accentGlow: "hover:shadow-blue-500/20",
    accentHover: "group-hover:bg-gradient-to-r group-hover:from-blue-500 group-hover:to-blue-600",
    size: "normal",
    icon: (
      <svg viewBox="0 0 48 48" fill="none" className="w-14 h-14 -mt-1" stroke="currentColor" strokeWidth="1.2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 40h32" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 40l6-12h20l6 12" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M14 28v12M34 28v12" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 28v12M28 28v12" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 16h8v12h-8z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 20l12-8 12 8" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M22 10v6M26 10v6" />
      </svg>
    ),
  },
  {
    color: "blue",
    label: "Hand-Picked",
    headline: "Every Piece Hand-Selected",
    story: "No machine-harvested citrus. Every orange, tangerine, and grapefruit is hand-picked at peak ripeness.",
    accentColor: "bg-blue-500",
    accentGlow: "hover:shadow-blue-500/20",
    accentHover: "group-hover:bg-gradient-to-r group-hover:from-blue-500 group-hover:to-blue-600",
    size: "tall",
    icon: (
      <svg viewBox="0 0 48 48" fill="none" className="w-14 h-14 -mt-1" stroke="currentColor" strokeWidth="1.2">
        <circle cx="24" cy="22" r="12" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M24 10c-2 0-4 1-4 3 0-2-2-3-4-3" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M24 10c2 0 4 1 4 3 0-2 2-3 4-3" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 22h8" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 18c3 2 6 3 8 4M32 18c-3 2-6 3-8 4" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M24 34v8" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 40h8" />
      </svg>
    ),
  },
  {
    color: "blue",
    label: "Direct Delivery",
    headline: "Skip the Store Shelf",
    story: "Our trucks go from the grove directly to your neighborhood. Nothing sits in a warehouse.",
    accentColor: "bg-blue-500",
    accentGlow: "hover:shadow-blue-500/20",
    accentHover: "group-hover:bg-gradient-to-r group-hover:from-blue-500 group-hover:to-blue-600",
    size: "normal",
    icon: (
      <svg viewBox="0 0 48 48" fill="none" className="w-14 h-14 -mt-1" stroke="currentColor" strokeWidth="1.2">
        <rect x="4" y="18" width="28" height="16" rx="2" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M32 24h8l4 6v4H32" />
        <circle cx="12" cy="38" r="4" />
        <circle cx="36" cy="38" r="4" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 18v-4a4 4 0 014-4h12" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 24h32" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 26h16M16 30h10" />
      </svg>
    ),
  },
  {
    color: "blue",
    label: "Peak Season",
    headline: "Harvested at the Perfect Moment",
    story: "We pick when the sugar content is highest — not when it ships best. That's the difference.",
    accentColor: "bg-blue-500",
    accentGlow: "hover:shadow-blue-500/20",
    accentHover: "group-hover:bg-gradient-to-r group-hover:from-blue-500 group-hover:to-blue-600",
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
    color: "blue",
    label: "Regional Stops",
    headline: "Your Neighborhood Pickup",
    story: "From Ohio to Florida, we come to you. Find a stop near your ZIP code.",
    accentColor: "bg-blue-500",
    accentGlow: "hover:shadow-blue-500/20",
    accentHover: "group-hover:bg-gradient-to-r group-hover:from-blue-500 group-hover:to-blue-600",
    size: "tall",
    icon: (
      <svg viewBox="0 0 48 48" fill="none" className="w-14 h-14 -mt-1" stroke="currentColor" strokeWidth="1.2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M24 6v6" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M24 36v6" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 24h6" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M36 24h6" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.1 10.1l4.2 4.2" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M33.7 33.7l4.2 4.2" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.1 37.9l4.2-4.2" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M33.7 14.3l4.2-4.2" />
        <circle cx="24" cy="24" r="8" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M24 20v4l3 2" />
      </svg>
    ),
  },
  {
    color: "blue",
    label: "Quality First",
    headline: "We Reject What Doesn't Cut It",
    story: "Any fruit that doesn't meet our standard doesn't leave the grove. Period.",
    accentColor: "bg-blue-500",
    accentGlow: "hover:shadow-blue-500/20",
    accentHover: "group-hover:bg-gradient-to-r group-hover:from-blue-500 group-hover:to-blue-600",
    size: "normal",
    icon: (
      <svg viewBox="0 0 48 48" fill="none" className="w-14 h-14 -mt-1" stroke="currentColor" strokeWidth="1.2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8l4 12H36l4-12" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 8h32" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 20h16M16 26h12M16 32h8" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 8v-2a4 4 0 018 0v2" />
        <circle cx="32" cy="36" r="8" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M29 36l2 2 4-4" />
      </svg>
    ),
  },
  {
    color: "blue",
    label: "Family Farm",
    headline: "Three Generations of Care",
    story: "The same family. The same land. The same commitment to excellence you can taste.",
    accentColor: "bg-blue-500",
    accentGlow: "hover:shadow-blue-500/20",
    accentHover: "group-hover:bg-gradient-to-r group-hover:from-blue-500 group-hover:to-blue-600",
    size: "tall",
    icon: (
      <svg viewBox="0 0 48 48" fill="none" className="w-14 h-14 -mt-1" stroke="currentColor" strokeWidth="1.2">
        <circle cx="24" cy="14" r="6" />
        <circle cx="12" cy="22" r="5" />
        <circle cx="36" cy="22" r="5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 27c0 5 5 9 12 9s12-4 12-9" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 36c0 4 4 8 4 8h24s4-4 4-8" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M14 34v-6M34 34v-6" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M22 36v-8M26 36v-8" />
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
      className={`relative flex flex-col gap-5 rounded-2xl backdrop-blur-md bg-white/70 border border-white/50 p-7 overflow-hidden group transition-all duration-500 hover:shadow-xl hover:shadow-stone-200/50 hover:-translate-y-1 ${feature.accentGlow}`}
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
      <div className="relative w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-500 bg-blue-50 text-blue-600 group-hover:bg-blue-100 group-hover:text-blue-700 shadow-sm">
        {feature.icon}
      </div>

      {/* Label */}
      <p className="hidden sm:block text-[10px] font-bold uppercase tracking-[0.2em] text-blue-600 group-hover:text-blue-800 transition-colors duration-300">
        {feature.label}
      </p>

      {/* Headline */}
      <h3 className="text-stone-950 font-bold text-[15px] leading-snug tracking-tight">
        {feature.headline}
      </h3>

      {/* Story */}
      <p className="text-stone-500 text-[12px] leading-relaxed mt-auto">
        {feature.story}
      </p>

      {/* Corner decoration */}
      <div className="absolute bottom-0 right-0 w-24 h-24 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-blue-500/10" />
    </motion.div>
  );
}

function WhyIndianRiverDirect() {
  const headerRef = useRef<HTMLDivElement>(null);
  const headerInView = useInView(headerRef, { once: true, margin: "-80px" });

  return (
    <section className="relative backdrop-blur-xl bg-stone-50/80 py-32 overflow-hidden border-y border-white/50">
      {/* Very subtle blue glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-50/60 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-50/40 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />

      <LayoutContainer>
        {/* Header */}
        <div ref={headerRef} className="text-center mb-20 max-w-xl mx-auto">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={headerInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
            transition={{ duration: 0.6 }}
            className="text-[11px] font-bold uppercase tracking-[0.3em] text-blue-600 mb-6"
          >
            Why Indian River Direct
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            animate={headerInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-5xl md:text-6xl font-black tracking-tight text-stone-950 leading-[1.05] mb-6"
          >
            Why Choose<br />Indian River Direct
          </motion.h2>
          <motion.div
            initial={{ scaleX: 0 }}
            animate={headerInView ? { scaleX: 1 } : { scaleX: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mx-auto mt-1 mb-7 h-px w-16 bg-blue-600/60"
            style={{ originX: 0 }}
          />
          <motion.p
            initial={{ opacity: 0 }}
            animate={headerInView ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-stone-600 text-base leading-relaxed"
          >
            Florida has trusted Indian River citrus at their tables for over four decades. Here is why.
          </motion.p>
        </div>

        {/* Asymmetric masonry grid with staggered offsets */}
        <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
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
          className="text-center text-[10px] font-medium uppercase tracking-[0.25em] text-stone-400 mt-16"
        >
          Indian River Direct &nbsp;·&nbsp; Fort B Groves, Florida
        </motion.p>
      </LayoutContainer>
    </section>
  );
}

export default WhyIndianRiverDirect;
