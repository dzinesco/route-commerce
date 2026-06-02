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
    <div 
      className="min-h-screen flex items-center justify-center px-6 relative" 
      style={{ backgroundColor: "var(--admin-bg)" }}
    >
      {/* Background pattern */}
      <div className="fixed inset-0 opacity-5 pointer-events-none">
        <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, var(--admin-border) 1px, transparent 0)" }} />
      </div>
      
      <div className="text-center max-w-md mx-auto relative z-10">
        <div 
          className="rounded-2xl border p-8"
          style={{ 
            backgroundColor: "var(--admin-card-bg)",
            borderColor: "var(--admin-border)",
            boxShadow: "var(--admin-shadow-lg)"
          }}
        >
          <div 
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6"
            style={{ backgroundColor: "var(--admin-danger-light)" }}
          >
            <svg className="w-8 h-8" style={{ color: "var(--admin-danger)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 
            className="text-2xl font-semibold tracking-tight mb-2"
            style={{ color: "var(--admin-text-primary)" }}
          >
            Admin Error
          </h1>
          <p 
            className="text-sm mb-4"
            style={{ color: "var(--admin-text-secondary)" }}
          >
            {error.message || "An unexpected error occurred in the admin panel."}
          </p>
          {error.digest && (
            <p 
              className="text-xs font-mono px-2 py-1 rounded mb-4 inline-block"
              style={{ 
                backgroundColor: "var(--admin-bg)",
                color: "var(--admin-text-muted)"
              }}
            >
              ID: {error.digest}
            </p>
          )}
          <div className="flex items-center justify-center gap-3 mt-6">
            <button
              onClick={reset}
              className="rounded-xl px-5 py-2.5 text-sm font-medium border transition-all hover:-translate-y-0.5"
              style={{ 
                borderColor: "var(--admin-border)",
                color: "var(--admin-text-secondary)",
                backgroundColor: "var(--admin-card-bg)"
              }}
            >
              Try again
            </button>
            <Link
              href="/admin"
              className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5"
              style={{ 
                backgroundColor: "var(--admin-accent)"
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--admin-accent-hover)"}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "var(--admin-accent)"}
            >
              Back to Admin
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}