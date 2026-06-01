"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import LayoutContainer from "@/components/layout/LayoutContainer";

export default function CTASection() {
  return (
    <section className="py-20 bg-white relative">
      <div className="absolute inset-0 bg-gradient-to-b from-stone-100 to-transparent" />

      <LayoutContainer>
        <motion.div
          initial={{ opacity: 0, y: 48 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, ease: [0.22, 0.61, 0.36, 1] }}
          className="relative text-center"
        >
          <h2 className="text-3xl md:text-4xl font-black tracking-tight text-stone-950">Ready to Order?</h2>
          <p className="mt-4 text-stone-500 text-lg">Experience the difference four decades of excellence makes.</p>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              href="/tuxedo#stops"
              className="group relative inline-flex items-center gap-3 rounded-full bg-stone-900 px-8 py-4 font-bold text-white overflow-hidden"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-emerald-700 to-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              <span className="relative flex items-center gap-2">
                Find a Stop
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3" />
                </svg>
              </span>
            </Link>
            <Link
              href="/tuxedo#products"
              className="group relative inline-flex items-center gap-3 rounded-full bg-white px-8 py-4 font-bold text-stone-900 ring-2 ring-stone-200 hover:ring-emerald-600 hover:text-emerald-700 transition-all"
            >
              <span className="relative">
                Shop Products
                <svg className="inline w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3" />
                </svg>
              </span>
            </Link>
          </div>
        </motion.div>
      </LayoutContainer>
    </section>
  );
}