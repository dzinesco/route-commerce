"use client";

import { motion } from "framer-motion";

export default function Loading() {
  return (
    <main className="min-h-screen bg-stone-50">
      <div className="mx-auto max-w-6xl px-6 py-16">
        {/* Header skeleton */}
        <div className="mb-16 animate-pulse">
          <div className="h-4 w-32 rounded bg-stone-200 mb-4" />
          <div className="h-16 w-80 rounded-lg bg-stone-200 mb-4" />
          <div className="h-6 w-96 max-w-full rounded bg-stone-200" />
        </div>

        {/* Cards skeleton */}
        <div className="grid gap-6 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="rounded-3xl bg-white ring-1 ring-stone-200/60 overflow-hidden"
            >
              {/* Image skeleton */}
              <div className="h-48 bg-gradient-to-br from-stone-100 to-stone-50 relative overflow-hidden">
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-stone-200/60 to-transparent" />
              </div>
              {/* Content skeleton */}
              <div className="p-7 space-y-4">
                <div className="h-6 w-3/4 rounded bg-stone-200" />
                <div className="h-4 w-full rounded bg-stone-100" />
                <div className="h-4 w-2/3 rounded bg-stone-100" />
                <div className="pt-4 flex items-center justify-between">
                  <div className="h-8 w-20 rounded-lg bg-stone-200" />
                  <div className="h-11 w-28 rounded-xl bg-stone-200" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Stops section skeleton */}
        <div className="mt-20">
          <div className="animate-pulse mb-10">
            <div className="h-3 w-24 rounded bg-stone-200 mb-4" />
            <div className="h-10 w-64 rounded-lg bg-stone-200 mb-3" />
            <div className="h-4 w-48 rounded bg-stone-200" />
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-3xl bg-white p-7 ring-1 ring-stone-200/60"
              >
                <div className="flex items-start gap-4 mb-5">
                  <div className="h-10 w-10 rounded-xl bg-stone-100" />
                  <div className="flex-1">
                    <div className="h-8 w-32 rounded bg-stone-200 mb-2" />
                    <div className="h-4 w-full rounded bg-stone-100" />
                  </div>
                </div>
                <div className="flex gap-2 pl-[2.75rem]">
                  <div className="h-4 w-28 rounded bg-stone-100" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}