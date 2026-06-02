"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [forgotPassword, setForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setGlobalError(null);
    if (!email.trim()) { setGlobalError("Please enter your email address."); return; }
    if (!password.trim()) { setGlobalError("Please enter your password."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json().catch(() => ({ error: "Login failed" }));
      if (res.ok && data?.ok) {
        window.location.replace("/admin");
      } else {
        setGlobalError(data?.error || `Login failed (${res.status})`);
      }
    } catch {
      setGlobalError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [email, password]);

  const handleForgotPassword = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setForgotLoading(true);
    setForgotError(null);
    const fd = new FormData();
    fd.set("email", forgotEmail.trim());
    const result = await fetch("/api/forgot-password", {
      method: "POST",
      body: fd,
    }).then(r => r.json()).catch(() => ({ error: "Network error" }));
    setForgotLoading(false);
    if (result.error) {
      setForgotError(result.error);
    } else {
      setForgotSent(true);
    }
  }, [forgotEmail]);

  return (
    <main className="min-h-screen flex flex-col relative overflow-hidden" style={{ backgroundColor: "#faf8f5" }}>
      {/* Google Fonts */}
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap");
      `}</style>

      {/* Organic background elements */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-20" style={{ background: "radial-gradient(circle at 30% 30%, #c97a3e20 0%, transparent 70%)", filter: "blur(40px)" }} />
        <div className="absolute -bottom-48 -left-48 w-[600px] h-[600px] rounded-full opacity-15" style={{ background: "radial-gradient(circle at 70% 70%, #6b8f7130 0%, transparent 70%)", filter: "blur(60px)" }} />
        <div className="absolute top-1/3 left-1/4 w-72 h-72 rounded-full opacity-10" style={{ background: "radial-gradient(circle, #1a4d2e15 0%, transparent 70%)", filter: "blur(30px)" }} />
      </div>

      {/* Header */}
      <header className="w-full py-6 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group" style={{ textDecoration: "none" }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center transition-transform group-hover:scale-105" style={{ backgroundColor: "#1a4d2e" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M13 2L4.5 13.5H11.5L10.5 22L19 10.5H12L13 2Z" fill="#faf8f5" stroke="#faf8f5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="text-xl font-semibold tracking-tight" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", color: "#1a1a1a" }}>
              Route Commerce
            </span>
          </Link>
          <Link href="/" className="text-sm font-medium transition-opacity hover:opacity-60" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", color: "#6b8f71" }}>
            Back to home
          </Link>
        </div>
      </header>

      {/* Login Card */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 relative z-10">
        <div className={`w-full max-w-sm transition-all duration-700 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          {/* Card */}
          <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl ring-1 ring-black/5 overflow-hidden">
            {/* Subtle top accent */}
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#6b8f71]/30 to-transparent" />

            <div className="p-8 sm:p-10">
              {/* Logo & Title */}
              <div className="text-center mb-8">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl mb-5" style={{ background: "linear-gradient(135deg, #1a4d2e 0%, #2d6a45 100%)", boxShadow: "0 12px 32px rgba(26, 77, 46, 0.25)" }}>
                  <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                  </svg>
                </div>
                <h1 className="text-3xl font-semibold text-stone-900" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", letterSpacing: "-0.02em" }}>
                  Welcome back
                </h1>
                <p className="mt-2 text-sm" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", color: "#7a7570" }}>
                  Sign in to your account
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5" aria-label="Sign in form">
                {globalError && (
                  <div role="alert" className="rounded-2xl bg-red-50/80 p-4 text-sm text-red-600 border border-red-100/50">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {globalError}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label htmlFor="email" className="block text-sm font-medium text-stone-700" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>Email</label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="username"
                    disabled={loading}
                    className="w-full rounded-xl border border-stone-200/80 px-4 py-3.5 text-stone-900 shadow-sm outline-none transition-all focus:border-[#6b8f71] focus:ring-4 focus:ring-[#6b8f71]/10 disabled:bg-stone-100 disabled:cursor-not-allowed placeholder:text-stone-400"
                    style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
                    placeholder="you@company.com"
                    aria-required="true"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="password" className="block text-sm font-medium text-stone-700" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>Password</label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      disabled={loading}
                      className="w-full rounded-xl border border-stone-200/80 px-4 py-3.5 pr-12 text-stone-900 shadow-sm outline-none transition-all focus:border-[#6b8f71] focus:ring-4 focus:ring-[#6b8f71]/10 disabled:bg-stone-100 disabled:cursor-not-allowed placeholder:text-stone-400"
                      style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
                      placeholder="••••••••"
                      aria-required="true"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1 transition-colors"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl px-6 py-4 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", backgroundColor: "#1a4d2e" }}
                >
                  {loading ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Signing in...
                    </>
                  ) : "Sign in"}
                </button>

                {!forgotPassword && !forgotSent && (
                  <button
                    type="button"
                    onClick={() => { setForgotPassword(true); setGlobalError(null); }}
                    className="w-full text-center text-sm transition-colors hover:text-[#1a4d2e]"
                    style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", color: "#6b8f71" }}
                  >
                    Forgot password?
                  </button>
                )}
              </form>

              {/* Password Reset Form */}
              {forgotPassword && !forgotSent && (
                <form onSubmit={handleForgotPassword} className="mt-6 space-y-4 border-t border-stone-200/50 pt-6" aria-label="Password reset form">
                  <p className="text-sm" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", color: "#6b6b6b" }}>Enter your email and we&apos;ll send you a reset link.</p>
                  {forgotError && (
                    <div role="alert" className="rounded-xl bg-red-50/80 p-3 text-sm text-red-600 border border-red-100">
                      {forgotError}
                    </div>
                  )}
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                    className="w-full rounded-xl border border-stone-200/80 bg-white/90 px-4 py-3.5 text-stone-900 outline-none focus:border-[#6b8f71] focus:ring-4 focus:ring-[#6b8f71]/10 placeholder:text-stone-400 transition-all"
                    style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
                    placeholder="you@company.com"
                    aria-required="true"
                  />
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="w-full rounded-xl px-6 py-4 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", backgroundColor: "#1a4d2e" }}
                  >
                    {forgotLoading ? "Sending..." : "Send Reset Link"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setForgotPassword(false); setForgotEmail(""); setForgotError(null); }}
                    className="w-full text-center text-sm transition-colors hover:text-[#1a4d2e]"
                    style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", color: "#6b8f71" }}
                  >
                    ← Back to sign in
                  </button>
                </form>
              )}

              {/* Reset Email Sent */}
              {forgotSent && (
                <div className="mt-6 border-t border-stone-200/50 pt-6" role="status" aria-live="polite">
                  <div className="rounded-xl p-4 text-sm border" style={{ backgroundColor: "#f0fdf4", color: "#166534", borderColor: "#bbf7d0" }}>
                    <strong>Check your inbox.</strong> If an account exists for <span className="font-medium">{forgotEmail}</span>, a reset link has been sent.
                  </div>
                  <button
                    type="button"
                    onClick={() => { setForgotPassword(false); setForgotSent(false); setForgotEmail(""); }}
                    className="mt-4 w-full text-center text-sm transition-colors hover:text-[#1a4d2e]"
                    style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", color: "#6b8f71" }}
                  >
                    ← Back to sign in
                  </button>
                </div>
              )}
            </div>

            {/* Security Trust Badges */}
            <div className="border-t border-stone-100/50 px-8 py-5" style={{ backgroundColor: "rgba(250, 248, 245, 0.5)" }}>
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-center gap-4 text-xs" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", color: "#9a9590" }}>
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-[#6b8f71]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span>256-bit SSL</span>
                  </div>
                  <span className="text-stone-300">•</span>
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-[#6b8f71]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span>SOC 2</span>
                  </div>
                  <span className="text-stone-300">•</span>
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="#6b8f71"/>
                    </svg>
                    <span>Powered by Supabase</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Back link */}
          <div className="text-center mt-6">
            <Link href="/brands" className="text-sm transition-opacity hover:opacity-60 inline-flex items-center gap-1" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", color: "#7a7570" }}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
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
            <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: "#1a4d2e" }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                <path d="M13 2L4.5 13.5H11.5L10.5 22L19 10.5H12L13 2Z" fill="#faf8f5" stroke="#faf8f5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="text-xs" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", color: "#b5b0a8" }}>
              © 2025 Route Commerce
            </span>
          </div>
          <nav className="flex items-center gap-6">
            <Link href="/privacy-policy" className="text-xs font-medium uppercase tracking-wider transition-colors hover:text-[#1a4d2e]" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", color: "#6b8f71", letterSpacing: "0.08em" }}>
              Privacy
            </Link>
            <Link href="/terms-and-conditions" className="text-xs font-medium uppercase tracking-wider transition-colors hover:text-[#1a4d2e]" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", color: "#6b8f71", letterSpacing: "0.08em" }}>
              Terms
            </Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}

// Demo mode wrapper
function DemoMode() {
  return (
    <main className="min-h-screen flex flex-col relative overflow-hidden" style={{ backgroundColor: "#faf8f5" }}>
      {/* Organic background elements */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-20" style={{ background: "radial-gradient(circle at 30% 30%, #c97a3e20 0%, transparent 70%)", filter: "blur(40px)" }} />
        <div className="absolute -bottom-48 -left-48 w-[600px] h-[600px] rounded-full opacity-15" style={{ background: "radial-gradient(circle at 70% 70%, #6b8f7130 0%, transparent 70%)", filter: "blur(60px)" }} />
      </div>

      {/* Header */}
      <header className="w-full py-6 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group" style={{ textDecoration: "none" }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center transition-transform group-hover:scale-105" style={{ backgroundColor: "#1a4d2e" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M13 2L4.5 13.5H11.5L10.5 22L19 10.5H12L13 2Z" fill="#faf8f5" stroke="#faf8f5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="text-xl font-semibold tracking-tight" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", color: "#1a1a1a" }}>
              Route Commerce
            </span>
          </Link>
          <Link href="/" className="text-sm font-medium transition-opacity hover:opacity-60" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", color: "#6b8f71" }}>
            Back to home
          </Link>
        </div>
      </header>

      {/* Demo Card */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 relative z-10">
        <div className="w-full max-w-sm">
          <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl ring-1 ring-black/5 overflow-hidden p-10">
            <div className="text-center mb-8">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl mb-5" style={{ background: "linear-gradient(135deg, #1a4d2e 0%, #2d6a45 100%)", boxShadow: "0 12px 32px rgba(26, 77, 46, 0.25)" }}>
                <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              </div>
              <h1 className="text-3xl font-semibold text-stone-900" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", letterSpacing: "-0.02em" }}>
                Demo Mode
              </h1>
              <p className="mt-2 text-sm" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", color: "#7a7570" }}>
                Select a role to explore the platform
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => { document.cookie = "dev_session=platform_admin; path=/; max-age=86400"; window.location.replace("/admin"); }}
                className="w-full rounded-xl px-6 py-4 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
                style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", backgroundColor: "#1a4d2e" }}
              >
                Platform Admin
              </button>
              <button
                onClick={() => { document.cookie = "dev_session=brand_admin; path=/; max-age=86400"; window.location.replace("/admin"); }}
                className="w-full rounded-xl px-6 py-4 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
                style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", backgroundColor: "#c97a3e" }}
              >
                Brand Admin
              </button>
              <button
                onClick={() => { document.cookie = "dev_session=store_employee; path=/; max-age=86400"; window.location.replace("/admin"); }}
                className="w-full rounded-xl px-6 py-4 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
                style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", backgroundColor: "#6b8f71" }}
              >
                Store Employee
              </button>
            </div>
          </div>

          {/* Back link */}
          <div className="text-center mt-6">
            <Link href="/brands" className="text-sm transition-opacity hover:opacity-60 inline-flex items-center gap-1" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", color: "#7a7570" }}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
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
            <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: "#1a4d2e" }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                <path d="M13 2L4.5 13.5H11.5L10.5 22L19 10.5H12L13 2Z" fill="#faf8f5" stroke="#faf8f5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="text-xs" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", color: "#b5b0a8" }}>
              © 2025 Route Commerce
            </span>
          </div>
        </div>
      </footer>
    </main>
  );
}

// Inner component that uses useSearchParams - must be wrapped in Suspense
function LoginPageInner() {
  const searchParams = useSearchParams();
  const isDemo = searchParams.get("demo") === "1";
  if (isDemo) return <DemoMode />;
  return <LoginForm />;
}

export default function LoginClient() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-500 animate-pulse" />
          <p className="text-stone-500">Loading...</p>
        </div>
      </div>
    }>
      <LoginPageInner />
    </Suspense>
  );
}