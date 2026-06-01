"use client";

import { useState, useEffect } from "react";
import { wholesaleLoginAction } from "@/actions/wholesale-auth";
import { useRouter } from "next/navigation";
import WholesaleBenefits from "@/components/wholesale/WholesaleBenefits";

const BRANDS = [
  { id: "b1cb7a96-d82b-40b1-80b1-d6dd26c56e28", name: "Indian River Direct", slug: "indian-river-direct" },
  { id: "64294306-5f42-463d-a5e8-2ad6c81a96de", name: "Tuxedo Corn", slug: "tuxedo" },
];

export default function WholesaleLoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "", brandId: BRANDS[1].id });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedBrand, setSelectedBrand] = useState(BRANDS[1]);

  useEffect(() => {
    const found = BRANDS.find(b => b.id === form.brandId);
    if (found) setSelectedBrand(found);
  }, [form.brandId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get("error");
    if (err === "portal_disabled") {
      setError("The wholesale portal is currently disabled. Contact us for assistance.");
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const fd = new FormData(e.currentTarget as HTMLFormElement);
    fd.set("brand_id", form.brandId);
    const result = await wholesaleLoginAction(fd);
    setSubmitting(false);
    if (result.success) {
      router.push("/wholesale/portal");
      router.refresh();
    } else {
      setError(result.error ?? "Login failed.");
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header bar */}
      <div className="bg-zinc-900 border-b border-zinc-800">
        <div className="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-900/60 border border-emerald-700/50">
              <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-base text-zinc-100 leading-none">{selectedBrand.name}</p>
              <p className="text-xs text-zinc-500 mt-0.5">Wholesale Portal</p>
            </div>
          </div>
          <a href="/" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">← Back to site</a>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-12">
        <div className="grid gap-10 lg:grid-cols-[1fr_420px] lg:items-start">

          {/* Benefits column */}
          <div className="lg:pt-4">
            <h2 className="text-3xl font-black text-zinc-100 tracking-tight mb-2">
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
              <h1 className="text-2xl font-bold text-zinc-100">Sign In</h1>
              <p className="mt-1 text-sm text-zinc-500">Access your wholesale account.</p>
            </div>

            {error && (
              <div className="mb-4 rounded-xl border border-red-900/50 bg-red-950/50 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-zinc-400 mb-1.5">Company</label>
                <select
                  name="brand_id"
                  value={form.brandId}
                  onChange={e => setForm(f => ({ ...f, brandId: e.target.value }))}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-colors"
                >
                  {BRANDS.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-zinc-400 mb-1.5">Email</label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  required
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-colors placeholder:text-zinc-600"
                  placeholder="buyer@company.com"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-zinc-400 mb-1.5">Password</label>
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  required
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-colors placeholder:text-zinc-600"
                  placeholder="••••••••"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-emerald-900/30 mt-2"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Signing in...
                  </span>
                ) : "Sign In"}
              </button>
            </form>

            <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
              <p className="text-sm text-zinc-400 font-medium">Don&apos;t have an account?</p>
              <a
                href="/wholesale/register"
                className="mt-1 inline-block text-sm text-emerald-400 hover:text-emerald-300 hover:underline"
              >
                Apply for a wholesale account &rarr;
              </a>
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