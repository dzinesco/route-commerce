"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import LayoutContainer from "@/components/layout/LayoutContainer";

export default function IndianRiverCTASection() {
  return (
    <section className="py-20 bg-blue-600 relative overflow-hidden">
      {/* Subtle decorative elements */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-700/30 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-emerald-900/10 rounded-full blur-3xl" />
      </div>

      <LayoutContainer>
        <motion.div
          initial={{ opacity: 0, y: 48 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, ease: [0.22, 0.61, 0.36, 1] }}
          className="relative text-center backdrop-blur-md bg-white/10 border border-white/20 rounded-3xl p-12"
        >
          <h2 className="text-3xl md:text-4xl font-black tracking-tight text-white">
            Taste the Difference
          </h2>
          <p className="mt-4 text-blue-100 text-lg leading-relaxed max-w-2xl mx-auto">
            We invite you to join us on this sweet journey. Our fruits are guaranteed to be fresh, flavorful, and of the highest quality, straight from the grove to your neighborhood.
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              href="/indian-river-direct#products"
              className="group relative inline-flex items-center gap-3 rounded-full bg-white px-8 py-4 font-bold text-blue-600 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
            >
              <span className="absolute inset-0 bg-blue-50 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              <span className="relative flex items-center gap-2">
                Shop Products
                <svg
                  className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3"
                  />
                </svg>
              </span>
            </Link>
            <Link
              href="/indian-river-direct#stops"
              className="group relative inline-flex items-center gap-3 rounded-full bg-blue-700 px-8 py-4 font-bold text-white ring-2 ring-blue-500 hover:ring-white hover:bg-blue-500 hover:-translate-y-0.5 transition-all duration-300"
            >
              <span className="relative flex items-center gap-2">
                Find a Stop
                <svg
                  className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3"
                  />
                </svg>
              </span>
            </Link>
          </div>
        </motion.div>
      </LayoutContainer>
    </section>
  );
}