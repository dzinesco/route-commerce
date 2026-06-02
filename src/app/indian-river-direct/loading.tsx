"use client";

import { motion } from "framer-motion";

export default function Loading() {
  return (
    <main className="min-h-screen bg-white/50 backdrop-blur-xl">
      <div className="mx-auto max-w-6xl px-6 py-16">
        {/* Header skeleton with blue accent */}
        <div className="mb-16 animate-pulse">
          <div className="h-3 w-20 rounded bg-blue-100 mb-4" />
          <div className="h-16 w-80 rounded-lg bg-blue-50 mb-4" />
          <div className="h-6 w-96 max-w-full rounded bg-blue-50" />
        </div>

        {/* Product cards skeleton */}
        <div className="grid gap-6 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="rounded-3xl bg-white border-2 border-stone-200 overflow-hidden shadow-lg"
            >
              {/* Image skeleton */}
              <div className="h-48 bg-gradient-to-br from-blue-50 to-white relative overflow-hidden">
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-blue-100/60 to-transparent" />
              </div>
              {/* Content skeleton */}
              <div className="p-6 space-y-4">
                <div className="h-6 w-3/4 rounded bg-stone-200" />
                <div className="h-4 w-full rounded bg-stone-100" />
                <div className="h-4 w-2/3 rounded bg-stone-100" />
                <div className="pt-4 flex items-center justify-between">
                  <div className="h-8 w-20 rounded-lg bg-blue-50" />
                  <div className="h-11 w-28 rounded-xl bg-blue-100" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Stops section skeleton */}
        <div className="mt-20">
          <div className="animate-pulse mb-10">
            <div className="h-3 w-24 rounded bg-blue-100 mb-4" />
            <div className="h-10 w-64 rounded-lg bg-blue-50 mb-3" />
            <div className="h-4 w-48 rounded bg-blue-50" />
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-3xl bg-gradient-to-br from-blue-50 to-white border-2 border-blue-100 p-6"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="h-6 w-32 rounded bg-stone-200 mb-2" />
                    <div className="h-4 w-full rounded bg-stone-100" />
                  </div>
                  <div className="h-6 w-16 rounded-full bg-blue-100" />
                </div>
                <div className="space-y-1">
                  <div className="h-4 w-28 rounded bg-stone-100" />
                  <div className="h-4 w-20 rounded bg-stone-100" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}