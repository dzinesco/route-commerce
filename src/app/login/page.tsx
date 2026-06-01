"use client";

import { useState, useEffect, useRef, Suspense } from "react";
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
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      const innerWidth = window.innerWidth;
      const innerHeight = window.innerHeight;
      const x = (clientX / innerWidth - 0.5) * 2;
      const y = (clientY / innerHeight - 0.5) * 2;
      setMousePos({ x: clientX, y: clientY });
      setTilt({ x: y * 8, y: -x * 8 });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
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
  }

  async function handleForgotPassword(e: React.FormEvent<HTMLFormElement>) {
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
  }

  return (
    <main ref={containerRef} className="min-h-screen flex items-center justify-center px-6 py-12 relative overflow-hidden">
      {/* Animated gradient mesh background */}
      <div 
        className="fixed inset-0 transition-transform duration-1000 ease-out"
        style={{
          background: `
            radial-gradient(circle at 20% 80%, rgba(16, 185, 129, 0.15) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(245, 158, 11, 0.12) 0%, transparent 50%),
            radial-gradient(circle at 40% 40%, rgba(5, 150, 105, 0.08) 0%, transparent 40%),
            linear-gradient(135deg, #fafaf9 0%, #f5f5f4 50%, #fefce8 100%)
          `,
          transform: `perspective(1000px) rotateX(${tilt.x * 0.1}deg) rotateY(${tilt.y * 0.1}deg)`
        }}
      />
      
      {/* Floating orbs with parallax */}
      <div 
        className="fixed w-96 h-96 rounded-full transition-transform duration-500 ease-out pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.2) 0%, transparent 70%)',
          top: `${10 + tilt.y * 0.5}%`,
          left: `${10 + tilt.x * 0.3}%`,
          transform: `translate(${mousePos.x * 0.02}px, ${mousePos.y * 0.02}px) scale(1.2)`,
          filter: 'blur(60px)'
        }}
      />
      <div 
        className="fixed w-[500px] h-[500px] rounded-full transition-transform duration-700 ease-out pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(245, 158, 11, 0.15) 0%, transparent 70%)',
          bottom: `${5 - tilt.y * 0.3}%`,
          right: `${5 - tilt.x * 0.2}%`,
          transform: `translate(${-mousePos.x * 0.03}px, ${-mousePos.y * 0.03}px)`,
          filter: 'blur(80px)'
        }}
      />
      <div 
        className="fixed w-64 h-64 rounded-full transition-transform duration-500 ease-out pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(5, 150, 105, 0.1) 0%, transparent 70%)',
          top: '50%',
          left: '50%',
          transform: `translate(${mousePos.x * 0.015}px, ${mousePos.y * 0.015}px)`,
          filter: 'blur(50px)'
        }}
      />

      {/* 3D Card Container */}
      <div 
        className="w-full max-w-sm relative z-10"
        style={{
          transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transition: 'transform 0.1s ease-out'
        }}
      >
        {/* Glow effect behind card */}
        <div 
          className="absolute -inset-4 rounded-[2rem] opacity-50 pointer-events-none"
          style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.3), rgba(245, 158, 11, 0.2), rgba(16, 185, 129, 0.3))',
            filter: 'blur(30px)',
            transform: 'translateZ(-50px)'
          }}
        />
        
        {/* Main card with glassmorphism */}
        <div className="relative bg-white/70 backdrop-blur-2xl rounded-[2rem] shadow-[0_8px_32px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.04)] ring-1 ring-white/50 overflow-hidden">
          {/* Top gradient border */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-emerald-500 to-amber-400" />
          
          <div className="p-8">
            {/* Logo */}
            <div className="text-center mb-10">
              <div 
                className="inline-flex h-20 w-20 items-center justify-center rounded-3xl mb-6 transform"
                style={{
                  background: 'linear-gradient(135deg, #059669 0%, #10b981 50%, #34d399 100%)',
                  boxShadow: '0 20px 40px rgba(16, 185, 129, 0.3), 0 8px 16px rgba(16, 185, 129, 0.2), inset 0 -2px 8px rgba(0,0,0,0.1)',
                  transform: `translateZ(20px) rotate(${tilt.y * 0.3}deg)`,
                  transition: 'transform 0.3s ease-out'
                }}
              >
                <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-stone-900 tracking-tight" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                Welcome back
              </h1>
              <p className="mt-2 text-stone-500">Sign in to continue</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {globalError && (
                <div 
                  role="alert" 
                  className="rounded-2xl bg-red-50/80 backdrop-blur-sm p-4 text-sm text-red-600 border border-red-100 shadow-lg transform"
                  style={{ transform: `translateZ(5px)` }}
                >
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {globalError}
                  </div>
                </div>
              )}

              <div className="space-y-2" style={{ transform: 'translateZ(10px)' }}>
                <label htmlFor="email" className="block text-sm font-medium text-stone-700">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="username"
                  disabled={loading}
                  className="w-full rounded-xl border border-stone-200/80 bg-white/90 px-4 py-4 text-stone-900 shadow-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10 disabled:bg-stone-100 disabled:cursor-not-allowed placeholder:text-stone-400 transition-all"
                  placeholder="you@company.com"
                />
              </div>

              <div className="space-y-2" style={{ transform: 'translateZ(10px)' }}>
                <label htmlFor="password" className="block text-sm font-medium text-stone-700">Password</label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    disabled={loading}
                    className="w-full rounded-xl border border-stone-200/80 bg-white/90 px-4 py-4 pr-12 text-stone-900 shadow-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10 disabled:bg-stone-100 disabled:cursor-not-allowed placeholder:text-stone-400 transition-all"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1 transition-colors"
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
                className="w-full rounded-xl bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-500 bg-size-200 px-6 py-4 text-base font-semibold text-white hover:shadow-xl hover:shadow-emerald-500/30 disabled:opacity-50 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                style={{
                  transform: 'translateZ(15px)',
                  backgroundPosition: '0% 50%'
                }}
              >
                {loading ? (
                  <>
                    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
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
                  className="w-full text-center text-sm text-stone-500 hover:text-stone-700 transition-colors"
                >
                  Forgot password?
                </button>
              )}
            </form>

            {forgotPassword && !forgotSent && (
              <form onSubmit={handleForgotPassword} className="mt-6 space-y-4 border-t border-stone-200/50 pt-6">
                <p className="text-sm text-stone-600">Enter your email and we&apos;ll send you a reset link.</p>
                {forgotError && (
                  <div className="rounded-xl bg-red-50/80 p-3 text-sm text-red-600 border border-red-100">
                    {forgotError}
                  </div>
                )}
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                  className="w-full rounded-xl border border-stone-200/80 bg-white/90 px-4 py-4 text-stone-900 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10 placeholder:text-stone-400 transition-all"
                  placeholder="you@company.com"
                />
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-4 text-sm font-semibold text-white hover:shadow-lg hover:shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
                >
                  {forgotLoading ? "Sending..." : "Send Reset Link"}
                </button>
                <button
                  type="button"
                  onClick={() => { setForgotPassword(false); setForgotEmail(""); setForgotError(null); }}
                  className="w-full text-center text-sm text-stone-500 hover:text-stone-700 transition-colors"
                >
                  ← Back to sign in
                </button>
              </form>
            )}

            {forgotSent && (
              <div className="mt-6 border-t border-stone-200/50 pt-6">
                <div className="rounded-xl bg-emerald-50/80 p-4 text-sm text-emerald-700 border border-emerald-100 shadow-sm">
                  <strong>Check your inbox.</strong> If an account exists for <span className="font-medium">{forgotEmail}</span>, a reset link has been sent.
                </div>
                <button
                  type="button"
                  onClick={() => { setForgotPassword(false); setForgotSent(false); setForgotEmail(""); }}
                  className="mt-4 w-full text-center text-sm text-stone-500 hover:text-stone-700 transition-colors"
                >
                  ← Back to sign in
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Back link */}
      <Link 
        href="/brands" 
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-sm text-[#888] hover:text-[#1a4d2e] transition-colors z-10 flex items-center gap-1"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        View Farms
      </Link>

      {/* Custom styles for animated gradient */}
      <style jsx>{`
        .bg-size-200 {
          background-size: 200% 100%;
        }
      `}</style>
    </main>
  );
}

// Demo mode wrapper
function DemoMode() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 bg-gradient-to-br from-emerald-50 to-amber-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-stone-900 mb-4">Demo Mode</h1>
        <p className="text-stone-600 mb-8">Select a role to explore the platform</p>
        <div className="flex flex-col gap-4">
          <button onClick={() => { document.cookie = "dev_session=platform_admin; path=/; max-age=86400"; window.location.replace("/admin"); }} className="px-8 py-4 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors shadow-lg">
            Platform Admin
          </button>
          <button onClick={() => { document.cookie = "dev_session=brand_admin; path=/; max-age=86400"; window.location.replace("/admin"); }} className="px-8 py-4 bg-amber-600 text-white rounded-xl font-semibold hover:bg-amber-700 transition-colors shadow-lg">
            Brand Admin
          </button>
          <button onClick={() => { document.cookie = "dev_session=store_employee; path=/; max-age=86400"; window.location.replace("/admin"); }} className="px-8 py-4 bg-stone-600 text-white rounded-xl font-semibold hover:bg-stone-700 transition-colors shadow-lg">
            Store Employee
          </button>
        </div>
      </div>
    </div>
  );
}

// Inner component that uses useSearchParams - must be wrapped in Suspense
function LoginPageInner() {
  const searchParams = useSearchParams();
  const isDemo = searchParams.get("demo") === "1";
  if (isDemo) return <DemoMode />;
  return <LoginForm />;
}

function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full" /></div>}>
      <LoginPageInner />
    </Suspense>
  );
}

export default LoginPage;