"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Register GSAP plugins
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

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

// Use Next.js rewrite (next.config.ts) so the browser can stream assets
// via same-origin /storage/* and avoid next/image "upstream resolved to
// private ip" failures when the upstream is localhost MinIO.
const VIDEO_URL = `/storage/videos/tuxedo-hero.mp4`;

const OLATHE_SWEET_LOGO_DARK =
  "/storage/brand-logos/64294306-5f42-463d-a5e8-2ad6c81a96de/olathe-sweet-logo-dark.png";

// ─────────────────────────────────────────────────────────────────────────────
// CINEMATIC HERO - SCROLL-DRIVEN ANIMATIONS
// ─────────────────────────────────────────────────────────────────────────────
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
  const contentRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  // Trigger entrance animation on mount
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // ─── GSAP SCROLL ANIMATIONS ────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined" || !sectionRef.current) return;

    const ctx = gsap.context(() => {
      // Scroll progress tracking
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: "top top",
        end: "bottom top",
        scrub: true,
        onUpdate: (self) => {
          setScrollProgress(self.progress);
        },
      });

      // Hero content pin - fade out on scroll
      if (contentRef.current) {
        gsap.to(contentRef.current, {
          y: -80,
          opacity: 0,
          ease: "power2.inOut",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top top",
            end: "40% top",
            scrub: 1.2,
          },
        });
      }

      // Video scale + parallax
      if (videoRef.current) {
        gsap.to(videoRef.current, {
          scale: 1.15,
          y: 100,
          ease: "power2.inOut",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top top",
            end: "50% top",
            scrub: 1.5,
          },
        });
      }

      // Staggered entrance for content elements
      const contentElements = gsap.utils.toArray<Element>(".hero-reveal");
      contentElements.forEach((el, i) => {
        gsap.fromTo(
          el,
          { opacity: 0, y: 40, scale: 0.95 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 1,
            ease: "power3.out",
            scrollTrigger: {
              trigger: el,
              start: "top 90%",
              toggleActions: "play none none reverse",
            },
          }
        );
      });

      // Parallax floating elements
      const floatElements = gsap.utils.toArray<Element>(".parallax-float");
      floatElements.forEach((el, idx) => {
        gsap.to(el, {
          y: -80 - idx * 20,
          scrollTrigger: {
            trigger: el,
            start: "top bottom",
            end: "bottom top",
            scrub: 1,
          },
        });
      });

      // Scroll indicator bounce on scroll
      gsap.to(".scroll-indicator", {
        y: 20,
        opacity: 0,
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "10% top",
          end: "30% top",
          scrub: 1,
        },
      });
    }, sectionRef);

    return () => ctx.revert();
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
    <>
      {/* ─── SCROLL PROGRESS BAR ──────────────────────────────────────────── */}
      <div className="fixed top-0 left-0 right-0 h-1 z-[1000] bg-black/20">
        <div
          className="h-full bg-gradient-to-r from-emerald-600 via-emerald-400 to-amber-400"
          style={{
            transform: `scaleX(${scrollProgress})`,
            transformOrigin: "left",
            transition: "transform 0.1s ease-out",
          }}
        />
      </div>

      {/* ─── CINEMATIC HERO SECTION ──────────────────────────────────────── */}
      <section
        ref={sectionRef}
        className="relative min-h-screen flex items-center overflow-hidden"
      >
        {/* Background video with parallax */}
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-[120%] object-cover"
          style={{ zIndex: 0 }}
          src={VIDEO_URL}
        />

        {/* Gradient overlays */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            zIndex: 1,
            background: "linear-gradient(135deg, rgba(255,215,0,0.12) 0%, rgba(255,193,7,0.06) 50%, rgba(255,235,0,0.04) 100%)",
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            zIndex: 2,
            background: "radial-gradient(ellipse at center, rgba(255,200,0,0.08) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.9) 100%)",
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            zIndex: 3,
            background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.05) 100%)",
          }}
        />

        {/* ─── FLOATING DECORATIVE ELEMENTS ──────────────────────────────── */}
        <div className="absolute inset-0 pointer-events-none z-[4]">
          {/* Golden orb top-left */}
          <div
            className="parallax-float absolute top-1/4 left-1/4 w-64 h-64 rounded-full opacity-20"
            style={{
              background: "radial-gradient(circle, rgba(255,215,0,0.4) 0%, transparent 70%)",
              filter: "blur(40px)",
              animation: "float-slow 10s ease-in-out infinite",
            }}
          />
          {/* Emerald orb bottom-right */}
          <div
            className="parallax-float absolute bottom-1/3 right-1/4 w-48 h-48 rounded-full opacity-15"
            style={{
              background: "radial-gradient(circle, rgba(16,185,129,0.4) 0%, transparent 70%)",
              filter: "blur(30px)",
              animation: "float-delayed 12s ease-in-out infinite",
            }}
          />
          {/* Subtle grain overlay */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            }}
          />
        </div>

        {/* ─── CONTENT CONTAINER ──────────────────────────────────────────── */}
        <div
          ref={contentRef}
          className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-32 pt-32 flex flex-col justify-end"
        >
          <div className="max-w-3xl">
            {/* Logo with glow effect */}
            <motion.div
              className="hero-reveal mb-10 relative h-20 md:h-24 w-[320px] md:w-[400px]"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={isVisible ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
              transition={{ duration: 1, delay: 0.1, ease: [0.22, 0.61, 0.36, 1] }}
            >
              <div className="absolute -inset-8 rounded-full bg-emerald-500/10 blur-2xl" />
              <Image
                src={logoSrc}
                alt="Olathe Sweet"
                fill
                style={{ objectFit: "contain" }}
                className="drop-shadow-2xl"
                priority
              />
            </motion.div>

            {/* Eyebrow with animated underline */}
            <div className="hero-reveal mb-6">
              {eyebrow && (
                <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-amber-400/80">
                  {eyebrow}
                </p>
              )}
              <div className="mt-3 h-px w-16 bg-gradient-to-r from-emerald-500 to-transparent" />
            </div>

            {/* Main Title - Apple-style reveal */}
            <h1
              className="hero-reveal text-6xl md:text-7xl lg:text-8xl font-black tracking-tight text-white leading-[0.95] mb-6"
              style={{
                textShadow: "0 4px 30px rgba(0,0,0,0.3), 0 0 60px rgba(255,215,0,0.1)",
              }}
            >
              {title.split(" ").map((word, idx) => (
                <span
                  key={idx}
                  className="inline-block mr-4"
                  style={{
                    animationDelay: `${0.2 + idx * 0.1}s`,
                  }}
                >
                  {word}
                </span>
              ))}
            </h1>

            {/* Description with typewriter-like reveal */}
            <p
              className="hero-reveal text-xl md:text-2xl text-white/70 leading-relaxed max-w-xl mb-10"
              style={{ fontWeight: 300 }}
            >
              {description}
            </p>

            {/* CTAs with hover effects */}
            <div className="hero-reveal flex flex-wrap items-center gap-5">
              {primaryButton && (
                <motion.button
                  onClick={handlePrimaryClick}
                  className="group relative rounded-full px-10 py-4 text-sm font-bold tracking-widest uppercase overflow-hidden"
                  style={{
                    background: "linear-gradient(135deg, #059669 0%, #10b981 100%)",
                    boxShadow: "0 8px 32px rgba(16, 185, 129, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)",
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                >
                  <span className="relative z-10 flex items-center gap-3">
                    <span>{primaryButton}</span>
                    <svg
                      className="w-4 h-4 transition-transform group-hover:translate-x-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </span>
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{
                      background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                    }}
                  />
                </motion.button>
              )}
              {secondaryButton && (
                <button
                  onClick={onSecondaryClick}
                  className="group flex items-center gap-3 text-sm font-semibold"
                  style={{ color: "rgba(255,255,255,0.8)" }}
                >
                  <span className="uppercase tracking-widest text-[11px]">{secondaryButton}</span>
                  <span
                    className="w-10 h-10 rounded-full border flex items-center justify-center transition-all duration-300 group-hover:bg-white/10 group-hover:border-white/30"
                    style={{ borderColor: "rgba(255,255,255,0.3)" }}
                  >
                    <svg
                      className="w-4 h-4 transition-transform group-hover:translate-x-0.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </button>
              )}
            </div>

            {/* Stats row */}
            <div className="hero-reveal mt-16 flex flex-wrap gap-12">
              {[
                { stat: "40+", label: "Years Growing" },
                { stat: "3", label: "Generations" },
                { stat: "100%", label: "Hand-Picked" },
              ].map((item, i) => (
                <div key={i} className="text-center">
                  <div
                    className="text-3xl md:text-4xl font-black text-white"
                    style={{ textShadow: "0 2px 20px rgba(0,0,0,0.3)" }}
                  >
                    {item.stat}
                  </div>
                  <div
                    className="text-[10px] uppercase tracking-[0.2em] mt-1"
                    style={{ color: "rgba(255,255,255,0.5)" }}
                  >
                    {item.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ─── SCROLL INDICATOR ────────────────────────────────────────────── */}
        <div
          className="scroll-indicator absolute bottom-10 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-3"
          style={{ pointerEvents: "auto" }}
        >
          <button
            onClick={handlePrimaryClick}
            className="flex flex-col items-center gap-2 text-white/50 hover:text-white/80 transition-colors duration-200"
            aria-label="Scroll to stops"
          >
            <span className="text-[10px] uppercase tracking-[0.25em] font-medium">Explore</span>
            <div
              className="w-6 h-10 rounded-full border border-white/30 flex items-start justify-center p-1.5"
            >
              <div
                className="w-1.5 h-3 rounded-full bg-white animate-bounce"
                style={{ animationDuration: "1.5s" }}
              />
            </div>
          </button>
        </div>

        {/* ─── CORNER DECORATIONS ───────────────────────────────────────────── */}
        <div
          className="parallax-float absolute top-8 right-8 opacity-30"
          style={{ animationDelay: "1s" }}
        >
          <svg className="w-16 h-16" viewBox="0 0 64 64" fill="none">
            <path
              d="M32 4C48 16, 56 32, 48 56C40 64, 24 64, 8 56C0 32, 16 16, 32 4"
              stroke="rgba(255,215,0,0.5)"
              strokeWidth="1"
              fill="none"
            />
            <path
              d="M32 12C44 22, 48 36, 42 52C36 58, 26 58, 18 52C12 36, 20 22, 32 12"
              stroke="rgba(255,215,0,0.3)"
              strokeWidth="1"
              fill="none"
            />
          </svg>
        </div>
        <div
          className="parallax-float absolute bottom-20 left-8 opacity-20"
          style={{ animationDelay: "1.5s" }}
        >
          <svg className="w-12 h-12" viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="20" stroke="rgba(16,185,129,0.4)" strokeWidth="1" />
            <circle cx="24" cy="24" r="14" stroke="rgba(16,185,129,0.3)" strokeWidth="1" />
            <circle cx="24" cy="24" r="8" stroke="rgba(16,185,129,0.2)" strokeWidth="1" />
          </svg>
        </div>
      </section>

      {/* ─── GLOBAL ANIMATIONS ──────────────────────────────────────────────── */}
      <style jsx>{`
        @keyframes float-slow {
          0%, 100% { transform: translate(0, 0); }
          33% { transform: translate(15px, -20px); }
          66% { transform: translate(-10px, 10px); }
        }

        @keyframes float-delayed {
          0%, 100% { transform: translate(0, 0); }
          33% { transform: translate(-20px, 15px); }
          66% { transform: translate(10px, -10px); }
        }

        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(6px); }
        }

        .animate-bounce {
          animation: bounce 1.5s ease-in-out infinite;
        }

        /* Performance optimizations */
        .parallax-float {
          will-change: transform;
        }

        .hero-reveal {
          will-change: opacity, transform;
        }

        /* Smooth transitions */
        button, a {
          -webkit-tap-highlight-color: transparent;
        }
      `}</style>
    </>
  );
}