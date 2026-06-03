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
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-lg w-full text-center relative"
      >
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white rounded-full translate-y-1/2 -translate-x-1/4" />
        </div>

        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="relative inline-flex h-24 w-24 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm mb-8"
        >
          <svg className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </motion.div>

        <h1 className="text-4xl font-black text-white mb-4">Stop Not Available</h1>
        <p className="text-blue-100 mb-8 leading-relaxed">
          We couldn&apos;t load this stop. Please try again.
        </p>

        {process.env.NODE_ENV === "development" && (
          <div className="mb-8 rounded-2xl bg-white/10 border border-white/20 p-5 text-left backdrop-blur-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-200 mb-2">Error Details</p>
            <p className="text-sm text-white/80 font-mono leading-relaxed break-all">{error.message}</p>
          </div>
        )}

        <div className="relative flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={reset}
            className="rounded-2xl bg-white text-blue-700 hover:bg-blue-50 px-8 py-4 text-sm font-bold transition-all hover:shadow-xl hover:-translate-y-0.5 active:scale-95 shadow-lg"
          >
            Try Again
          </button>
          <Link
            href="/indian-river-direct"
            className="rounded-2xl bg-blue-700/50 backdrop-blur-sm border border-white/30 text-white hover:bg-blue-600/80 px-8 py-4 text-sm font-bold transition-all hover:-translate-y-0.5 active:scale-95"
          >
            Back to Homepage
          </Link>
        </div>
      </motion.div>
    </div>
  );
}