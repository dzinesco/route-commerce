"use client";

import { motion } from "framer-motion";

export default function Loading() {
  return (
    <div className="min-h-screen bg-stone-50">
      <div className="mx-auto max-w-4xl px-6 py-20">
        {/* Header skeleton */}
        <div className="mb-16 animate-pulse text-center">
          <div className="h-3 w-20 rounded bg-emerald-100 mx-auto mb-5" />
          <div className="h-16 w-64 mx-auto rounded-lg bg-stone-200 mb-5" />
          <div className="h-5 w-96 max-w-full mx-auto rounded bg-stone-200" />
        </div>

        {/* Contact cards skeleton */}
        <div className="grid gap-6 md:grid-cols-3 mb-16">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-stone-200/60 text-center"
            >
              <div className="h-12 w-12 rounded-2xl bg-emerald-50 mx-auto mb-5" />
              <div className="h-5 w-24 mx-auto rounded bg-stone-200 mb-3" />
              <div className="h-4 w-full max-w-[160px] mx-auto rounded bg-stone-100" />
            </motion.div>
          ))}
        </div>

        {/* Form skeleton */}
        <div className="rounded-3xl bg-white p-10 shadow-sm ring-1 ring-stone-200/60">
          <div className="animate-pulse space-y-6">
            <div className="h-6 w-32 rounded bg-stone-200" />
            <div className="h-8 w-48 rounded bg-stone-200" />
            <div className="grid gap-6 md:grid-cols-2 mt-8">
              <div className="space-y-2">
                <div className="h-4 w-20 rounded bg-stone-100" />
                <div className="h-12 rounded-xl bg-stone-100" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-20 rounded bg-stone-100" />
                <div className="h-12 rounded-xl bg-stone-100" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-4 w-16 rounded bg-stone-100" />
              <div className="h-12 rounded-xl bg-stone-100" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-20 rounded bg-stone-100" />
              <div className="h-32 rounded-xl bg-stone-100" />
            </div>
            <div className="h-14 w-40 rounded-xl bg-emerald-100 mt-8" />
          </div>
        </div>
      </div>
    </div>
  );
}