"use client";

import { motion } from "framer-motion";

export default function Loading() {
  return (
    <div className="min-h-screen bg-stone-50">
      <div className="mx-auto max-w-5xl px-6 py-20">
        {/* Back navigation skeleton */}
        <div className="mb-10 animate-pulse">
          <div className="h-5 w-32 rounded bg-stone-200" />
        </div>

        {/* Stop header skeleton */}
        <div className="mb-12 animate-pulse rounded-3xl bg-white p-8 shadow-sm ring-1 ring-stone-200/60">
          <div className="h-3 w-32 rounded bg-emerald-100 mb-4" />
          <div className="h-16 w-80 rounded-lg bg-stone-200 mb-4" />
          <div className="h-5 w-full max-w-md rounded bg-stone-200 mb-4" />
          <div className="h-px w-12 bg-emerald-600" />
        </div>

        {/* Stop info skeleton */}
        <div className="mb-14 rounded-3xl bg-white p-8 shadow-sm ring-1 ring-stone-200/60">
          <div className="grid gap-4 md:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-start gap-4 py-4 px-5 rounded-2xl bg-stone-50"
              >
                <div className="h-10 w-10 rounded-xl bg-emerald-50" />
                <div className="flex-1">
                  <div className="h-3 w-12 rounded bg-stone-200 mb-2" />
                  <div className="h-5 w-24 rounded bg-stone-200" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Products section skeleton */}
        <div className="animate-pulse">
          <div className="h-4 w-20 rounded bg-emerald-100 mb-4" />
          <div className="h-10 w-48 rounded bg-stone-200 mb-4" />
          <div className="h-4 w-64 rounded bg-stone-200 mb-10" />
          <div className="grid gap-8 md:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="rounded-3xl bg-white overflow-hidden shadow-lg"
              >
                <div className="h-48 bg-gradient-to-br from-stone-100 to-stone-50" />
                <div className="p-6 space-y-3">
                  <div className="h-6 w-3/4 rounded bg-stone-200" />
                  <div className="h-4 w-full rounded bg-stone-100" />
                  <div className="h-4 w-2/3 rounded bg-stone-100" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}