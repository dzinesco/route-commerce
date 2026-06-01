"use client";

import { useEffect, useState, Suspense, lazy } from "react";
import { motion } from "framer-motion";
import StorefrontHeader from "@/components/storefront/StorefrontHeader";
import StorefrontFooter from "@/components/storefront/StorefrontFooter";
import { supabase } from "@/lib/supabase";
import { getBrandSettingsPublic } from "@/actions/brand-settings";

// Lazy load heavy sections
const MissionSection = lazy(() => import("@/components/about/MissionSection"));
const FamilyTimelineSection = lazy(() => import("@/components/about/FamilyTimelineSection"));
const ContactSection = lazy(() => import("@/components/about/ContactSection"));
const CTASection = lazy(() => import("@/components/about/CTASection"));

const OLATHE_SWEET_LOGO_DARK =
  "https://wnzkhezyhnfzhkhiflrp.supabase.co/storage/v1/object/public/brand-logos/64294306-5f42-463d-a5e8-2ad6c81a96de/olathe-sweet-logo.png";

export default function TuxedoAboutPage() {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoUrlDark, setLogoUrlDark] = useState<string | null>(null);
  const [olatheSweetLogoUrlDark, setOlatheSweetLogoUrlDark] = useState<string | null>(null);
  const [aboutHeadline, setAboutHeadline] = useState<string | null>(null);
  const [aboutSubheadline, setAboutSubheadline] = useState<string | null>(null);
  const [showWholesaleLink, setShowWholesaleLink] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [customFooterText, setCustomFooterText] = useState<string | null>(null);
  const [contactEmail, setContactEmail] = useState<string | null>(null);
  const [contactPhone, setContactPhone] = useState<string | null>(null);
  const [address, setAddress] = useState<string>("59751 David Road, Olathe, CO 81425");

  useEffect(() => {
    async function load() {
      const settingsResult = await getBrandSettingsPublic("tuxedo");
      if (settingsResult.success && settingsResult.settings) {
        const s = settingsResult.settings;
        setLogoUrl(s.logo_url ?? null);
        setLogoUrlDark(s.logo_url_dark ?? null);
        setOlatheSweetLogoUrlDark(s.olathe_sweet_logo_url_dark ?? null);
        setAboutHeadline(s.about_headline ?? null);
        setAboutSubheadline(s.about_subheadline ?? null);
        setCustomFooterText(s.custom_footer_text ?? null);
        setContactEmail(s.email ?? null);
        setContactPhone(s.phone ?? null);
        setShowWholesaleLink(s.show_wholesale_link ?? true);
        if (s.brand_id) {
          const { data: ws } = await supabase
            .from("wholesale_settings")
            .select("invoice_business_address")
            .eq("brand_id", s.brand_id)
            .single();
          if (ws?.invoice_business_address) setAddress(ws.invoice_business_address);
        }
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
        brandName="Tuxedo Corn"
        brandSlug="tuxedo"
        logoUrl={logoUrl}
        logoUrlDark={logoUrlDark}
        showWholesaleLink={showWholesaleLink}
        isAdmin={isAdmin}
        brandAccent="green"
      />

      <main>
        {/* Hero Section */}
        <section className="relative bg-stone-950 overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-900/20 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-amber-900/10 rounded-full blur-3xl" />
          </div>

          {/* Pattern overlay */}
          <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(255,255,255,0.1) 35px, rgba(255,255,255,0.1) 70px)' }} />

          <div className="relative mx-auto max-w-6xl px-6 py-24 md:py-36">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Text content */}
              <div>
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  className="text-[11px] font-bold uppercase tracking-[0.3em] text-emerald-400/70 mb-4"
                >
                  Our Heritage
                </motion.p>

                <motion.h1
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.15 }}
                  className="text-5xl md:text-6xl lg:text-7xl font-black text-white tracking-tight leading-[1] mb-6"
                >
                  {aboutHeadline ?? "Three Generations of Sweet Corn Excellence"}
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  className="text-xl md:text-2xl text-stone-300 leading-relaxed"
                >
                  {aboutSubheadline ?? "Over 40 years of growing and shipping Olathe Sweet Sweet Corn from our family to yours."}
                </motion.p>

                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.8, delay: 0.5 }}
                  className="mt-8 h-1 w-16 bg-gradient-to-r from-emerald-500 to-amber-500 rounded-full origin-left"
                />
              </div>

              {/* Logo */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="flex justify-center lg:justify-end"
              >
                <div className="relative">
                  <div className="absolute -inset-6 bg-emerald-900/30 rounded-full blur-2xl" />
                  <img
                    src={olatheSweetLogoUrlDark ?? OLATHE_SWEET_LOGO_DARK}
                    alt="Olathe Sweet"
                    className="relative w-56 md:w-72 h-auto object-contain"
                  />
                </div>
              </motion.div>
            </div>
          </div>

          {/* Bottom transition */}
          <div className="absolute -bottom-px left-0 right-0 h-3 bg-stone-50" />
        </section>

        {/* Mission Section */}
        <Suspense fallback={<LoadingFallback bg="bg-stone-50" />}>
          <MissionSection />
        </Suspense>

        {/* Family Timeline */}
        <Suspense fallback={<LoadingFallback bg="bg-stone-100" />}>
          <FamilyTimelineSection />
        </Suspense>

        {/* Contact Section */}
        <Suspense fallback={<LoadingFallback bg="bg-stone-950" />}>
          <ContactSection address={address} />
        </Suspense>

        {/* CTA Section */}
        <Suspense fallback={<LoadingFallback bg="bg-white" />}>
          <CTASection />
        </Suspense>
      </main>

      <StorefrontFooter
        brandName="Tuxedo Corn"
        brandSlug="tuxedo"
        logoUrl={logoUrl}
        logoUrlDark={logoUrlDark}
        customFooterText={customFooterText}
        contactEmail={contactEmail}
        contactPhone={contactPhone}
        isAdmin={isAdmin}
        brandAccent="green"
      />
    </div>
  );
}

// Simple loading fallback - no more skeleton spinners
function LoadingFallback({ bg }: { bg: string }) {
  return <div className={`py-24 md:py-32 ${bg}`} />;
}