"use client";

import { motion } from "framer-motion";

export default function Loading() {
  return (
    <div className="min-h-screen bg-stone-50">
      <div className="mx-auto max-w-4xl px-6 py-20">
        {/* Hero skeleton */}
        <div className="mb-20 animate-pulse text-center">
          <div className="h-3 w-24 rounded bg-blue-100 mx-auto mb-5" />
          <div className="h-20 w-full max-w-xl mx-auto rounded-lg bg-blue-50 mb-5" />
          <div className="h-8 w-full max-w-2xl mx-auto rounded bg-blue-50" />
        </div>

        {/* Content sections skeleton */}
        <div className="space-y-20">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="grid md:grid-cols-2 gap-12 items-center"
            >
              <div className="animate-pulse space-y-4">
                <div className="h-4 w-20 rounded bg-blue-100" />
                <div className="h-8 w-3/4 rounded bg-stone-200" />
                <div className="h-4 w-full rounded bg-stone-100" />
                <div className="h-4 w-full rounded bg-stone-100" />
                <div className="h-4 w-2/3 rounded bg-stone-100" />
              </div>
              <div className="h-64 rounded-3xl bg-gradient-to-br from-blue-50 to-white border-2 border-blue-100" />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}