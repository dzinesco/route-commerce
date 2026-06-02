"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Register GSAP plugins
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
interface ScrollProgress {
  progress: number;
  direction: number;
  velocity: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// CINEMATIC HERO SECTION - SCROLL-DRIVEN ANIMATIONS
// ─────────────────────────────────────────────────────────────────────────────
export default function HeroSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [scrollProgress, setScrollProgress] = useState<ScrollProgress>({
    progress: 0,
    direction: 1,
    velocity: 0,
  });

  useEffect(() => {
    // Mark as mounted on client-side
    const timer = setTimeout(() => {
      setMounted(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // ─── SCROLL PROGRESS TRACKING ───────────────────────────────────────────────
  useEffect(() => {
    if (!mounted) return;

    const handleScroll = () => {
      const scrollY = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = Math.min(scrollY / docHeight, 1);
      
      setScrollProgress(prev => ({
        progress,
        direction: scrollY > prev.progress ? 1 : -1,
        velocity: Math.abs(scrollY - prev.progress) * 10,
      }));
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [mounted]);

  // ─── GSAP SCROLL ANIMATIONS ────────────────────────────────────────────────
  useEffect(() => {
    if (!mounted || !containerRef.current) return;

    const ctx = gsap.context(() => {
      // Hero section timeline
      const heroTl = gsap.timeline({
        scrollTrigger: {
          trigger: heroRef.current,
          start: "top top",
          end: "bottom top",
          scrub: 1.5,
          pin: true,
          anticipatePin: 1,
        },
      });

      // Hero content fade out on scroll
      heroTl
        .to(".hero-title", {
          y: -120,
          opacity: 0,
          scale: 0.95,
          ease: "power2.inOut",
        })
        .to(
          ".hero-subtitle",
          {
            y: -80,
            opacity: 0,
            ease: "power2.inOut",
          },
          "<"
        )
        .to(
          ".hero-cta",
          {
            y: -60,
            opacity: 0,
            ease: "power2.inOut",
          },
          "<+0.1"
        )
        .to(
          ".hero-visual",
          {
            scale: 1.3,
            y: 100,
            ease: "power2.inOut",
          },
          "<"
        )
        .to(
          ".hero-badge",
          {
            y: -40,
            opacity: 0,
            ease: "power2.inOut",
          },
          "<"
        );

      // Parallax floating elements
      const floatElements = gsap.utils.toArray<Element>(".parallax-float");
      floatElements.forEach((el, i) => {
        gsap.to(el, {
          y: -150 - i * 30,
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
          { opacity: 0, y: 60, skewY: 3 },
          {
            opacity: 1,
            y: 0,
            skewY: 0,
            duration: 1.2,
            ease: "power3.out",
            scrollTrigger: {
              trigger: el,
              start: "top 85%",
              end: "top 50%",
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
          { opacity: 0, scale: 0.85, y: 50 },
          {
            opacity: 1,
            scale: 1,
            y: 0,
            duration: 0.8,
            delay: i * 0.1,
            ease: "back.out(1.4)",
            scrollTrigger: {
              trigger: el,
              start: "top 85%",
              toggleActions: "play none none reverse",
            },
          }
        );
      });

      // Horizontal reveal for feature cards
      const revealHorizontalElements = gsap.utils.toArray<Element>(".reveal-horizontal");
      revealHorizontalElements.forEach((el) => {
        gsap.fromTo(
          el,
          { opacity: 0, x: -60 },
          {
            opacity: 1,
            x: 0,
            duration: 1,
            ease: "power3.out",
            scrollTrigger: {
              trigger: el,
              start: "top 80%",
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
            start: "top 80%",
            toggleActions: "play none none none",
          },
        });
      });
    }, containerRef);

    return () => ctx.revert();
  }, [mounted]);

  const scrollToContent = () => {
    const nextSection = document.getElementById("story");
    if (nextSection) {
      nextSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <>
      {/* ─── SCROLL PROGRESS INDICATOR ────────────────────────────────────────── */}
      <div className="scroll-progress-container">
        <div 
          className="scroll-progress-bar" 
          style={{ transform: `scaleX(${scrollProgress.progress})` }}
        />
      </div>

      {/* ─── HERO SECTION - PINNED SCROLL SEQUENCE ───────────────────────────── */}
      <section
        ref={heroRef}
        className="hero-section relative min-h-screen flex items-center overflow-hidden"
        style={{
          background: "linear-gradient(180deg, #faf8f5 0%, #fef7f0 50%, #fdf6f0 100%)",
        }}
      >
        {/* ─── PARALLAX BACKGROUND LAYERS ─────────────────────────────────────── */}
        <div className="parallax-bg-layer absolute inset-0 pointer-events-none">
          {/* Gradient orbs */}
          <div className="parallax-float absolute top-20 right-20 w-80 h-80 rounded-full opacity-30 blur-3xl"
               style={{ 
                 background: "radial-gradient(circle, rgba(201, 122, 62, 0.4) 0%, transparent 70%)",
                 animation: "float-slow 12s ease-in-out infinite",
               }} />
          <div className="parallax-float absolute bottom-40 left-10 w-96 h-96 rounded-full opacity-25 blur-3xl"
               style={{ 
                 background: "radial-gradient(circle, rgba(107, 185, 165, 0.4) 0%, transparent 70%)",
                 animation: "float-slow-delayed 14s ease-in-out infinite",
               }} />
          
          {/* Grid pattern */}
          <div 
            className="absolute inset-0 opacity-[0.03]" 
            style={{
              backgroundImage: `
                linear-gradient(#4a7c94 1px, transparent 1px),
                linear-gradient(90deg, #4a7c94 1px, transparent 1px)
              `,
              backgroundSize: "80px 80px",
            }}
          />
        </div>

        {/* ─── HERO CONTENT ────────────────────────────────────────────────────── */}
        <div className="container mx-auto px-6 lg:px-16 py-32 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center min-h-[80vh]">
            
            {/* Left Column - Animated Content */}
            <div className="space-y-10 hero-content">
              {/* Animated Badge */}
              <div 
                className="hero-badge inline-flex items-center gap-3 px-6 py-3 rounded-full border"
                style={{
                  borderColor: "#c97a3e",
                  background: "rgba(201, 122, 62, 0.08)",
                }}
              >
                <span 
                  className="w-3 h-3 rounded-full animate-pulse-glow" 
                  style={{ backgroundColor: "#c97a3e" }} 
                />
                <span className="text-sm font-semibold tracking-wide" style={{ color: "#c97a3e" }}>
                  Farm-Fresh Delivery Platform
                </span>
              </div>

              {/* Main Headline - Apple-style reveal */}
              <div className="hero-title space-y-2">
                <h1 
                  className="text-6xl sm:text-7xl lg:text-8xl xl:text-9xl font-bold leading-[0.9] tracking-tighter"
                  style={{ 
                    fontFamily: "'Playfair Display', 'Georgia', serif",
                    color: "#1a1a1a",
                  }}
                >
                  <span className="block text-gradient-sage">From Field</span>
                  <span className="block mt-2 text-gradient-sage">To Fresh</span>
                </h1>
              </div>

              {/* Subtext */}
              <p 
                className="hero-subtitle text-xl sm:text-2xl max-w-xl leading-relaxed"
                style={{ 
                  fontFamily: "'DM Sans', sans-serif",
                  color: "#4a6d56",
                  fontWeight: 400,
                }}
              >
                We connect produce farms with reliable distribution networks, 
                ensuring your harvest reaches markets faster and fresher than ever.
              </p>

              {/* CTAs */}
              <div className="hero-cta flex flex-wrap gap-5">
                <Link 
                  href="/login" 
                  className="group relative inline-flex items-center gap-3 px-8 py-5 rounded-2xl font-semibold text-lg overflow-hidden"
                  style={{
                    background: "linear-gradient(135deg, #1a4d2e 0%, #166534 100%)",
                    color: "white",
                    boxShadow: "0 8px 32px rgba(26, 77, 46, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.15)",
                    transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-3px)";
                    e.currentTarget.style.boxShadow = "0 12px 40px rgba(26, 77, 46, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.2)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 8px 32px rgba(26, 77, 46, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.15)";
                  }}
                >
                  <span>Start Your Route</span>
                  <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
                <Link 
                  href="/brands" 
                  className="group inline-flex items-center gap-3 px-8 py-5 rounded-2xl font-semibold text-lg border-2"
                  style={{
                    color: "#1a4d2e",
                    borderColor: "#1a4d2e",
                    background: "rgba(26, 77, 46, 0.03)",
                    transition: "all 0.3s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#1a4d2e";
                    e.currentTarget.style.color = "white";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(26, 77, 46, 0.03)";
                    e.currentTarget.style.color = "#1a4d2e";
                  }}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span>Browse Farms</span>
                </Link>
              </div>

              {/* Stats */}
              <div className="hero-stats flex flex-wrap gap-8 pt-8">
                {[
                  { stat: "500+", label: "Farm Brands" },
                  { stat: "98%", label: "On-Time" },
                  { stat: "50K+", label: "Deliveries" },
                ].map((item, i) => (
                  <div key={i} className="text-center">
                    <div 
                      className="text-3xl sm:text-4xl font-bold" 
                      style={{ 
                        fontFamily: "'Playfair Display', serif",
                        color: "#1a4d2e",
                      }}
                    >
                      {item.stat}
                    </div>
                    <div className="text-sm font-medium" style={{ color: "#6b8f71" }}>
                      {item.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column - Hero Visual */}
            <div className="hero-visual relative lg:h-[700px]">
              {/* SVG Route Map Visual */}
              <svg
                viewBox="0 0 500 500"
                className="w-full h-full"
                style={{ maxHeight: "700px", filter: "drop-shadow(0 20px 40px rgba(0,0,0,0.08))" }}
              >
                {/* Background with grain */}
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(107, 143, 113, 0.15)" strokeWidth="1" />
                  </pattern>
                  <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#c97a3e" />
                    <stop offset="50%" stopColor="#1a4d2e" />
                    <stop offset="100%" stopColor="#6b8f71" />
                  </linearGradient>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                <rect x="40" y="40" width="420" height="420" rx="24" fill="rgba(107, 143, 113, 0.06)" stroke="rgba(107, 143, 113, 0.2)" strokeWidth="1" />
                <rect x="40" y="40" width="420" height="420" rx="24" fill="url(#grid)" />

                {/* Animated Route Path */}
                <path
                  d="M 80 400 Q 140 360, 180 280 T 260 180 Q 320 120, 400 80"
                  fill="none"
                  stroke="url(#routeGradient)"
                  strokeWidth="6"
                  strokeLinecap="round"
                  filter="url(#glow)"
                  className="route-path-animate"
                  style={{
                    strokeDasharray: "1000",
                    strokeDashoffset: "1000",
                    animation: "draw-route 3s ease-out forwards 0.5s",
                  }}
                />

                {/* Secondary Route */}
                <path
                  d="M 80 400 Q 200 440, 320 380 T 440 280"
                  fill="none"
                  stroke="#6b8f71"
                  strokeWidth="3"
                  strokeLinecap="round"
                  opacity="0.5"
                  strokeDasharray="600"
                  strokeDashoffset="600"
                  style={{ animation: "draw-route 2.5s ease-out forwards 1s" }}
                />

                {/* Farm Location - Animated Pulse */}
                <g className="parallax-float" style={{ animationDelay: "0s" }}>
                  <circle cx="80" cy="400" r="35" fill="rgba(26, 77, 46, 0.1)" className="animate-ping" style={{ animationDuration: "3s" }} />
                  <circle cx="80" cy="400" r="28" fill="rgba(26, 77, 46, 0.15)" />
                  <circle cx="80" cy="400" r="20" fill="#1a4d2e" />
                  <path d="M 80 390 L 80 410 M 72 398 L 80 390 L 88 398" stroke="#faf8f5" strokeWidth="2.5" strokeLinecap="round" />
                </g>

                {/* Hub Location */}
                <g className="parallax-float" style={{ animationDelay: "0.5s" }}>
                  <circle cx="260" cy="180" r="40" fill="rgba(201, 122, 62, 0.1)" className="animate-ping" style={{ animationDuration: "2.5s" }} />
                  <circle cx="260" cy="180" r="32" fill="rgba(201, 122, 62, 0.15)" />
                  <circle cx="260" cy="180" r="22" fill="#c97a3e" />
                  <rect x="250" y="173" width="20" height="14" rx="3" fill="#faf8f5" />
                </g>

                {/* Stop Points */}
                {[
                  { x: 180, y: 280, label: "Stop 1", delay: "1.2s" },
                  { x: 360, y: 120, label: "Stop 2", delay: "1.4s" },
                  { x: 420, y: 90, label: "Market", delay: "1.6s" },
                ].map((stop, i) => (
                  <g key={i} className="parallax-float" style={{ animationDelay: stop.delay }}>
                    <circle cx={stop.x} cy={stop.y} r="18" fill="rgba(250, 248, 245, 0.9)" stroke="#6b8f71" strokeWidth="2" />
                    <circle cx={stop.x} cy={stop.y} r="10" fill="#6b8f71" />
                  </g>
                ))}

                {/* Decorative Trees */}
                {[[60, 100], [440, 360], [50, 440], [450, 180]].map((coords, i) => (
                  <circle
                    key={i}
                    cx={coords[0]}
                    cy={coords[1]}
                    r="10"
                    fill="rgba(107, 143, 113, 0.3)"
                    className="parallax-float"
                    style={{ animationDelay: `${i * 0.3}s` }}
                  />
                ))}

                {/* Compass */}
                <g transform="translate(420, 420)">
                  <circle cx="0" cy="0" r="30" fill="rgba(26, 77, 46, 0.08)" stroke="#1a4d2e" strokeWidth="1.5" />
                  <path d="M 0 -22 L 5 0 L 0 6 L -5 0 Z" fill="#c97a3e" />
                  <path d="M 0 22 L 5 0 L 0 -6 L -5 0 Z" fill="#6b8f71" />
                  <text x="0" y="-30" textAnchor="middle" fill="#1a4d2e" fontSize="12" fontWeight="700">N</text>
                </g>
              </svg>

              {/* Floating Cards */}
              <div 
                className="absolute top-12 -left-8 parallax-float"
                style={{ animation: "float 8s ease-in-out infinite" }}
              >
                <div 
                  className="rounded-2xl p-5 shadow-2xl border"
                  style={{
                    background: "linear-gradient(135deg, rgba(201, 122, 62, 0.95) 0%, rgba(247, 129, 130, 0.9) 100%)",
                    borderColor: "rgba(247, 129, 130, 0.5)",
                    boxShadow: "0 12px 40px rgba(232, 168, 124, 0.4), 0 0 30px rgba(247, 129, 130, 0.2)",
                  }}
                >
                  <div className="text-3xl font-bold text-white">2.4T</div>
                  <div className="text-sm text-white/90">Miles Saved</div>
                </div>
              </div>

              <div 
                className="absolute bottom-24 -right-4 parallax-float"
                style={{ animation: "float-delayed 10s ease-in-out infinite" }}
              >
                <div 
                  className="rounded-2xl p-5 shadow-2xl border"
                  style={{
                    background: "linear-gradient(135deg, rgba(107, 185, 165, 0.95) 0%, rgba(133, 210, 197, 0.9) 100%)",
                    borderColor: "rgba(133, 210, 197, 0.5)",
                    boxShadow: "0 12px 40px rgba(107, 185, 165, 0.4), 0 0 30px rgba(133, 210, 197, 0.2)",
                  }}
                >
                  <div className="text-3xl font-bold text-white">12hrs</div>
                  <div className="text-sm text-white/90">Avg Delivery</div>
                </div>
              </div>

              <div 
                className="absolute top-1/2 -right-12 parallax-float"
                style={{ animation: "float 9s ease-in-out infinite 1s" }}
              >
                <div 
                  className="rounded-2xl p-4 shadow-xl border flex items-center gap-3"
                  style={{
                    background: "linear-gradient(135deg, rgba(245, 199, 126, 0.95) 0%, rgba(201, 162, 80, 0.9) 100%)",
                    borderColor: "rgba(245, 199, 126, 0.6)",
                    boxShadow: "0 8px 32px rgba(245, 199, 126, 0.4)",
                  }}
                >
                  <span className="w-4 h-4 rounded-full bg-white animate-pulse" />
                  <span className="text-sm font-bold text-white/90">Live Tracking</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── SCROLL INDICATOR ────────────────────────────────────────────────── */}
        <div 
          className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 cursor-pointer"
          onClick={scrollToContent}
        >
          <span 
            className="text-xs font-semibold tracking-[0.2em] uppercase"
            style={{ color: "#6b8f71" }}
          >
            Scroll to explore
          </span>
          <div className="relative w-8 h-14 rounded-full border-2" style={{ borderColor: "#6b8f71" }}>
            <div 
              className="absolute top-2 left-1/2 -translate-x-1/2 w-2 h-4 rounded-full"
              style={{ 
                backgroundColor: "#1a4d2e",
                animation: "scroll-indicator 2s ease-in-out infinite",
              }}
            />
          </div>
        </div>

        {/* Decorative leaves */}
        <svg className="absolute bottom-32 left-16 opacity-15 parallax-float" width="80" height="80" viewBox="0 0 60 60" fill="none">
          <path d="M30 5 C45 15, 50 35, 30 55 C10 35, 15 15, 30 5" fill="#6b8f71" />
          <path d="M30 5 L30 55" stroke="#1a4d2e" strokeWidth="2" />
        </svg>
        <svg className="absolute top-40 right-24 opacity-12 parallax-float" width="60" height="60" viewBox="0 0 40 40" fill="none">
          <path d="M20 3 C30 10, 33 23, 20 37 C7 23, 10 10, 20 3" fill="#c97a3e" />
          <path d="M20 3 L20 37" stroke="#1a4d2e" strokeWidth="1.5" />
        </svg>
      </section>

      {/* ─── STORY SECTION - STICKY SCROLL NARRATIVE ──────────────────────────── */}
      <section id="story" className="relative" style={{ background: "#1a1a1a" }}>
        <div className="sticky-wrapper" style={{ minHeight: "400vh" }}>
          {/* Sticky Container */}
          <div 
            className="sticky-content relative flex items-center justify-center overflow-hidden"
            style={{ 
              position: "sticky", 
              top: 0, 
              height: "100vh",
            }}
          >
            {/* Background gradient that shifts */}
            <div className="absolute inset-0 transition-opacity duration-700" 
                 style={{ 
                   background: "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(26, 77, 46, 0.15) 0%, #1a1a1a 70%)",
                 }} />

            <div className="container mx-auto px-8 text-center relative z-10">
              {/* Story Step 1 */}
              <div className="story-step step-1">
                <span 
                  className="reveal-text inline-block text-xs font-bold tracking-[0.3em] uppercase mb-8"
                  style={{ 
                    color: "#c97a3e",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  The Challenge
                </span>
                <h2 
                  className="reveal-text text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight mb-8"
                  style={{ 
                    fontFamily: "'Playfair Display', serif",
                    color: "#faf8f5",
                  }}
                >
                  Fresh produce should not
                  <br />
                  <span style={{ color: "#c97a3e" }}>sit in transit for days</span>
                </h2>
                <p 
                  className="reveal-text text-xl max-w-2xl mx-auto"
                  style={{ 
                    color: "#86868b",
                    fontFamily: "'DM Sans', sans-serif",
                    lineHeight: 1.7,
                  }}
                >
                  Traditional distribution means your harvest loses freshness, 
                quality, and value before reaching customers.
                </p>
              </div>

              {/* Story Step 2 */}
              <div className="story-step step-2 opacity-0">
                <span 
                  className="inline-block text-xs font-bold tracking-[0.3em] uppercase mb-8"
                  style={{ 
                    color: "#6b8f71",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  The Solution
                </span>
                <h2 
                  className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight mb-8"
                  style={{ 
                    fontFamily: "'Playfair Display', serif",
                    color: "#faf8f5",
                  }}
                >
                  Intelligent route
                  <br />
                  <span style={{ color: "#6b8f71" }}>optimization</span>
                </h2>
                <p 
                  className="text-xl max-w-2xl mx-auto"
                  style={{ 
                    color: "#86868b",
                    fontFamily: "'DM Sans', sans-serif",
                    lineHeight: 1.7,
                  }}
                >
                  Our platform analyzes patterns, traffic, and delivery windows 
                  to get your produce from field to market in hours, not days.
                </p>
              </div>

              {/* Story Step 3 */}
              <div className="story-step step-3 opacity-0">
                <span 
                  className="inline-block text-xs font-bold tracking-[0.3em] uppercase mb-8"
                  style={{ 
                    color: "#22c55e",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  The Result
                </span>
                <h2 
                  className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight mb-8"
                  style={{ 
                    fontFamily: "'Playfair Display', serif",
                    color: "#faf8f5",
                  }}
                >
                  40% faster delivery
                  <br />
                  <span style={{ color: "#22c55e" }}>98% on-time rate</span>
                </h2>
                <p 
                  className="text-xl max-w-2xl mx-auto"
                  style={{ 
                    color: "#86868b",
                    fontFamily: "'DM Sans', sans-serif",
                    lineHeight: 1.7,
                  }}
                >
                  Farms using Route Commerce see dramatic improvements in 
                  freshness, customer satisfaction, and operational efficiency.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FEATURES SECTION - PROGRESSIVE REVEAL ───────────────────────────── */}
      <section 
        className="relative py-32 overflow-hidden"
        style={{ background: "linear-gradient(180deg, #faf8f5 0%, #fef7f0 100%)" }}
      >
        <div className="container mx-auto px-8">
          {/* Section Header */}
          <div className="text-center mb-20">
            <span 
              className="reveal-text inline-block text-xs font-bold tracking-[0.2em] uppercase mb-6"
              style={{ 
                color: "#6b8f71",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Platform Features
            </span>
            <h2 
              className="reveal-text text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight"
              style={{ 
                fontFamily: "'Playfair Display', serif",
                color: "#1a4d2e",
              }}
            >
              Everything You Need
            </h2>
          </div>

          {/* Feature Cards Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: (
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5" />
                    <path d="M2 12l10 5 10-5" />
                  </svg>
                ),
                title: "Product Catalogs",
                description: "Showcase seasonal produce with rich media galleries and real-time availability updates.",
                color: "#1a4d2e",
              },
              {
                icon: (
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="12" cy="12" r="10" />
                    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
                  </svg>
                ),
                title: "Route Planning",
                description: "Optimize delivery routes with intelligent mapping and real-time scheduling.",
                color: "#c97a3e",
              },
              {
                icon: (
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M9 11l3 3L22 4" />
                    <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
                  </svg>
                ),
                title: "Order Management",
                description: "Track orders from placement through delivery with automated status updates.",
                color: "#7a5c9e",
              },
              {
                icon: (
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                  </svg>
                ),
                title: "Wholesale Portal",
                description: "Give buyers a dedicated space to browse pricing and place bulk orders.",
                color: "#5c8a8f",
              },
              {
                icon: (
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                ),
                title: "Harvest Reach",
                description: "Send email and SMS campaigns about seasonal availability and new harvests.",
                color: "#c97a3e",
              },
              {
                icon: (
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <line x1="18" y1="20" x2="18" y2="10" />
                    <line x1="12" y1="20" x2="12" y2="4" />
                    <line x1="6" y1="20" x2="6" y2="14" />
                  </svg>
                ),
                title: "Smart Analytics",
                description: "Uncover sales trends and operational insights with real-time dashboards.",
                color: "#6b8f71",
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="reveal-scale group relative p-8 rounded-3xl transition-all duration-500 cursor-pointer"
                style={{
                  background: "linear-gradient(145deg, rgba(255,255,255,0.9) 0%, rgba(250,248,245,0.95) 100%)",
                  border: "1px solid rgba(26, 77, 46, 0.08)",
                  boxShadow: "0 8px 32px rgba(0, 0, 0, 0.04)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-8px) scale(1.02)";
                  e.currentTarget.style.boxShadow = "0 20px 60px rgba(26, 77, 46, 0.12)";
                  e.currentTarget.style.borderColor = feature.color + "40";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0) scale(1)";
                  e.currentTarget.style.boxShadow = "0 8px 32px rgba(0, 0, 0, 0.04)";
                  e.currentTarget.style.borderColor = "rgba(26, 77, 46, 0.08)";
                }}
              >
                {/* Icon */}
                <div 
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110"
                  style={{ 
                    background: `linear-gradient(135deg, ${feature.color}15 0%, ${feature.color}08 100%)`,
                    color: feature.color,
                    border: `1px solid ${feature.color}20`,
                  }}
                >
                  {feature.icon}
                </div>

                {/* Content */}
                <h3 
                  className="text-2xl font-bold mb-4"
                  style={{ 
                    fontFamily: "'Playfair Display', serif",
                    color: "#1a4d2e",
                  }}
                >
                  {feature.title}
                </h3>
                <p 
                  className="text-base leading-relaxed"
                  style={{ 
                    color: "#555",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  {feature.description}
                </p>

                {/* Hover Arrow */}
                <div 
                  className="absolute bottom-8 right-8 w-10 h-10 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300"
                  style={{ 
                    background: feature.color,
                    transform: "translateX(-10px)",
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── STATS SECTION - SCROLL-TRIGGERED COUNTERS ──────────────────────── */}
      <section 
        className="relative py-32 overflow-hidden"
        style={{ 
          background: "#1a4d2e",
        }}
      >
        {/* Decorative elements */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: "radial-gradient(circle at 25% 25%, white 1px, transparent 1px), radial-gradient(circle at 75% 75%, white 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }} />
        <div className="absolute top-0 left-0 right-0 h-1" style={{
          background: "linear-gradient(to right, transparent, #c97a3e, transparent)",
        }} />

        <div className="container mx-auto px-8 relative z-10">
          <div className="text-center mb-16">
            <span 
              className="reveal-text inline-block text-xs font-bold tracking-[0.2em] uppercase"
              style={{ 
                color: "#c97a3e",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Our Impact
            </span>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-12">
            {[
              { value: 500, suffix: "+", label: "Produce Brands" },
              { value: 50000, suffix: "+", label: "Orders Delivered" },
              { value: 98, suffix: "%", label: "On-Time Delivery" },
              { value: 2000000, prefix: "$", suffix: "+", label: "Weekly Sales" },
            ].map((stat, i) => (
              <div key={i} className="text-center reveal-scale" style={{ animationDelay: `${i * 0.1}s` }}>
                <div 
                  className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-4"
                  style={{ 
                    fontFamily: "'Playfair Display', serif",
                    color: "#faf8f5",
                    lineHeight: 1,
                  }}
                >
                  {stat.prefix && <span style={{ color: "#c97a3e" }}>{stat.prefix}</span>}
                  <span 
                    className="counter-animate" 
                    data-target={stat.value}
                  >
                    0
                  </span>
                  <span style={{ color: "#c97a3e" }}>{stat.suffix}</span>
                </div>
                <p 
                  className="text-base font-medium"
                  style={{ 
                    color: "#6b8f71",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA SECTION - FINAL REVEAL ─────────────────────────────────────── */}
      <section 
        className="relative py-40 overflow-hidden"
        style={{ 
          background: "linear-gradient(180deg, #faf8f5 0%, #f5f2ed 100%)",
        }}
      >
        {/* Decorative orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-10" style={{
          background: "radial-gradient(circle, rgba(26, 77, 46, 0.3) 0%, transparent 70%)",
          filter: "blur(60px)",
        }} />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full opacity-10" style={{
          background: "radial-gradient(circle, rgba(201, 122, 62, 0.3) 0%, transparent 70%)",
          filter: "blur(60px)",
        }} />

        <div className="container mx-auto px-8 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            {/* Label */}
            <span 
              className="reveal-text inline-block text-xs font-bold tracking-[0.2em] uppercase px-5 py-2 rounded-full mb-8"
              style={{ 
                color: "#c97a3e",
                background: "rgba(201, 122, 62, 0.1)",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Get Started Today
            </span>

            {/* Headline */}
            <h2 
              className="reveal-text text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight mb-8"
              style={{ 
                fontFamily: "'Playfair Display', serif",
                color: "#1a1a1a",
              }}
            >
              Ready to Grow
              <br />
              <span style={{ color: "#1a4d2e" }}>Your Routes?</span>
            </h2>

            {/* Subtitle */}
            <p 
              className="reveal-text text-xl mb-12"
              style={{ 
                color: "#555",
                fontFamily: "'DM Sans', sans-serif",
                lineHeight: 1.7,
              }}
            >
              Join hundreds of produce brands who trust Route Commerce 
              to power their farm-fresh operations.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap justify-center gap-6">
              <Link
                href="/admin"
                className="group inline-flex items-center gap-3 px-10 py-5 rounded-2xl text-lg font-bold transition-all duration-300"
                style={{
                  background: "linear-gradient(135deg, #1a4d2e 0%, #166534 100%)",
                  color: "white",
                  boxShadow: "0 8px 32px rgba(26, 77, 46, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.15)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-3px)";
                  e.currentTarget.style.boxShadow = "0 12px 40px rgba(26, 77, 46, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 8px 32px rgba(26, 77, 46, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.15)";
                }}
              >
                <span>Start Free Trial</span>
                <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>

              <Link
                href="/brands"
                className="group inline-flex items-center gap-3 px-10 py-5 rounded-2xl text-lg font-bold border-2 transition-all duration-300"
                style={{
                  color: "#1a4d2e",
                  borderColor: "#1a4d2e",
                  background: "rgba(26, 77, 46, 0.03)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#1a4d2e";
                  e.currentTarget.style.color = "white";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(26, 77, 46, 0.03)";
                  e.currentTarget.style.color = "#1a4d2e";
                }}
              >
                <span>View Farms</span>
              </Link>
            </div>

            {/* Disclaimer */}
            <p 
              className="mt-8 text-sm"
              style={{ 
                color: "#888",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              No credit card required · 14-day free trial · Cancel anytime
            </p>
          </div>
        </div>
      </section>

      {/* ─── GLOBAL STYLES ────────────────────────────────────────────────────── */}
      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700;800&family=DM+Sans:wght@400;500;600;700&display=swap');

        /* Scroll Progress Bar */
        .scroll-progress-container {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          z-index: 1000;
          background: rgba(26, 77, 46, 0.1);
        }

        .scroll-progress-bar {
          height: 100%;
          background: linear-gradient(90deg, #1a4d2e, #c97a3e, #6b8f71);
          transform-origin: left;
          transition: transform 0.1s ease-out;
        }

        /* Text Gradient */
        .text-gradient-sage {
          background: linear-gradient(135deg, #1a4d2e 0%, #6b8f71 50%, #1a4d2e 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: gradient-shift 6s ease-in-out infinite;
        }

        @keyframes gradient-shift {
          0%, 100% { background-position: 0% center; }
          50% { background-position: 100% center; }
        }

        /* Float animations */
        @keyframes float-slow {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(20px, -30px) scale(1.05); }
          66% { transform: translate(-10px, 10px) scale(0.95); }
        }

        @keyframes float-slow-delayed {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-25px, 20px) scale(1.03); }
          66% { transform: translate(15px, -15px) scale(0.97); }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-15px); }
        }

        @keyframes float-delayed {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }

        /* Ping animation */
        @keyframes ping {
          75%, 100% {
            transform: scale(2);
            opacity: 0;
          }
        }

        .animate-ping {
          animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
        }

        /* Pulse glow */
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(201, 122, 62, 0.4); }
          50% { box-shadow: 0 0 20px 5px rgba(201, 122, 62, 0.3); }
        }

        .animate-pulse-glow {
          animation: pulse-glow 3s ease-in-out infinite;
        }

        /* Route draw animation */
        @keyframes draw-route {
          to { stroke-dashoffset: 0; }
        }

        /* Scroll indicator */
        @keyframes scroll-indicator {
          0%, 100% { 
            transform: translateX(-50%) translateY(0);
            opacity: 1;
          }
          50% { 
            transform: translateX(-50%) translateY(12px);
            opacity: 0.5;
          }
        }

        /* Story section transitions */
        .story-step {
          position: absolute;
          width: 100%;
          opacity: 0;
          transition: opacity 0.8s ease-out;
        }

        .story-step.active {
          opacity: 1;
        }

        /* Smooth scroll behavior */
        html {
          scroll-behavior: smooth;
        }

        /* Responsive typography scale */
        @media (max-width: 768px) {
          .text-6xl { font-size: 3rem !important; }
          .text-7xl { font-size: 3.5rem !important; }
          .text-8xl { font-size: 4rem !important; }
          .text-9xl { font-size: 4.5rem !important; }
        }

        /* Performance optimizations */
        .parallax-float {
          will-change: transform;
        }

        .reveal-text {
          will-change: opacity, transform;
        }

        /* Sticky section styles */
        .sticky-wrapper {
          position: relative;
        }

        .sticky-content {
          position: sticky;
          top: 0;
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }
      `}</style>
    </>
  );
}