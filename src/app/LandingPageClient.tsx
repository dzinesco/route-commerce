"use client";

import { useEffect, useRef } from "react";
import HeroSection from "@/components/landing/HeroSection";
import { LandingPageWrapper } from "@/components/landing/LandingPageWrapper";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Register GSAP plugins
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export default function LandingPageClient() {
  const mainRef = useRef<HTMLDivElement>(null);

  // Global scroll animations (guarded to prevent missing-target warnings when no .scroll-reveal elements)
  useEffect(() => {
    if (typeof window === "undefined" || !mainRef.current) return;

    const ctx = gsap.context(() => {
      // Reveal animations for sections - only if targets exist (prevents GSAP "missing targets" warnings)
      const revealElements = gsap.utils.toArray<Element>(".scroll-reveal");
      if (revealElements.length > 0) {
        revealElements.forEach((el) => {
          gsap.fromTo(
            el,
            { opacity: 0, y: 60 },
            {
              opacity: 1,
              y: 0,
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
      }
    }, mainRef);

    return () => ctx.revert();
  }, []);

  return (
    <LandingPageWrapper>
      <div ref={mainRef}>
        <HeroSection />
      </div>
    </LandingPageWrapper>
  );
}