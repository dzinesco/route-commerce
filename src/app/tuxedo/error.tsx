"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-emerald-950 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-lg w-full text-center"
      >
        {/* Error icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="inline-flex h-24 w-24 items-center justify-center rounded-full bg-emerald-900/40 mb-8"
        >
          <svg className="h-12 w-12 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </motion.div>

        {/* Error message */}
        <h1 className="text-4xl font-black text-white mb-4">
          Something went wrong
        </h1>
        <p className="text-stone-400 mb-8 leading-relaxed">
          We encountered an unexpected error. Please try again or return to the homepage.
        </p>

        {/* Error details (development only hint) */}
        {process.env.NODE_ENV === "development" && (
          <div className="mb-8 rounded-2xl bg-white/5 border border-white/10 p-5 text-left">
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">Error Details</p>
            <p className="text-sm text-emerald-400/80 font-mono leading-relaxed break-all">
              {error.message}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={reset}
            className="rounded-2xl bg-emerald-600 hover:bg-emerald-500 px-8 py-4 text-sm font-bold text-white transition-all hover:shadow-lg hover:shadow-emerald-900/30 hover:-translate-y-0.5 active:scale-95"
          >
            Try Again
          </button>
          <Link
            href="/tuxedo"
            className="rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 px-8 py-4 text-sm font-bold text-white transition-all hover:-translate-y-0.5 active:scale-95"
          >
            Back to Homepage
          </Link>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-emerald-600/10 rounded-full blur-2xl" />
        </div>
      </motion.div>
    </main>
  );
}
