"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

type TuxedoVideoHeroProps = {
  eyebrow?: string;
  title: string;
  description: string;
  olatheSweetLogoUrl?: string | null;
  primaryButton?: string;
  secondaryButton?: string;
  onPrimaryClick?: () => void;
  onSecondaryClick?: () => void;
};

const VIDEO_URL =
  "https://wnzkhezyhnfzhkhiflrp.supabase.co/storage/v1/object/public/videos/tuxedo-hero.mp4";

const OLATHE_SWEET_LOGO_DARK =
  "https://wnzkhezyhnfzhkhiflrp.supabase.co/storage/v1/object/public/brand-logos/64294306-5f42-463d-a5e8-2ad6c81a96de/olathe-sweet-logo-dark.png";

// Staggered animation variants
const fadeUpVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
      delay,
    },
  }),
};

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.3,
    },
  },
};

// Scroll indicator animation
const bounceVariants = {
  animate: {
    y: [0, 8, 0],
    transition: {
      duration: 1.6,
      repeat: Infinity,
      ease: "easeInOut" as const,
    },
  },
};

export default function TuxedoVideoHero({
  eyebrow,
  title,
  description,
  olatheSweetLogoUrl,
  primaryButton,
  secondaryButton,
  onPrimaryClick,
  onSecondaryClick,
}: TuxedoVideoHeroProps) {
  const logoSrc = olatheSweetLogoUrl ?? OLATHE_SWEET_LOGO_DARK;
  const sectionRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Trigger entrance animation on mount
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Smooth scroll to stops section
  const handlePrimaryClick = () => {
    const stopsSection = document.getElementById("stops");
    if (stopsSection) {
      stopsSection.scrollIntoView({ behavior: "smooth", block: "start" });
    } else if (onPrimaryClick) {
      onPrimaryClick();
    }
  };

  return (
    <section
      ref={sectionRef}
      className="relative min-h-[600px] md:min-h-[780px] flex items-center"
    >
      {/* Background video */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-[110%] object-cover"
        style={{ zIndex: 0 }}
        src={VIDEO_URL}
      />

      {/* Gold/Warm gradient overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 1,
          background: "linear-gradient(135deg, rgba(255,215,0,0.1) 0%, rgba(255,193,7,0.06) 50%, rgba(255,235,0,0.04) 100%)",
        }}
      />

      {/* Vignette overlay - black to yellow gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 2,
          background: "radial-gradient(ellipse at center, rgba(255,200,0,0.1) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.95) 100%)",
        }}
      />

      {/* Dark gradient overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 3,
          background: "linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.25) 50%, rgba(0,0,0,0.1) 100%)",
        }}
      />

      {/* Content container */}
      <div
        className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-20 md:pb-28 pt-28 md:pt-36 flex flex-col justify-end"
        style={{ minHeight: "600px" }}
      >
        <motion.div
          className="max-w-2xl"
          variants={containerVariants}
          initial="hidden"
          animate={isVisible ? "visible" : "hidden"}
        >
          {/* Logo */}
          <motion.div
            className="mb-8 relative h-16 md:h-20 w-[280px] md:w-[350px]"
            variants={fadeUpVariants}
          >
            <Image
              src={logoSrc}
              alt="Olathe Sweet"
              fill
              style={{ objectFit: "contain" }}
              className="opacity-95"
            />
          </motion.div>

          {/* Eyebrow */}
          {eyebrow && (
            <motion.p
              className="text-[11px] font-semibold uppercase tracking-[0.25em] text-emerald-400/80 mb-5"
              variants={fadeUpVariants}
              custom={0.1}
            >
              {eyebrow}
            </motion.p>
          )}

          {/* Title */}
          <motion.h1
            className="text-5xl md:text-7xl font-black tracking-tight text-white leading-[1.05]"
            variants={fadeUpVariants}
            custom={0.25}
          >
            {title}
          </motion.h1>

          {/* Description */}
          <motion.p
            className="mt-5 md:mt-6 text-lg md:text-2xl text-white/60 leading-relaxed font-light max-w-lg"
            variants={fadeUpVariants}
            custom={0.4}
          >
            {description}
          </motion.p>

          {/* CTAs */}
          <motion.div
            className="mt-8 md:mt-10 flex flex-wrap items-center gap-4"
            variants={fadeUpVariants}
            custom={0.55}
          >
            {primaryButton && (
              <button
                onClick={handlePrimaryClick}
                className="rounded-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 px-8 md:px-10 py-3.5 md:py-4 text-sm font-bold tracking-widest uppercase transition-all duration-200 hover:shadow-xl hover:shadow-emerald-900/40 hover:-translate-y-0.5 active:translate-y-0"
              >
                {primaryButton}
              </button>
            )}
            {secondaryButton && (
              <button
                onClick={onSecondaryClick}
                className="flex items-center gap-2 text-sm font-semibold text-white/70 hover:text-white transition-colors duration-200 group"
              >
                <span className="uppercase tracking-widest text-[11px]">{secondaryButton}</span>
                <svg
                  className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </motion.div>
        </motion.div>

        {/* Animated scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20"
          variants={bounceVariants}
          animate="animate"
        >
          <button
            onClick={handlePrimaryClick}
            className="flex flex-col items-center gap-2 text-white/50 hover:text-white/80 transition-colors duration-200"
            aria-label="Scroll to stops"
          >
            <span className="text-[10px] uppercase tracking-[0.2em] font-medium">Scroll</span>
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </button>
        </motion.div>
      </div>
    </section>
  );
}