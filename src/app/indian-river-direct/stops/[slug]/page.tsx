"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import ProductCard from "@/components/storefront/ProductCard";
import StopSetEffect from "@/components/storefront/StopSetEffect";
import StorefrontHeader from "@/components/storefront/StorefrontHeader";
import StorefrontFooter from "@/components/storefront/StorefrontFooter";
import LayoutContainer from "@/components/layout/LayoutContainer";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/format-date";

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
};

export default function StopPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [stop, setStop] = useState<{
    id: string;
    city: string;
    state: string;
    date: string;
    time: string;
    location: string;
    brand_id: string;
  } | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [brandSlug, setBrandSlug] = useState("indian-river-direct");
  const [brandAccent, setBrandAccent] = useState<"green" | "orange" | "blue">("blue");

  useEffect(() => {
    async function load() {
      const { data: stopData } = await supabase
        .from("stops")
        .select("*")
        .eq("slug", slug)
        .eq("active", true)
        .single();

      if (!stopData) return;

      setStop(stopData);
      const isIndian = slug.includes("indian");
      setBrandSlug(isIndian ? "indian-river-direct" : "tuxedo");
      setBrandAccent(isIndian ? "blue" : "green");

      const { data: productsData } = await supabase
        .from("products")
        .select("*")
        .eq("brand_id", stopData.brand_id)
        .eq("active", true);
      setProducts(productsData ?? []);
    }
    load();
  }, [slug]);

  if (!stop) {
    return (
      <div className="min-h-screen bg-stone-50">
        <StorefrontHeader brandName="Indian River Direct" brandSlug="indian-river-direct" brandAccent="blue" />
        <main className="px-6 py-20">
          <LayoutContainer>
            <div className="max-w-5xl mx-auto">
              <div className="animate-pulse space-y-4">
                <div className="h-4 w-32 bg-stone-200 rounded" />
                <div className="h-16 w-64 bg-stone-200 rounded" />
              </div>
            </div>
          </LayoutContainer>
        </main>
      </div>
    );
  }

  const isBlue = brandAccent === "blue";
  const brandLabel = isBlue ? "Indian River Direct" : "Tuxedo Corn";

  return (
    <div className="min-h-screen bg-stone-50/80 backdrop-blur-xl">
      <StorefrontHeader
        brandName={brandLabel}
        brandSlug={brandSlug}
        brandAccent={brandAccent}
      />

      <main className="px-6 py-16 md:py-20">
        <LayoutContainer>
          <div className="max-w-5xl mx-auto">

            {/* Back navigation */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4 }}
              className="mb-10 flex items-center gap-2"
            >
              <Link
                href={`/${brandSlug}#stops`}
                className="flex items-center gap-2 text-sm font-medium text-stone-500 hover:text-stone-800 transition-colors group"
              >
                <svg
                  className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
                All Stops
              </Link>
              <span className="text-stone-300">/</span>
              <span className="text-sm text-stone-700 font-medium">{stop.city}, {stop.state}</span>
            </motion.div>

            {/* Stop header with animation */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 0.61, 0.36, 1] }}
              className="backdrop-blur-sm bg-white/60 border border-white/50 rounded-3xl p-8 mb-12"
            >
              <p className="text-[11px] font-semibold uppercase tracking-widest text-blue-600 mb-4">
                {isBlue ? "Indian River Direct" : "Tuxedo Corn"}
              </p>
              <h1 className="text-5xl md:text-7xl font-black tracking-tight text-stone-950 leading-[1.0]">
                {stop.city},<br className="hidden md:block" /> {stop.state}
              </h1>
              <p className="mt-5 max-w-xl text-lg text-stone-500 leading-relaxed">
                {isBlue
                  ? "Order fresh Florida citrus for pickup at this stop."
                  : "Order fresh Olathe Sweet™ sweet corn for pickup at this stop."}
              </p>
              <div className="mt-6 h-px w-12 bg-blue-600" />
            </motion.div>

            {/* Stop info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 0.61, 0.36, 1] }}
              className="backdrop-blur-md bg-white/80 border border-white/50 rounded-3xl p-8 mb-14 shadow-xl shadow-stone-200/50"
            >
              <div className="grid gap-4 md:grid-cols-3">
                {/* Date */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                  className="flex items-start gap-4 py-4 px-5 rounded-2xl bg-stone-50"
                >
                  <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${isBlue ? "bg-blue-50" : "bg-emerald-50"}`}>
                    <svg className={`h-5 w-5 ${isBlue ? "text-blue-500" : "text-emerald-600"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1">Date</p>
                    <p className="font-bold text-stone-950">{formatDate(stop.date)}</p>
                  </div>
                </motion.div>
                {/* Time */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.3 }}
                  className="flex items-start gap-4 py-4 px-5 rounded-2xl bg-stone-50"
                >
                  <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${isBlue ? "bg-blue-50" : "bg-emerald-50"}`}>
                    <svg className={`h-5 w-5 ${isBlue ? "text-blue-500" : "text-emerald-600"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1">Time</p>
                    <p className="font-bold text-stone-950">{stop.time}</p>
                  </div>
                </motion.div>
                {/* Location */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.4 }}
                  className="flex items-start gap-4 py-4 px-5 rounded-2xl bg-stone-50"
                >
                  <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${isBlue ? "bg-blue-50" : "bg-emerald-50"}`}>
                    <svg className={`h-5 w-5 ${isBlue ? "text-blue-500" : "text-emerald-600"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1">Location</p>
                    <p className="font-bold text-stone-950 leading-tight">{stop.location}</p>
                  </div>
                </motion.div>
              </div>
            </motion.div>

            {/* Available Products — editorial header */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 0.61, 0.36, 1] }}
            >
              <div className="mb-10">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-blue-600 mb-4">Farm-Direct</p>
                <h2 className="text-4xl md:text-5xl font-black tracking-tight text-stone-950 leading-tight">
                  Available Products
                </h2>
                <div className="mt-5 h-px w-12 bg-blue-600" />
                <p className="mt-5 text-base text-stone-500 leading-relaxed">
                  Preorder for pickup — add items below and we will have them ready at the stop.
                </p>
              </div>
              {products.length === 0 ? (
                <div className="backdrop-blur-sm bg-white/70 border border-white/50 rounded-3xl p-12 text-center shadow-lg">
                  <p className="text-stone-500">No products available for this stop.</p>
                </div>
              ) : (
                <div className="grid gap-8 md:grid-cols-3">
                  {products.map((product) => (
                    <ProductCard
                      key={product.id}
                      id={product.id}
                      name={product.name}
                      description={product.description}
                      price={`$${product.price}`}
                      type={product.type}
                      imageUrl={product.image_url}
                      brandSlug={brandSlug}
                      brandName={brandLabel}
                      brandId={product.brand_id}
                      brandAccent={brandAccent}
                      is_taxable={product.is_taxable}
                      pickup_type={product.pickup_type}
                    />
                  ))}
                </div>
              )}
            </motion.section>
          </div>
        </LayoutContainer>
      </main>

      <StorefrontFooter
        brandName={brandLabel}
        brandSlug={brandSlug}
        brandAccent={brandAccent}
      />
    </div>
  );
}