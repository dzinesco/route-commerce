"use client";

import Header, { Footer, LandingPageWrapper, Section } from "@/components/landing/LandingPageWrapper";
import HeroSection from "@/components/landing/HeroSection";
import FeaturesAndStats from "@/components/landing/FeaturesAndStats";
import TestimonialsAndCTA from "@/components/landing/TestimonialsAndCTA";

export default function LandingPage() {
  return (
    <LandingPageWrapper>
      <Section id="hero">
        <HeroSection />
      </Section>
      
      <Section id="features">
        <FeaturesAndStats />
      </Section>
      
      <Section id="reviews">
        <TestimonialsAndCTA />
      </Section>
    </LandingPageWrapper>
  );
}