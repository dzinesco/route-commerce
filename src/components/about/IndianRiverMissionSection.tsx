"use client";

import { motion } from "framer-motion";
import LayoutContainer from "@/components/layout/LayoutContainer";

export default function IndianRiverMissionSection() {
  return (
    <>
      {/* Origin Story */}
      <section className="py-24 md:py-32 backdrop-blur-sm bg-white/80 border border-white/50 rounded-3xl p-10 shadow-xl shadow-stone-200/50 relative overflow-hidden">
        <LayoutContainer>
          <motion.div
            initial={{ opacity: 0, y: 48 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.8, ease: [0.22, 0.61, 0.36, 1] }}
            className="mx-auto max-w-2xl"
          >
            <span className="text-[11px] font-semibold uppercase tracking-widest text-blue-600 mb-4 block">The Beginning</span>
            <h2 className="text-5xl md:text-6xl font-black tracking-tight text-stone-950 mb-8 leading-tight">From Farm to Family</h2>
            <div className="space-y-6 text-stone-700 leading-relaxed text-lg">
              <p>
                At Indian River Direct, quality and freshness are more than just goals — they're the foundation of everything we do. We're not just a company that delivers exceptional fruit; we're also the farmers behind the scenes. By acquiring Fort B Groves, the owner of Indian River Direct created a direct and reliable source of premium citrus for our customers.
              </p>
              <p>
                Owning and managing our own grove allows us to oversee every step of the process — from responsible farming practices and careful harvesting to strict quality control — ensuring each fruit box meets our highest standards. With direct access to the farm, we're able to reduce dependence on outside growers and deliver fruit that's consistently fresh, flavorful, and farm-to-table fast.
              </p>
            </div>
          </motion.div>
        </LayoutContainer>
      </section>

      {/* Direct Promise */}
      <section className="py-24 md:py-32 backdrop-blur-sm bg-white/60 border border-white/40 rounded-3xl p-12 shadow-xl shadow-stone-200/50 relative overflow-hidden">
        {/* Subtle decorative elements */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-900/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-emerald-900/5 rounded-full blur-3xl" />
        </div>

        <LayoutContainer>
          <motion.div
            initial={{ opacity: 0, y: 48 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.8, ease: [0.22, 0.61, 0.36, 1] }}
            className="mx-auto max-w-2xl text-center relative"
          >
            <span className="text-[11px] font-semibold uppercase tracking-widest text-blue-600 mb-4 block">Our Promise</span>
            <h2 className="text-5xl md:text-6xl font-black tracking-tight text-stone-950 mb-8 leading-tight">
              The Word &ldquo;Direct&rdquo; Means Something
            </h2>
            <div className="space-y-6 text-stone-700 leading-relaxed text-lg">
              <p>
                Our journey began with a simple passion: growing the finest citrus fruits and delivering them straight from our groves to your table with care, speed, and integrity.
              </p>
              <p>
                We believe in minimizing the time between harvest and delivery, ensuring that our citrus is hand-picked at peak ripeness and arrives to you bursting with flavor and nutrition. This direct-to-you approach means you enjoy fruit that's fresher, juicier, and more vibrant than anything sitting on store shelves.
              </p>
            </div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 0.61, 0.36, 1] }}
              className="mt-14 flex items-center justify-center gap-6 md:gap-12"
            >
              <div className="text-center">
                <p className="text-5xl md:text-6xl font-black text-blue-600">40+</p>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-stone-500 mt-2">Years</p>
              </div>
              <div className="h-16 w-px bg-stone-200" />
              <div className="text-center">
                <p className="text-5xl md:text-6xl font-black text-blue-600">6</p>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-stone-500 mt-2">States</p>
              </div>
              <div className="h-16 w-px bg-stone-200" />
              <div className="text-center">
                <p className="text-5xl md:text-6xl font-black text-blue-600">100%</p>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-stone-500 mt-2">Farm-Direct</p>
              </div>
            </motion.div>
          </motion.div>
        </LayoutContainer>
      </section>
    </>
  );
}
