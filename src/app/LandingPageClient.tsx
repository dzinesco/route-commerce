"use client";

import { useEffect, useRef } from "react";
import HeroSection from "@/components/landing/HeroSection";
import FeaturesAndStats from "@/components/landing/FeaturesAndStats";
import TestimonialsAndCTA from "@/components/landing/TestimonialsAndCTA";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Register GSAP plugins
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export default function LandingPageClient() {
  const mainRef = useRef<HTMLDivElement>(null);

  // Global scroll animations
  useEffect(() => {
    if (typeof window === "undefined" || !mainRef.current) return;

    const ctx = gsap.context(() => {
      // Parallax sections
      const parallaxElements = gsap.utils.toArray<Element>(".parallax-section");
      parallaxElements.forEach((el) => {
        gsap.to(el, {
          y: -50,
          ease: "none",
          scrollTrigger: {
            trigger: el,
            start: "top bottom",
            end: "bottom top",
            scrub: 1,
          },
        });
      });

      // Reveal animations for sections
      const revealElements = gsap.utils.toArray<Element>(".scroll-reveal");
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
    }, mainRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={mainRef}>
      <HeroSection />
      <FeaturesAndStats />
      <TestimonialsAndCTA />
    </div>
  );
}