"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import StorefrontHeader from "@/components/storefront/StorefrontHeader";
import StorefrontFooter from "@/components/storefront/StorefrontFooter";
import LayoutContainer from "@/components/layout/LayoutContainer";
import { supabase } from "@/lib/supabase";

type BrandSettings = {
  invoice_business_name: string | null;
  invoice_business_address: string | null;
  invoice_business_phone: string | null;
  invoice_business_email: string | null;
  invoice_business_website: string | null;
};

type FormState = {
  name: string;
  email: string;
  topic: string;
  message: string;
};

export default function TuxedoContactPage() {
  const [brandSettings, setBrandSettings] = useState<BrandSettings | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState<FormState>({ name: "", email: "", topic: "general", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const TUXEDO_BRAND_ID = "64294306-5f42-463d-a5e8-2ad6c81a96de";
    supabase
      .from("wholesale_settings")
      .select("invoice_business_name, invoice_business_address, invoice_business_phone, invoice_business_email, invoice_business_website")
      .eq("brand_id", TUXEDO_BRAND_ID)
      .single()
      .then(({ data }) => setBrandSettings(data ?? null));
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setSubmitted(true);
      setIsSubmitting(false);
    }, 600);
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <StorefrontHeader brandName="Tuxedo Corn" brandSlug="tuxedo" brandAccent="green" />

      <main className="py-16 md:py-20">
        <LayoutContainer>
          <div className="max-w-5xl mx-auto">

            {/* Page header */}
            <div className="text-center mb-16">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-600 mb-4">Get in Touch</p>
              <h1 className="text-5xl md:text-6xl font-black tracking-tight text-stone-950 leading-tight">
                Contact Us
              </h1>
              <p className="mt-5 text-lg text-stone-500 max-w-xl mx-auto leading-relaxed">
                Questions about corn, stops, or wholesale accounts — we are happy to help.
              </p>
            </div>

            {/* Contact info grid */}
            <div className="grid gap-6 md:grid-cols-3 mb-16">
              <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-stone-200/60 text-center">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 mb-5">
                  <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-stone-950 mb-3">Farm Address</h3>
                <p className="text-sm text-stone-500 leading-relaxed">
                  {brandSettings?.invoice_business_address ?? "59751 David Road, Olathe, CO 81425"}
                </p>
              </div>
              <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-stone-200/60 text-center">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 mb-5">
                  <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.184-.046-.379-.041-.545.114L18 10.48a2.25 2.25 0 00-.545-.114l-4.423 1.106c-.5.119-.852.575-.852 1.091v1.372a2.25 2.25 0 01-2.25 2.25h-2.25a15 15 0 01-15-15z" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-stone-950 mb-3">Phone</h3>
                <a href="tel:9703235631" className="block text-sm text-stone-500 hover:text-emerald-700 transition-colors leading-relaxed">
                  Shipping: 970-323-5631
                </a>
                <a href="tel:9703236874" className="mt-1 block text-sm text-stone-500 hover:text-emerald-700 transition-colors leading-relaxed">
                  Office: 970-323-6874
                </a>
              </div>
              <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-stone-200/60 text-center">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 mb-5">
                  <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-stone-950 mb-3">Email</h3>
                <a href={`mailto:${brandSettings?.invoice_business_email ?? "orders@tuxedocorn.com"}`} className="text-sm text-stone-500 hover:text-emerald-700 transition-colors">
                  {brandSettings?.invoice_business_email ?? "orders@tuxedocorn.com"}
                </a>
              </div>
            </div>

            {/* Contact form */}
            <div className="rounded-3xl bg-white p-10 shadow-sm ring-1 ring-stone-200/60">
              <div className="mb-8">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-600 mb-3">Send a Message</p>
                <h2 className="text-3xl font-black text-stone-950 tracking-tight leading-tight">
                  Get in Touch
                </h2>
                <div className="mt-4 h-px w-12 bg-emerald-600" />
              </div>
              {submitted ? (
                <div className="rounded-2xl bg-emerald-50 p-10 text-center ring-1 ring-emerald-100">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 mb-4">
                    <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </div>
                  <p className="text-xl font-bold text-stone-950">Message received.</p>
                  <p className="mt-2 text-sm text-stone-500">We will be in touch within 1-2 business days.</p>
                  <button
                    onClick={() => {
                      setSubmitted(false);
                      setForm({ name: "", email: "", topic: "general", message: "" });
                    }}
                    className="mt-5 text-sm font-medium text-emerald-700 underline hover:text-emerald-900"
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-semibold text-stone-700 mb-2">Your Name</label>
                      <input
                        required
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="w-full rounded-xl border border-stone-200 bg-white px-5 py-4 text-sm text-stone-900 placeholder-stone-400 outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900 transition-colors"
                        placeholder="Jane Smith"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-stone-700 mb-2">Email</label>
                      <input
                        required
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className="w-full rounded-xl border border-stone-200 bg-white px-5 py-4 text-sm text-stone-900 placeholder-stone-400 outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900 transition-colors"
                        placeholder="jane@example.com"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-stone-700 mb-2">Topic</label>
                    <select
                      value={form.topic}
                      onChange={(e) => setForm({ ...form, topic: e.target.value })}
                      className="w-full rounded-xl border border-stone-200 bg-white px-5 py-4 text-sm text-stone-900 outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900 transition-colors appearance-none"
                    >
                      <option value="general">General Question</option>
                      <option value="orders">Orders & Pickup</option>
                      <option value="wholesale">Wholesale Inquiry</option>
                      <option value="media">Media & Partnership</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-stone-700 mb-2">Message</label>
                    <textarea
                      required
                      rows={5}
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      className="w-full rounded-xl border border-stone-200 bg-white px-5 py-4 text-sm text-stone-900 placeholder-stone-400 outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900 transition-colors resize-none"
                      placeholder="How can we help you?"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="rounded-xl bg-stone-900 px-8 py-4 text-sm font-bold text-white hover:bg-stone-800 active:bg-stone-950 transition-colors disabled:opacity-60 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-black/15"
                  >
                    {isSubmitting ? "Sending..." : "Send Message"}
                  </button>
                </form>
              )}
            </div>

            {/* Business hours — elevated */}
            <div className="mt-10 rounded-3xl bg-white p-10 shadow-sm ring-1 ring-stone-200/60">
              <div className="mb-6">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-600 mb-3">Summer Season</p>
                <h2 className="text-2xl font-black text-stone-950 tracking-tight leading-tight">
                  When to Reach Us
                </h2>
                <div className="mt-4 h-px w-12 bg-emerald-600" />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center justify-between py-4 px-6 rounded-2xl bg-stone-50">
                  <p className="font-semibold text-stone-700">Monday – Friday</p>
                  <p className="text-stone-500 font-medium">7:00 AM – 6:00 PM</p>
                </div>
                <div className="flex items-center justify-between py-4 px-6 rounded-2xl bg-stone-50">
                  <p className="font-semibold text-stone-700">Saturday – Sunday</p>
                  <p className="text-stone-500 font-medium">8:00 AM – 2:00 PM</p>
                </div>
              </div>
              <p className="mt-5 text-sm text-stone-400 leading-relaxed">
                During the off-season, response times may be longer. For urgent matters, please call the office.
              </p>
            </div>
          </div>
        </LayoutContainer>
      </main>

      <StorefrontFooter brandName="Tuxedo Corn" brandSlug="tuxedo" brandAccent="green" />
    </div>
  );
}