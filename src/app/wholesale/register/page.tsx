"use client";

import { useState, useEffect } from "react";
import { registerWholesaleCustomer } from "@/actions/wholesale-register";
import { useRouter } from "next/navigation";
import WholesaleBenefits from "@/components/wholesale/WholesaleBenefits";
import Link from "next/link";

const IRD_BRAND_ID = "b1cb7a96-d82b-40b1-80b1-d6dd26c56e28";
const TUXEDO_BRAND_ID = "64294306-5f42-463d-a5e8-2ad6c81a96de";

function FormField({ label, id, error, hint, children }: {
  label: string;
  id: string;
  error?: string | null;
  hint?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-zinc-400 mb-1.5">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
        </svg>
        {error}
      </p>}
      {hint && !error && <p className="mt-1 text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}

export default function WholesaleRegisterPage() {
  const router = useRouter();
  const [checkingEnabled, setCheckingEnabled] = useState(true);
  const [portalDisabled, setPortalDisabled] = useState(false);
  const [form, setForm] = useState({
    companyName: "",
    contactName: "",
    email: "",
    phone: "",
    brandId: TUXEDO_BRAND_ID,
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
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

  function validateForm() {
    const errors: Record<string, string> = {};
    if (!form.companyName.trim()) {
      errors.companyName = "Company name is required";
    }
    if (!form.email) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errors.email = "Enter a valid email address";
    }
    if (form.phone && !/^[\d\s\-\+\(\)]+$/.test(form.phone)) {
      errors.phone = "Enter a valid phone number";
    }
    return errors;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);
    setResult(null);
    setFieldErrors({});

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
      setResult({ success: false, message: res.error ?? "Registration failed. Please try again." });
    }
  }

  if (checkingEnabled) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 rounded-full border-2 border-emerald-500/30 border-t-emerald-500 animate-spin mx-auto mb-4" />
          <p className="text-zinc-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header bar */}
      <div className="bg-zinc-900 border-b border-zinc-800">
        <div className="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-900/60 border border-emerald-700/50">
              <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-base text-zinc-100 leading-none">Apply for Wholesale</p>
              <p className="text-xs text-zinc-500 mt-0.5">Fresh produce at wholesale prices</p>
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
              <div className="mb-5 rounded-xl border border-amber-900/50 bg-amber-950/50 px-4 py-3 text-sm text-amber-400 flex items-start gap-2">
                <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
                The wholesale portal is currently disabled for this brand. You may still apply — an admin will activate your account.
              </div>
            )}

            <div className="mb-6">
              <h1 className="text-2xl font-bold text-zinc-100">Create an account</h1>
              <p className="mt-1 text-sm text-zinc-500">We&apos;ll review and respond within 1–2 business days.</p>
            </div>

            {result && (
              <div className={`mb-5 rounded-xl border px-4 py-4 text-sm flex items-start gap-2 ${
                result.success
                  ? "border-emerald-900/50 bg-emerald-950/50 text-emerald-400"
                  : "border-red-900/50 bg-red-950/50 text-red-400"
              }`}>
                {result.success ? (
                  <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                ) : (
                  <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                  </svg>
                )}
                {result.message}
              </div>
            )}

            {result?.success ? (
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-emerald-900/40 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                  </svg>
                </div>
                <Link
                  href="/wholesale/login"
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white hover:bg-emerald-500"
                >
                  Go to Sign In
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3"/>
                  </svg>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <FormField label="Company Name" id="companyName" error={fieldErrors.companyName} hint={null}>
                  <input
                    id="companyName"
                    value={form.companyName}
                    onChange={e => { setForm(f => ({ ...f, companyName: e.target.value })); setFieldErrors(f => ({ ...f, companyName: "" })); }}
                    className={`w-full rounded-xl border bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 ${fieldErrors.companyName ? "border-red-600" : "border-zinc-700 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"}`}
                    placeholder="Farm or business name"
                    autoComplete="organization"
                  />
                </FormField>

                <FormField label="Contact Name" id="contactName" error={null} hint="Optional — your name">
                  <input
                    id="contactName"
                    value={form.contactName}
                    onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-colors placeholder:text-zinc-600"
                    placeholder="Your name"
                    autoComplete="name"
                  />
                </FormField>

                <FormField label="Email" id="email" error={fieldErrors.email} hint={null}>
                  <input
                    type="email"
                    id="email"
                    value={form.email}
                    onChange={e => { setForm(f => ({ ...f, email: e.target.value })); setFieldErrors(f => ({ ...f, email: "" })); }}
                    required
                    className={`w-full rounded-xl border bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 ${fieldErrors.email ? "border-red-600" : "border-zinc-700 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"}`}
                    placeholder="order@company.com"
                    autoComplete="email"
                  />
                </FormField>

                <FormField label="Phone" id="phone" error={fieldErrors.phone} hint="Optional — for order coordination">
                  <input
                    type="tel"
                    id="phone"
                    value={form.phone}
                    onChange={e => { setForm(f => ({ ...f, phone: e.target.value })); setFieldErrors(f => ({ ...f, phone: "" })); }}
                    className={`w-full rounded-xl border bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 ${fieldErrors.phone ? "border-red-600" : "border-zinc-700 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"}`}
                    placeholder="(555) 555-5555"
                    autoComplete="tel"
                  />
                </FormField>

                <FormField label="Brand" id="brandId" error={null} hint={null}>
                  <select
                    id="brandId"
                    value={form.brandId}
                    onChange={e => setForm(f => ({ ...f, brandId: e.target.value }))}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-colors appearance-none cursor-pointer"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center", backgroundSize: "16px" }}
                  >
                    <option value={TUXEDO_BRAND_ID}>Tuxedo Corn — Colorado Sweet Corn</option>
                    <option value={IRD_BRAND_ID}>Indian River Direct — Florida Citrus</option>
                  </select>
                </FormField>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-xl bg-emerald-600 py-3.5 text-sm font-bold text-white hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-emerald-900/30 mt-3 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                      </svg>
                      Submit Application
                    </>
                  )}
                </button>
              </form>
            )}

            {!result?.success && (
              <div className="mt-5 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                <p className="text-sm text-zinc-400">
                  Already have an account?{" "}
                  <Link href="/wholesale/login" className="text-emerald-400 hover:underline font-medium hover:text-emerald-300">
                    Sign in
                  </Link>
                </p>
              </div>
            )}
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