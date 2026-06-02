"use client";

import Header, { Footer, LandingPageWrapper, Section } from "@/components/landing/LandingPageWrapper";
import HeroSection from "@/components/landing/HeroSection";
import FeaturesAndStats from "@/components/landing/FeaturesAndStats";
import TestimonialsAndCTA from "@/components/landing/TestimonialsAndCTA";

export default function LandingPageClient() {
  return (
    <LandingPageWrapper>
      <Section id="hero" aria-label="Hero section">
        <HeroSection />
      </Section>
      
      <Section id="features" aria-label="Features section">
        <FeaturesAndStats />
      </Section>
      
      <Section id="reviews" aria-label="Reviews and call to action section">
        <TestimonialsAndCTA />
      </Section>
    </LandingPageWrapper>
  );
}