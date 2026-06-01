"use client";

import { motion } from "framer-motion";
import LayoutContainer from "@/components/layout/LayoutContainer";

export default function MissionSection() {
  return (
    <section className="py-24 md:py-32 bg-stone-50 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-100/30 rounded-full blur-3xl -z-10" />

      <LayoutContainer>
        <div className="mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 48 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.8, ease: [0.22, 0.61, 0.36, 1] }}
            className="text-center mb-16"
          >
            <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-emerald-700">Our Mission</span>
            <h2 className="mt-4 text-4xl md:text-5xl font-black tracking-tight text-stone-950 leading-tight">
              Raising the Best Corn<br />in the World
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-12">
            <motion.div
              initial={{ opacity: 0, y: 48 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 0.61, 0.36, 1] }}
              className="prose prose-lg"
            >
              <p className="text-stone-600 leading-relaxed text-lg">
                Tuxedo Corn is the <strong className="text-stone-900">exclusive grower and shipper</strong> of Olathe Sweet Sweet Corn — the only corn that carries that prestigious name. When you order from us, you receive the real thing: grown by the only family that planted roots in Olathe, Colorado over forty years ago.
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 48 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.8, delay: 0.25, ease: [0.22, 0.61, 0.36, 1] }}
              className="prose prose-lg"
            >
              <p className="text-stone-600 leading-relaxed text-lg">
                Not all sweet corn is equal. Olathe Sweet was developed for our high-altitude mountain climate, where <strong className="text-stone-900">intense summer sun by day meets cool mountain air at night</strong>. That combination coaxes extraordinary sweetness and tenderness out of every single ear.
              </p>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 48 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.8, delay: 0.35, ease: [0.22, 0.61, 0.36, 1] }}
            className="mt-16 bg-white rounded-3xl p-10 shadow-lg shadow-stone-900/5 ring-1 ring-stone-200/50"
          >
            <div className="flex items-start gap-6">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-7 h-7 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-stone-950 mb-3">Grown with Future Generations in Mind</h3>
                <p className="text-stone-600 leading-relaxed">
                  We farm regeneratively — no-till and minimal-till methods protect soil structure, cover crops naturally cycle nutrients, and reduced chemical inputs keep our mountain water pure. Every ear is hand-picked at peak freshness, inspected by our dedicated crew. Not machine-harvested. Not sorted by strangers. <strong className="text-stone-900">Hand-picked.</strong>
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </LayoutContainer>
    </section>
  );
}
