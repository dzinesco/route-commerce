"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Register GSAP plugins
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

interface StickyScrollSectionProps {
  children: React.ReactNode;
  height?: string;
  className?: string;
}

export default function StickyScrollSection({
  children,
  height = "300vh",
  className = "",
}: StickyScrollSectionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isStuck, setIsStuck] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current) return;

    const ctx = gsap.context(() => {
      const trigger = ScrollTrigger.create({
        trigger: containerRef.current,
        start: "top top",
        end: "bottom bottom",
        pin: true,
        pinSpacing: false,
        onToggle: (self) => {
          setIsStuck(self.isActive);
        },
      });

      return () => trigger.kill();
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
      style={{ height }}
    >
      <div
        className={`sticky top-0 h-screen overflow-hidden transition-all duration-300 ${
          isStuck ? "opacity-100" : "opacity-0"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCROLL-REVEAL WRAPPER - Layers content as user scrolls
// ─────────────────────────────────────────────────────────────────────────────
interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  stagger?: boolean;
  direction?: "up" | "down" | "left" | "right" | "scale";
  from?: "up" | "down" | "left" | "right" | "scale";
  delay?: number;
}

export function ScrollReveal({
  children,
  className = "",
  stagger = false,
  direction = "up",
  from,
  delay = 0,
}: ScrollRevealProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const effectiveDirection = from ?? direction;

  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current) return;

    const ctx = gsap.context(() => {
      const elements = containerRef.current?.querySelectorAll("[data-reveal]");

      if (!elements?.length) {
        // Single child reveal
        gsap.fromTo(
          containerRef.current,
          { opacity: 0, y: 60 },
          {
            opacity: 1,
            y: 0,
            duration: 1,
            ease: "power3.out",
            delay,
            scrollTrigger: {
              trigger: containerRef.current,
              start: "top 80%",
              toggleActions: "play none none reverse",
            },
          }
        );
        return;
      }

      // Staggered reveal
      const animProps: gsap.TweenVars = { opacity: 0 };

      switch (effectiveDirection) {
        case "up":
          animProps.y = 60;
          break;
        case "down":
          animProps.y = -60;
          break;
        case "left":
          animProps.x = 60;
          break;
        case "right":
          animProps.x = -60;
          break;
        case "scale":
          animProps.scale = 0.9;
          break;
      }

      gsap.fromTo(
        elements,
        animProps,
        {
          opacity: 1,
          x: 0,
          y: 0,
          scale: 1,
          duration: 0.8,
          stagger: stagger ? 0.1 : 0,
          ease: "power3.out",
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top 80%",
            toggleActions: "play none none reverse",
          },
        }
      );
    }, containerRef);

    return () => ctx.revert();
  }, [effectiveDirection, stagger, delay]);

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PARALLAX LAYER - Depth effect on scroll
// ─────────────────────────────────────────────────────────────────────────────
interface ParallaxLayerProps {
  children: React.ReactNode;
  speed?: number; // 0-1, higher = more movement
  className?: string;
  style?: React.CSSProperties;
}

export function ParallaxLayer({
  children,
  speed = 0.5,
  className = "",
  style,
}: ParallaxLayerProps) {
  const layerRef = useRef<HTMLDivElement>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || !layerRef.current) return;

    const ctx = gsap.context(() => {
      const moveDistance = speed * 150; // max 150px movement

      gsap.to(layerRef.current, {
        y: -moveDistance,
        ease: "none",
        scrollTrigger: {
          trigger: layerRef.current,
          start: "top bottom",
          end: "bottom top",
          scrub: 1,
        },
      });
    }, layerRef);

    return () => ctx.revert();
  }, [isClient, speed]);

  if (!isClient) {
    return <div className={className} style={style}>{children}</div>;
  }

  return (
    <div ref={layerRef} className={className} style={style}>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PROGRESS INDICATOR - Shows scroll progress through section
// ─────────────────────────────────────────────────────────────────────────────
interface ProgressIndicatorProps {
  className?: string;
  color?: string;
}

export function ProgressIndicator({
  className = "",
  color = "#10b981",
}: ProgressIndicatorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current) return;

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: containerRef.current,
        start: "top top",
        end: "bottom bottom",
        scrub: true,
        onUpdate: (self) => {
          setProgress(self.progress);
        },
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="sticky top-0 h-screen flex items-center justify-center">
        <div
          className="w-1 h-64 bg-white/10 rounded-full overflow-hidden"
        >
          <div
            className="w-full rounded-full transition-all duration-100"
            style={{
              height: `${progress * 100}%`,
              background: color,
              boxShadow: `0 0 20px ${color}`,
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FADE ON SCROLL - Elements that fade/scale as user scrolls
// ─────────────────────────────────────────────────────────────────────────────
interface FadeOnScrollProps {
  children: React.ReactNode;
  className?: string;
  from?: "top" | "bottom" | "left" | "right" | "up" | "down";
  to?: "top" | "bottom" | "left" | "right";
  distance?: number;
  duration?: number;
  delay?: number;
}

export function FadeOnScroll({
  children,
  className = "",
  from = "bottom",
  to,
  distance = 100,
  duration = 1,
  delay = 0,
}: FadeOnScrollProps) {
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !elementRef.current) return;

    const ctx = gsap.context(() => {
      let fromProps: gsap.TweenVars = { opacity: 0 };
      let fromY = 0;
      let fromX = 0;

      // Use 'from' direction for the starting position
      switch (from) {
        case "top":
          fromY = distance;
          break;
        case "bottom":
          fromY = -distance;
          break;
        case "left":
          fromX = distance;
          break;
        case "right":
          fromX = -distance;
          break;
      }

      fromProps.y = fromY;
      fromProps.x = fromX;

      gsap.fromTo(
        elementRef.current,
        fromProps,
        {
          opacity: 1,
          x: 0,
          y: 0,
          duration,
          ease: "power3.out",
          delay,
          scrollTrigger: {
            trigger: elementRef.current,
            start: "top 85%",
            toggleActions: "play none none reverse",
          },
        }
      );
    }, elementRef);

    return () => ctx.revert();
  }, [from, distance, duration, delay]);

  return (
    <div ref={elementRef} className={className}>
      {children}
    </div>
  );
}