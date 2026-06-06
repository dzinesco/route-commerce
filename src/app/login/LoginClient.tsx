"use client";

import Link from "next/link";
import { signInWithGoogle } from "@/actions/auth-signin";

/**
 * The login page is a single Google OAuth button.
 *
 * The three "modes" that used to live here are gone:
 *   • Email/password — removed. Hit a dummy Supabase and 500'd.
 *   • Dev credentials form — removed. The dev cookie is now issued by
 *     `src/middleware.ts` when ALLOW_DEV_LOGIN is enabled.
 *   • /login?demo=1 three-button picker — removed. Same reason.
 *
 * Flow:
 *   • In dev / demo: visiting /admin auto-logs you in via the middleware.
 *   • In production: click "Sign in with Google" → Auth.js handles OAuth.
 */
export default function LoginClient() {
  return (
    <main
      className="min-h-screen flex flex-col relative overflow-hidden"
      style={{ backgroundColor: "#faf8f5", height: "100vh" }}
    >
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap");
        html,
        body {
          overflow: hidden;
        }
      `}</style>

      {/* Organic background elements */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div
          className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle at 30% 30%, #c97a3e20 0%, transparent 70%)", filter: "blur(40px)" }}
        />
        <div
          className="absolute -bottom-48 -left-48 w-[600px] h-[600px] rounded-full opacity-15"
          style={{ background: "radial-gradient(circle at 70% 70%, #6b8f7130 0%, transparent 70%)", filter: "blur(60px)" }}
        />
        <div
          className="absolute top-1/3 left-1/4 w-72 h-72 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #1a4d2e15 0%, transparent 70%)", filter: "blur(30px)" }}
        />
      </div>

      {/* Header */}
      <header className="w-full py-6 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group" style={{ textDecoration: "none" }}>
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center transition-transform group-hover:scale-105"
              style={{ backgroundColor: "#1a4d2e" }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path
                  d="M13 2L4.5 13.5H11.5L10.5 22L19 10.5H12L13 2Z"
                  fill="#faf8f5"
                  stroke="#faf8f5"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <span
              className="text-xl font-semibold tracking-tight"
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", color: "#1a1a1a" }}
            >
              Route Commerce
            </span>
          </Link>
          <Link
            href="/"
            className="text-sm font-medium transition-opacity hover:opacity-60"
            style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", color: "#6b8f71" }}
          >
            Back to home
          </Link>
        </div>
      </header>

      {/* Login Card */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 relative z-10">
        <div className="w-full max-w-sm">
          <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl ring-1 ring-black/5 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#6b8f71]/30 to-transparent" />

            <div className="p-8 sm:p-10">
              <div className="text-center mb-8">
                <div
                  className="inline-flex h-16 w-16 items-center justify-center rounded-2xl mb-5"
                  style={{
                    background: "linear-gradient(135deg, #1a4d2e 0%, #2d6a45 100%)",
                    boxShadow: "0 12px 32px rgba(26, 77, 46, 0.25)",
                  }}
                >
                  <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                    />
                  </svg>
                </div>
                <h1
                  className="text-3xl font-semibold text-stone-900"
                  style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", letterSpacing: "-0.02em" }}
                >
                  Welcome back
                </h1>
                <p
                  className="mt-2 text-sm"
                  style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", color: "#7a7570" }}
                >
                  Sign in to your account
                </p>
              </div>

              {/* Single sign-in method: Google OAuth via Auth.js */}
              <form action={signInWithGoogle} className="space-y-3">
                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center gap-3 rounded-xl border border-stone-200/80 bg-white px-6 py-3.5 text-sm font-semibold text-stone-900 shadow-sm transition-all hover:bg-stone-50 active:scale-[0.98]"
                  style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
                  aria-label="Sign in with Google"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A10.99 10.99 0 0 0 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09a6.6 6.6 0 0 1 0-4.18V7.07H2.18a11 11 0 0 0 0 9.86l3.66-2.84z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A10.99 10.99 0 0 0 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
                    />
                  </svg>
                  <span>Sign in with Google</span>
                </button>
              </form>

              <p
                className="mt-6 text-center text-xs"
                style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", color: "#9a9590" }}
              >
                By signing in you agree to our{" "}
                <Link href="/terms-and-conditions" className="underline hover:text-stone-700">
                  Terms
                </Link>{" "}
                and{" "}
                <Link href="/privacy-policy" className="underline hover:text-stone-700">
                  Privacy Policy
                </Link>
                .
              </p>
            </div>

            {/* Security Trust Badges */}
            <div
              className="border-t border-stone-100/50 px-8 py-5"
              style={{ backgroundColor: "rgba(250, 248, 245, 0.5)" }}
            >
              <div
                className="flex items-center justify-center gap-4 text-xs"
                style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", color: "#9a9590" }}
              >
                <div className="flex items-center gap-1.5">
                  <svg
                    className="w-4 h-4 text-[#6b8f71]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                  <span>256-bit SSL</span>
                </div>
                <span className="text-stone-300">•</span>
                <div className="flex items-center gap-1.5">
                  <svg
                    className="w-4 h-4 text-[#6b8f71]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                  <span>SOC 2</span>
                </div>
              </div>
            </div>
          </div>

          {/* Back link */}
          <div className="text-center mt-6">
            <Link
              href="/brands"
              className="text-sm transition-opacity hover:opacity-60 inline-flex items-center gap-1"
              style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", color: "#7a7570" }}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              View Farms
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-6 px-6 border-t border-stone-200/30 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "#1a4d2e" }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                <path
                  d="M13 2L4.5 13.5H11.5L10.5 22L19 10.5H12L13 2Z"
                  fill="#faf8f5"
                  stroke="#faf8f5"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <span
              className="text-xs"
              style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", color: "#b5b0a8" }}
            >
              © {new Date().getFullYear()} Route Commerce
            </span>
          </div>
          <nav className="flex items-center gap-6">
            <Link
              href="/privacy-policy"
              className="text-xs font-medium uppercase tracking-wider transition-colors hover:text-[#1a4d2e]"
              style={{
                fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
                color: "#6b8f71",
                letterSpacing: "0.08em",
              }}
            >
              Privacy
            </Link>
            <Link
              href="/terms-and-conditions"
              className="text-xs font-medium uppercase tracking-wider transition-colors hover:text-[#1a4d2e]"
              style={{
                fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
                color: "#6b8f71",
                letterSpacing: "0.08em",
              }}
            >
              Terms
            </Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
