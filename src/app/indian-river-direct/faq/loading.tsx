"use client";

import { motion } from "framer-motion";

export default function Loading() {
  return (
    <div className="min-h-screen bg-stone-50">
      <div className="mx-auto max-w-3xl px-6 py-20">
        {/* Header skeleton */}
        <div className="mb-14 text-center animate-pulse">
          <div className="h-4 w-16 rounded bg-blue-100 mx-auto mb-4" />
          <div className="h-16 w-48 mx-auto rounded-lg bg-stone-200 mb-5" />
          <div className="h-5 w-96 max-w-full mx-auto rounded bg-stone-200" />
        </div>

        {/* Search skeleton */}
        <div className="mb-12">
          <div className="h-14 rounded-2xl bg-white border-2 border-stone-200 shadow-lg" />
        </div>

        {/* FAQ items skeleton */}
        <div className="space-y-4">
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-2xl bg-white border-2 border-stone-200 overflow-hidden"
            >
              <div className="flex items-center justify-between px-6 py-5">
                <div className="h-5 w-3/4 rounded bg-stone-200" />
                <div className="h-8 w-8 rounded-full bg-blue-100" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}