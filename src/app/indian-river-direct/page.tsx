"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useInView } from "framer-motion";
import StorefrontHeader from "@/components/storefront/StorefrontHeader";
import StorefrontFooter from "@/components/storefront/StorefrontFooter";
import LayoutContainer from "@/components/layout/LayoutContainer";
import WhyIndianRiverDirect from "@/components/storefront/WhyIndianRiverDirect";
import { supabase } from "@/lib/supabase";
import { getBrandSettingsPublic } from "@/actions/brand-settings";

type Brand = { id: string; name: string; slug: string };
type Stop = { id: string; city: string; state: string; date: string; time: string; location: string; slug: string; brand_id: string };
type Product = { 
  id: string; 
  name: string; 
  description: string | null; 
  price: number; 
  type: string; 
  image_url: string | null; 
  brand_id: string; 
  is_taxable?: boolean; 
  pickup_type?: "scheduled_stop" | "shed";
  seasonal?: boolean;
  season_start?: string;
  season_end?: string;
  preorder?: boolean;
  price_tba?: boolean;
  pickup_only?: boolean;
};

const TESTIMONIALS = [
  { name: "Linda Hurlbut", text: "I finally got my grapefruit from you today. OMG thank you for bringing your fruit to us. It is amazing. We will see you next month & tell our friends.", rating: 5 },
  { name: "Phil Myers", text: "I just wanted to comment on the citrus I received. They were absolutely the best I have got from you over the past few years!", rating: 5 },
  { name: "Bill Prue", text: "I would just like to say how pleased we are with your Orrie Tangerines! Very good indeed!!", rating: 5 },
];

const SCHEDULE_PDFS = [
  { region: "OH-IN-KY-WV", url: "https://cdn.shopify.com/s/files/1/0506/2908/3294/files/2026_OH-IN-KY_Peaches_Draft_Website.pdf" },
  { region: "WI-IL", url: "https://cdn.shopify.com/s/files/1/0506/2908/3294/files/2026_WI-IL_Schedule_Draft_Website.pdf" },
];

// Scroll-triggered fade-in wrapper
function FadeInSection({ 
  children, 
  className = "", 
  delay = 0 
}: { 
  children: React.ReactNode; 
  className?: string; 
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 32 }}
      transition={{ duration: 0.7, delay, ease: [0.22, 0.61, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default function IndianRiverDirectPage() {
  const [brand, setBrand] = useState<Brand | null>(null);
  const [stops, setStops] = useState<Stop[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoUrlDark, setLogoUrlDark] = useState<string | null>(null);
  const [showSchedulePdf, setShowSchedulePdf] = useState(true);
  const [showWholesaleLink, setShowWholesaleLink] = useState(true);
  const [heroTagline, setHeroTagline] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [customFooterText, setCustomFooterText] = useState<string | null>(null);
  const [contactEmail, setContactEmail] = useState<string | null>(null);
  const [contactPhone, setContactPhone] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const slug = "indian-river-direct";
      const [brandResult, settingsResult] = await Promise.all([
        supabase.from("brands").select("*").eq("slug", slug).single(),
        getBrandSettingsPublic(slug),
      ]);

      const brandData = brandResult.data;
      setBrand(brandData);

      if (settingsResult.success && settingsResult.settings) {
        const s = settingsResult.settings;
        setLogoUrl(s.logo_url ?? null);
        setLogoUrlDark(s.logo_url_dark ?? null);
        setHeroTagline(s.hero_tagline ?? null);
        setCustomFooterText(s.custom_footer_text ?? null);
        setContactEmail(s.email ?? null);
        setContactPhone(s.phone ?? null);
        setShowSchedulePdf(s.show_schedule_pdf ?? true);
        setShowWholesaleLink(s.show_wholesale_link ?? true);
      }
      try {
        const { getCurrentAdminUser } = await import("@/actions/admin-user");
        setIsAdmin(!!await getCurrentAdminUser());
      } catch { /* not logged in */ }

      if (brandData?.id) {
        const [{ data: stopsData }, { data: productsData }] = await Promise.all([
          supabase.from("stops").select("*").eq("brand_id", brandData.id).eq("active", true),
          supabase.from("products").select("*").eq("brand_id", brandData.id).eq("active", true),
        ]);
        setStops(stopsData ?? []);
        setProducts(productsData ?? []);
      }
    }
    load();
  }, []);

  return (
    <div className="min-h-screen bg-white/50 backdrop-blur-xl">
      <StorefrontHeader
        brandName={brand?.name ?? "Indian River Direct"}
        brandSlug="indian-river-direct"
        logoUrl={logoUrl}
        logoUrlDark={logoUrlDark}
        showWholesaleLink={showWholesaleLink}
        isAdmin={isAdmin}
        brandAccent="blue"
      />

      <main>
        {/* ── Hero — Light Fresh Background ── */}
        <section className="relative bg-gradient-to-b from-blue-50 via-white to-stone-50 overflow-hidden min-h-[640px] flex items-center">
          {/* Subtle decorative elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-100/40 rounded-full -translate-y-1/2 translate-x-1/4 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-50/60 rounded-full translate-y-1/2 -translate-x-1/4 blur-3xl" />
          
          <LayoutContainer>
            <div className="relative z-10 mx-auto max-w-4xl text-center pt-20 pb-16">
              {/* Eyebrow */}
              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-xs font-bold uppercase tracking-[0.3em] text-blue-600 mb-5"
              >
                Since 1985
              </motion.p>
              
              {/* Headline */}
              <motion.h1
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tight text-stone-950 leading-[1.05]"
              >
                Fresh From<br />The Grove
              </motion.h1>
              
              {/* Subheading */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.35 }}
                className="mt-8 text-xl md:text-2xl text-stone-600 leading-relaxed max-w-2xl mx-auto"
              >
                {heroTagline ?? "Family-owned and operated. Bringing the finest peaches, pecans, and seasonal citrus from our Florida groves directly to your neighborhood."}
              </motion.p>
              
              {/* CTA Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="mt-12 flex gap-4 justify-center flex-wrap"
              >
                <Link 
                  href="/indian-river-direct#stops" 
                  className="rounded-2xl bg-blue-600 px-8 py-4 font-bold text-white hover:bg-blue-500 active:bg-blue-700 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-900/20 transition-all text-sm tracking-wider"
                >
                  Find a Stop
                </Link>
                <Link 
                  href="/indian-river-direct#products" 
                  className="rounded-2xl bg-white px-8 py-4 font-bold text-blue-600 hover:bg-blue-50 active:bg-blue-100 hover:-translate-y-0.5 hover:shadow-xl shadow-sm transition-all text-sm tracking-wider border border-blue-200"
                >
                  Shop Products
                </Link>
              </motion.div>
            </div>
          </LayoutContainer>

          {/* Scroll indicator */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.6 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2"
          >
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              className="flex flex-col items-center gap-2"
            >
              <span className="text-[10px] uppercase tracking-widest text-stone-400">Scroll</span>
              <svg className="w-5 h-5 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </motion.div>
          </motion.div>
        </section>

        {/* ── Why Indian River Direct Section ── */}
        <WhyIndianRiverDirect />

        {/* ── Pickup-Only Notice ── */}
        <FadeInSection className="py-16 bg-white relative">
          <LayoutContainer>
            <div className="mx-auto max-w-2xl">
              <div className="rounded-3xl bg-gradient-to-br from-blue-50/80 to-stone-50/80 backdrop-blur-sm border border-blue-100/50 p-8 shadow-xl shadow-blue-200/30">
                <div className="flex items-center justify-center gap-5">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/30">
                      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-stone-950">Pickup Only — Direct from the Truck</h3>
                    <p className="text-stone-600 text-sm mt-1">All products picked up at our scheduled truck stops across Ohio, Indiana, Kentucky, West Virginia, Wisconsin, and Illinois.</p>
                  </div>
                </div>
              </div>
            </div>
          </LayoutContainer>
        </FadeInSection>

        {/* ── Schedule Downloads ── */}
        {showSchedulePdf && (
          <FadeInSection className="py-20 bg-gradient-to-b from-blue-50/50 to-stone-50/50 relative">
            <LayoutContainer>
              <div className="mb-12">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-blue-600 mb-4">2026 Season</p>
                <h2 className="text-4xl md:text-5xl font-black tracking-tight text-stone-950 leading-[1.05]">Pickup Schedule</h2>
                <div className="mt-4 h-px w-12 bg-blue-600" />
                <p className="mt-4 text-stone-600">Download our schedule to find stops in your area.</p>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2 max-w-2xl">
                {SCHEDULE_PDFS.map((pdf) => (
                  <a
                    key={pdf.region}
                    href={pdf.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-2xl bg-white border-2 border-stone-200 p-6 flex items-center gap-4 group shadow-lg hover:shadow-xl hover:border-blue-200 hover:-translate-y-1 transition-all duration-300"
                  >
                    <div className="flex-shrink-0">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-600/30">
                        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-stone-950 text-lg">{pdf.region}</h3>
                      <p className="text-stone-500 text-sm">2026 Season Schedule</p>
                    </div>
                    <svg className="h-5 w-5 text-blue-500 group-hover:text-blue-700 group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </a>
                ))}
              </div>
            </LayoutContainer>
          </FadeInSection>
        )}

        {/* ── Upcoming Stops ── */}
        <FadeInSection className="py-20 bg-white relative">
          <LayoutContainer>
            <div className="mb-12">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-blue-600 mb-4">Family Farms</p>
              <h2 className="text-4xl md:text-5xl font-black tracking-tight text-stone-950 leading-[1.05]">Upcoming Stops</h2>
              <div className="mt-4 h-px w-12 bg-blue-600" />
              <p className="mt-4 text-stone-600">Find a pickup location near you.</p>
            </div>
            
            {stops.length === 0 ? (
              <div className="rounded-3xl bg-stone-50 border-2 border-stone-200 p-12 text-center">
                <p className="text-stone-500">No upcoming stops scheduled. Check back soon for the 2026 season!</p>
              </div>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {stops.slice(0, 6).map((stop) => (
                    <div key={stop.id} className="rounded-2xl bg-gradient-to-br from-blue-50 to-white border-2 border-blue-100 p-5 shadow-lg hover:shadow-xl hover:border-blue-200 hover:-translate-y-1 transition-all duration-300">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-bold text-stone-950 text-lg">{stop.city}, {stop.state}</h3>
                          <p className="text-stone-500 text-sm">{stop.location}</p>
                        </div>
                        <span className="shrink-0 rounded-full bg-blue-600 px-3 py-1 text-xs font-bold text-white shadow-sm">
                          Pickup
                        </span>
                      </div>
                      <div className="text-sm text-stone-600">
                        <p className="font-semibold">{stop.date}</p>
                        <p>{stop.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {stops.length > 6 && (
                  <div className="mt-8 text-center">
                    <Link 
                      href="/indian-river-direct/stops" 
                      className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-500 transition-colors"
                    >
                      View all stops
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                )}
              </>
            )}
          </LayoutContainer>
        </FadeInSection>

        {/* ── Products Section ── */}
        <FadeInSection className="py-20 bg-stone-100 relative">
          <LayoutContainer>
            <div className="mb-12">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-blue-600 mb-4">Fresh Products</p>
              <h2 className="text-4xl md:text-5xl font-black tracking-tight text-stone-950 leading-[1.05]">From Our Grove to You</h2>
              <div className="mt-4 h-px w-12 bg-blue-600" />
              <p className="mt-4 max-w-2xl text-lg text-stone-600 leading-relaxed">
                Hand-picked at peak ripeness, delivered fresh from Titan Farms (South Carolina peaches) and Ellis Brothers (Georgia pecans) directly to your community.
              </p>
            </div>

            {products.length === 0 ? (
              <div className="rounded-3xl bg-white border-2 border-stone-200 p-12 text-center shadow-lg">
                <p className="text-stone-500">Products coming soon for the 2026 season!</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {products.map((product) => (
                  <div key={product.id} className="rounded-2xl bg-white border-2 border-stone-200 overflow-hidden shadow-xl hover:shadow-2xl hover:-translate-y-2 hover:border-blue-200 transition-all duration-300 group">
                    {/* Product Image */}
                    <div className="aspect-[4/3] bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center relative overflow-hidden">
                      {product.image_url ? (
                        <Image src={product.image_url} alt={product.name} fill className="object-cover transition-transform duration-500 group-hover:scale-105" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" />
                      ) : (
                        <div className="text-6xl opacity-30 transition-transform duration-500 group-hover:scale-110">🍑</div>
                      )}
                      {/* Badges */}
                      <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                        {product.preorder && (
                          <span className="rounded-full bg-white text-blue-700 px-3 py-1 text-xs font-bold shadow-lg">
                            Pre-Order
                          </span>
                        )}
                        {product.seasonal && (
                          <span className="rounded-full bg-stone-900/80 backdrop-blur-sm px-3 py-1 text-xs font-medium text-white">
                            {product.season_start} - {product.season_end}
                          </span>
                        )}
                        {product.pickup_only && (
                          <span className="rounded-full bg-blue-600 text-white px-3 py-1 text-xs font-medium shadow-md">
                            Pickup Only
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Product Info */}
                    <div className="p-6">
                      <h3 className="text-lg font-bold text-stone-950 mb-2">{product.name}</h3>
                      <p className="text-stone-600 text-sm leading-relaxed line-clamp-2 mb-4">
                        {product.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold text-stone-950">
                          {product.price_tba ? "Price TBA" : `$${product.price.toFixed(2)}`}
                        </span>
                        {product.price > 0 && (
                          <button className="rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 px-5 py-2.5 text-sm font-bold text-white transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0">
                            {product.preorder ? "Pre-Order" : "Add to Cart"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </LayoutContainer>
        </FadeInSection>

        {/* ── Testimonials ── */}
        <FadeInSection className="py-20 bg-gradient-to-b from-blue-50 to-blue-100/50 relative">
          <LayoutContainer>
            <div className="text-center mb-12">
              <div className="flex items-center justify-center gap-3 mb-3">
                <span className="h-px w-12 bg-gradient-to-r from-transparent to-blue-600" />
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <span className="h-px w-12 bg-gradient-to-l from-transparent to-blue-600" />
              </div>
              <h2 className="text-3xl md:text-4xl font-black text-stone-950 tracking-tight">What Our Customers Say</h2>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {TESTIMONIALS.map((t, i) => (
                <div key={i} className="rounded-2xl bg-white border-2 border-stone-200 p-6 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
                  <div className="flex mb-4">
                    {[...Array(t.rating)].map((_, j) => (
                      <svg key={j} className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <blockquote className="text-stone-600 text-sm leading-relaxed mb-4">
                    "{t.text}"
                  </blockquote>
                  <p className="text-stone-950 font-bold text-sm">— {t.name}</p>
                </div>
              ))}
            </div>
          </LayoutContainer>
        </FadeInSection>

        {/* ── Newsletter ── */}
        <FadeInSection className="py-20 bg-stone-100 relative">
          <LayoutContainer>
            <div className="mx-auto max-w-2xl text-center">
              <div className="rounded-3xl bg-gradient-to-br from-blue-600 to-blue-700 p-10 shadow-2xl shadow-blue-900/30 relative overflow-hidden">
                {/* Decorative pattern */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full -translate-y-1/2 translate-x-1/4" />
                  <div className="absolute bottom-0 left-0 w-32 h-32 bg-white rounded-full translate-y-1/2 -translate-x-1/4" />
                </div>
                <div className="relative">
                  <h2 className="text-2xl md:text-3xl font-black text-white">Stay in the Loop</h2>
                  <p className="mt-2 text-blue-100">Get the annual schedules and tour updates delivered to your inbox.</p>
                  <form className="flex gap-3 max-w-md mx-auto mt-6" onSubmit={(e) => e.preventDefault()}>
                    <input 
                      type="email" 
                      placeholder="your@email.com"
                      className="flex-1 rounded-xl border-2 border-white/30 bg-white/90 backdrop-blur-sm px-4 py-3 text-stone-900 placeholder:text-stone-400 outline-none focus:border-white focus:ring-2 focus:ring-white/50 transition-all"
                    />
                    <button className="rounded-xl bg-white text-blue-700 hover:bg-blue-50 px-6 py-3 font-bold transition-all shadow-lg hover:shadow-xl whitespace-nowrap">
                      Subscribe
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </LayoutContainer>
        </FadeInSection>

        {/* ── CTA ── */}
        <section className="py-20 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 relative overflow-hidden">
          {/* Decorative glow */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent_50%)]" />
          
          <LayoutContainer>
            <div className="relative text-center">
              <h2 className="text-2xl md:text-3xl font-black text-white">Ready to order?</h2>
              <p className="mt-2 text-blue-100">Find a stop near you or browse our seasonal products.</p>
              <div className="mt-8 flex gap-4 justify-center flex-wrap">
                <Link href="/indian-river-direct#stops" className="rounded-2xl bg-white px-8 py-4 font-bold text-blue-600 hover:bg-blue-50 active:bg-blue-100 hover:-translate-y-0.5 hover:shadow-xl shadow-sm transition-all duration-200 text-sm tracking-wider">
                  Find a Stop
                </Link>
                <Link href="/indian-river-direct/about" className="rounded-2xl bg-blue-700/50 backdrop-blur-sm border border-white/30 px-8 py-4 font-bold text-white hover:bg-blue-600/80 hover:-translate-y-0.5 hover:shadow-xl shadow-sm transition-all duration-200 text-sm tracking-wider">
                  Our Story
                </Link>
              </div>
            </div>
          </LayoutContainer>
        </section>
      </main>

      <StorefrontFooter
        brandName={brand?.name ?? "Indian River Direct"}
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