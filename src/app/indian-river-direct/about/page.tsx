"use client";

import { useEffect, useState, Suspense, lazy } from "react";
import { motion } from "framer-motion";
import StorefrontHeader from "@/components/storefront/StorefrontHeader";
import StorefrontFooter from "@/components/storefront/StorefrontFooter";
import { getBrandSettingsPublic } from "@/actions/brand-settings";

// Lazy load heavy sections
const MissionSection = lazy(() => import("@/components/about/IndianRiverMissionSection"));
const CitrusSection = lazy(() => import("@/components/about/IndianRiverCitrusSection"));
const TeamSection = lazy(() => import("@/components/about/IndianRiverTeamSection"));
const ValuesSection = lazy(() => import("@/components/about/IndianRiverValuesSection"));
const ContactSection = lazy(() => import("@/components/about/IndianRiverContactSection"));
const CTASection = lazy(() => import("@/components/about/IndianRiverCTASection"));

export default function IndianRiverAboutPage() {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoUrlDark, setLogoUrlDark] = useState<string | null>(null);
  const [showWholesaleLink, setShowWholesaleLink] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [customFooterText, setCustomFooterText] = useState<string | null>(null);
  const [contactEmail, setContactEmail] = useState<string | null>(null);
  const [contactPhone, setContactPhone] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const settingsResult = await getBrandSettingsPublic("indian-river-direct");
      if (settingsResult.success && settingsResult.settings) {
        const s = settingsResult.settings;
        setLogoUrl(s.logo_url ?? null);
        setLogoUrlDark(s.logo_url_dark ?? null);
        setCustomFooterText(s.custom_footer_text ?? null);
        setContactEmail(s.email ?? null);
        setContactPhone(s.phone ?? null);
        setShowWholesaleLink(s.show_wholesale_link ?? true);
      }
      try { 
        const { getCurrentAdminUser } = await import("@/actions/admin-user"); 
        setIsAdmin(!!await getCurrentAdminUser()); 
      } catch { /* not logged in */ }
    }
    load();
  }, []);

  return (
    <div className="min-h-screen bg-stone-50">
      <StorefrontHeader 
        brandName="Indian River Direct" 
        brandSlug="indian-river-direct" 
        logoUrl={logoUrl} 
        logoUrlDark={logoUrlDark} 
        showWholesaleLink={showWholesaleLink} 
        isAdmin={isAdmin} 
        brandAccent="blue" 
      />

      <main>
        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-400/30 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-blue-300/20 rounded-full blur-3xl" />
          </div>

          <div className="relative mx-auto max-w-6xl px-6 py-24 md:py-36">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Text content */}
              <div>
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  className="text-[11px] font-bold uppercase tracking-[0.3em] text-white/80 mb-4"
                >
                  Since 1985
                </motion.p>

                <motion.h1
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.15 }}
                  className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tight text-white leading-[1] mb-6"
                >
                  Our Story
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  className="text-xl md:text-2xl text-white/90 leading-relaxed"
                >
                  A Passion for All Things Fruit — From Our Grove to Your Table
                </motion.p>

                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.8, delay: 0.5 }}
                  className="mt-8 h-1 w-16 bg-blue-400 rounded-full origin-left"
                />
              </div>

              {/* Brand imagery */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="flex justify-center lg:justify-end"
              >
                <div className="relative">
                  <div className="absolute -inset-6 bg-blue-900/30 rounded-full blur-2xl" />
                  {logoUrlDark ? (
                    <img
                      src={logoUrlDark}
                      alt="Indian River Direct"
                      className="relative w-56 md:w-72 h-auto object-contain"
                    />
                  ) : (
                    <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-2xl">
                      <span className="text-3xl md:text-4xl font-black text-white">IRD</span>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          </div>

          {/* Bottom transition */}
          <div className="absolute -bottom-px left-0 right-0 h-3 bg-stone-50" />
        </section>

        {/* Mission Section */}
        <Suspense fallback={<LoadingFallback bg="white" />}>
          <MissionSection />
        </Suspense>

        {/* Citrus Varieties */}
        <Suspense fallback={<LoadingFallback bg="bg-stone-50" />}>
          <CitrusSection />
        </Suspense>

        {/* Values */}
        <Suspense fallback={<LoadingFallback bg="white" />}>
          <ValuesSection />
        </Suspense>

        {/* Team Section */}
        <Suspense fallback={<LoadingFallback bg="bg-stone-50" />}>
          <TeamSection />
        </Suspense>

        {/* Contact Section */}
        <Suspense fallback={<LoadingFallback bg="bg-stone-950" />}>
          <ContactSection phone={contactPhone} email={contactEmail} />
        </Suspense>

        {/* CTA Section */}
        <Suspense fallback={<LoadingFallback bg="bg-blue-600" />}>
          <CTASection />
        </Suspense>
      </main>

      <StorefrontFooter 
        brandName="Indian River Direct" 
        brandSlug="indian-river-direct" 
        logoUrl={logoUrl} 
        logoUrlDark={logoUrlDark} 
        customFooterText={customFooterText} 
        contactEmail={contactEmail} 
        contactPhone={contactPhone} 
        isAdmin={isAdmin} 
        brandAccent="blue" 
      />
    </div>
  );
}

// Simple loading fallback - no more skeleton spinners
function LoadingFallback({ bg }: { bg: string }) {
  return <div className={`py-24 md:py-32 ${bg}`} />;
}