"use client";

import Link from "next/link";

export default function AdminErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 relative">
      {/* Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950" />
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-red-500/5 rounded-full blur-3xl" />
      </div>
      
      <div className="text-center max-w-md mx-auto relative">
        <div className="glass-card p-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 mb-6">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-3xl font-semibold text-white tracking-tight">Admin Error</h1>
          <p className="mt-3 text-zinc-400 text-sm">
            {error.message || "An unexpected error occurred in the admin panel."}
          </p>
          {error.digest && (
            <p className="mt-2 text-xs text-zinc-600 font-mono">Digest: {error.digest}</p>
          )}
          <div className="mt-8 flex items-center justify-center gap-4">
            <button
              onClick={reset}
              className="rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 px-5 py-2.5 text-sm font-medium text-white transition-all backdrop-blur-sm"
            >
              Try again
            </button>
            <Link
              href="/admin"
              className="rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 px-5 py-2.5 text-sm font-semibold text-white transition-all shadow-lg shadow-emerald-500/20"
            >
              Back to Admin
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
