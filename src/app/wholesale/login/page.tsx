"use client";

import { useState } from "react";
import { wholesaleLoginAction } from "@/actions/wholesale-auth";
import { useRouter } from "next/navigation";
import WholesaleBenefits from "@/components/wholesale/WholesaleBenefits";
import Link from "next/link";

// SEO meta tags injected via client-side head management
// Page should be robots: noindex as it's an auth page

const BRANDS = [
  { id: "b1cb7a96-d82b-40b1-80b1-d6dd26c56e28", name: "Indian River Direct", slug: "indian-river-direct" },
  { id: "64294306-5f42-463d-a5e8-2ad6c81a96de", name: "Tuxedo Corn", slug: "tuxedo" },
];

function BrandLogo({ name }: { name: string }) {
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-900/60 border border-emerald-700/50">
      <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
      </svg>
    </div>
  );
}

// Input field with validation state
function FormField({ label, id, error, children }: {
  label: string;
  id: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-zinc-400 mb-1.5">{label}</label>
      <div className="relative">
        {children}
        {error && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
          </div>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}

export default function WholesaleLoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "", brandId: BRANDS[1].id });
  const [submitting, setSubmitting] = useState(false);
  // Read ?error=... from the URL in the lazy initializer. Safe in a client
  // component since window is always defined here, and avoids a
  // set-state-in-effect on mount.
  const [error, setError] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    const err = params.get("error");
    if (err === "portal_disabled") {
      return "The wholesale portal is currently disabled. Contact us for assistance.";
    }
    if (err === "account_not_active") {
      return "Your account is not active. Please contact support or register for a new account.";
    }
    if (err === "invalid_credentials") {
      return "Invalid email or password. Please try again.";
    }
    return null;
  });
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  // Derive selectedBrand from form.brandId during render — no effect needed.
  // form.brandId is always a valid BRANDS id, so this lookup is O(n) over a 2-item array.
  const selectedBrand = BRANDS.find(b => b.id === form.brandId) ?? BRANDS[1];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setFieldErrors({});

    // Client-side validation
    const errors: { email?: string; password?: string } = {};
    if (!form.email) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errors.email = "Enter a valid email address";
    }
    if (!form.password) {
      errors.password = "Password is required";
    } else if (form.password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setSubmitting(false);
      return;
    }

    const fd = new FormData(e.currentTarget as HTMLFormElement);
    fd.set("brand_id", form.brandId);
    const result = await wholesaleLoginAction(fd);
    setSubmitting(false);
    if (result.success) {
      router.push("/wholesale/portal");
      router.refresh();
    } else {
      setError(result.error ?? "Login failed. Please check your credentials.");
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header bar */}
      <div className="bg-zinc-900 border-b border-zinc-800">
        <div className="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BrandLogo name={selectedBrand.name} />
            <div>
              <p className="font-bold text-base text-zinc-100 leading-none">{selectedBrand.name}</p>
              <p className="text-xs text-zinc-500 mt-0.5">Wholesale Portal</p>
            </div>
          </div>
          <Link href="/" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
            </svg>
            Back to site
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-12">
        <div className="grid gap-12 lg:grid-cols-[1fr_420px] lg:items-start">

          {/* Benefits column */}
          <div className="lg:pt-4">
            <h2 className="text-3xl font-black text-zinc-100 tracking-tight mb-3">
              Grow your business with wholesale pricing
            </h2>
            <p className="text-zinc-500 mb-8 leading-relaxed">
              Join our wholesale program and get access to exclusive pricing, easier ordering, and priority fulfillment.
            </p>
            <WholesaleBenefits />
          </div>

          {/* Form column */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-xl shadow-black/20">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-zinc-100">Welcome back</h1>
              <p className="mt-1 text-sm text-zinc-500">Sign in to your wholesale account.</p>
            </div>

            {error && (
              <div className="mb-5 rounded-xl border border-red-900/50 bg-red-950/50 px-4 py-3 text-sm text-red-400 flex items-start gap-2">
                <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <FormField label="Company" id="brand_id" error={null}>
                <select
                  id="brand_id"
                  name="brand_id"
                  value={form.brandId}
                  onChange={e => setForm(f => ({ ...f, brandId: e.target.value }))}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-colors appearance-none cursor-pointer"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center", backgroundSize: "16px" }}
                >
                  {BRANDS.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </FormField>

              <FormField label="Email" id="email" error={fieldErrors.email}>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={form.email}
                  onChange={e => { setForm(f => ({ ...f, email: e.target.value })); setFieldErrors(f => ({ ...f, email: undefined })); }}
                  autoComplete="email"
                  className={`w-full rounded-xl border bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 ${fieldErrors.email ? "border-red-600 focus:border-red-500 focus:ring-1 focus:ring-red-500" : "border-zinc-700 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"}`}
                  placeholder="buyer@company.com"
                />
              </FormField>

              <FormField label="Password" id="password" error={fieldErrors.password}>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={form.password}
                  onChange={e => { setForm(f => ({ ...f, password: e.target.value })); setFieldErrors(f => ({ ...f, password: undefined })); }}
                  autoComplete="current-password"
                  className={`w-full rounded-xl border bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 ${fieldErrors.password ? "border-red-600 focus:border-red-500 focus:ring-1 focus:ring-red-500" : "border-zinc-700 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"}`}
                  placeholder="••••••••"
                />
              </FormField>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-emerald-600 py-3.5 text-sm font-bold text-white hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-emerald-900/30 mt-2 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Signing in...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"/>
                    </svg>
                    Sign In
                  </>
                )}
              </button>
            </form>

            <div className="mt-5 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
              <p className="text-sm text-zinc-400 font-medium">Don&apos;t have an account?</p>
              <Link
                href="/wholesale/register"
                className="mt-1 inline-flex items-center gap-1 text-sm text-emerald-400 hover:text-emerald-300 hover:underline"
              >
                Apply for a wholesale account
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3"/>
                </svg>
              </Link>
            </div>
          </div>

        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-8 text-center">
        <p className="text-xs text-zinc-600">
          Powered by Route Commerce
        </p>
      </div>
    </div>
  );
}