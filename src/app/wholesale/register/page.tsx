"use client";

import { useState, useEffect } from "react";
import { registerWholesaleCustomer } from "@/actions/wholesale-register";
import { useRouter } from "next/navigation";
import WholesaleBenefits from "@/components/wholesale/WholesaleBenefits";

const IRD_BRAND_ID = "b1cb7a96-d82b-40b1-80b1-d6dd26c56e28";
const TUXEDO_BRAND_ID = "64294306-5f42-463d-a5e8-2ad6c81a96de";

export default function WholesaleRegisterPage() {
  const router = useRouter();
  const [checkingEnabled, setCheckingEnabled] = useState(true);
  const [portalDisabled, setPortalDisabled] = useState(false);
  const [form, setForm] = useState({ companyName: "", contactName: "", email: "", phone: "", brandId: TUXEDO_BRAND_ID });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    async function checkEnabled(brandId: string) {
      const { supabase } = await import("@/lib/supabase");
      const { data: ws } = await supabase
        .from("wholesale_settings")
        .select("wholesale_enabled")
        .eq("brand_id", brandId)
        .single();
      if (ws && ws.wholesale_enabled === false) {
        setPortalDisabled(true);
      }
      setCheckingEnabled(false);
    }
    checkEnabled(form.brandId);
  }, [form.brandId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);
    const res = await registerWholesaleCustomer({
      brandId: form.brandId,
      companyName: form.companyName,
      contactName: form.contactName || undefined,
      email: form.email,
      phone: form.phone || undefined,
    });
    setSubmitting(false);
    if (res.success) {
      setResult({
        success: true,
        message: res.requiresApproval
          ? "Application submitted — we'll review your account and notify you by email within 1–2 business days."
          : "Account created — you can now log in.",
      });
    } else {
      setResult({ success: false, message: res.error ?? "Registration failed." });
    }
  }

  if (checkingEnabled) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <p className="text-zinc-500 text-sm">Loading...</p>
      </div>
    );
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
              <p className="font-bold text-base text-zinc-100 leading-none">Apply for Wholesale</p>
              <p className="text-xs text-zinc-500 mt-0.5">Fresh produce at wholesale prices</p>
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
              Ready to get wholesale pricing?
            </h2>
            <p className="text-zinc-500 mb-8 leading-relaxed">
              Apply in just a few minutes. We review applications within 1–2 business days.
            </p>
            <WholesaleBenefits />
          </div>

          {/* Form column */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-xl shadow-black/20">
            {portalDisabled && (
              <div className="mb-4 rounded-xl border border-amber-900/50 bg-amber-950/50 px-4 py-3 text-sm text-amber-400">
                The wholesale portal is currently disabled for this brand. You may still apply — an admin will activate your account.
              </div>
            )}

            <div className="mb-6">
              <h1 className="text-2xl font-bold text-zinc-100">Apply for an Account</h1>
              <p className="mt-1 text-sm text-zinc-500">We&apos;ll review and respond within 1–2 business days.</p>
            </div>

            {result && (
              <div className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
                result.success
                  ? "border-emerald-900/50 bg-emerald-950/50 text-emerald-400"
                  : "border-red-900/50 bg-red-950/50 text-red-400"
              }`}>
                {result.message}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-zinc-400 mb-1.5">Company Name *</label>
                <input
                  value={form.companyName}
                  onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))}
                  required
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-colors placeholder:text-zinc-600"
                  placeholder="Farm or business name"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-zinc-400 mb-1.5">Contact Name</label>
                <input
                  value={form.contactName}
                  onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-colors placeholder:text-zinc-600"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-zinc-400 mb-1.5">Email *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  required
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-colors placeholder:text-zinc-600"
                  placeholder="order@company.com"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-zinc-400 mb-1.5">Phone</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-colors placeholder:text-zinc-600"
                  placeholder="(555) 555-5555"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-zinc-400 mb-1.5">Brand</label>
                <select
                  value={form.brandId}
                  onChange={e => setForm(f => ({ ...f, brandId: e.target.value }))}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-colors"
                >
                  <option value={TUXEDO_BRAND_ID}>Tuxedo Corn — Colorado Sweet Corn</option>
                  <option value={IRD_BRAND_ID}>Indian River Direct — Florida Citrus</option>
                </select>
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
                    Submitting...
                  </span>
                ) : "Submit Application"}
              </button>
            </form>

            <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
              <p className="text-sm text-zinc-400">
                Already have an account?{" "}
                <a href="/wholesale/login" className="text-emerald-400 hover:underline font-medium hover:text-emerald-300">
                  Sign in
                </a>
              </p>
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