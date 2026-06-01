"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
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

export default function IndianRiverContactPage() {
  const [brandSettings, setBrandSettings] = useState<BrandSettings | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState<FormState>({ name: "", email: "", topic: "general", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [customFooterText, setCustomFooterText] = useState<string | null>(null);
  const [contactEmail, setContactEmail] = useState<string | null>(null);
  const [contactPhone, setContactPhone] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("brands").select("id").eq("slug", "indian-river-direct").single().then(({ data: brand }) => {
      if (!brand?.id) return;
      supabase.from("wholesale_settings")
        .select("invoice_business_name, invoice_business_address, invoice_business_phone, invoice_business_email, invoice_business_website")
        .eq("brand_id", brand.id).single().then(({ data }) => setBrandSettings(data ?? null));
      supabase.from("brand_settings").select("logo_url, custom_footer_text, email, phone")
        .eq("brand_id", brand.id).single().then(({ data: s }) => {
          if (s) { setLogoUrl(s.logo_url ?? null); setCustomFooterText(s.custom_footer_text ?? null); setContactEmail(s.email ?? null); setContactPhone(s.phone ?? null); }
        });
      try { import("@/actions/admin-user").then(({ getCurrentAdminUser }) => { getCurrentAdminUser().then((u: unknown) => setIsAdmin(!!u)); }); } catch { /* not logged in */ }
    });
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
      <StorefrontHeader brandName="Indian River Direct" brandSlug="indian-river-direct" logoUrl={logoUrl} showWholesaleLink={true} isAdmin={isAdmin} brandAccent="blue" />

      <main className="px-6 py-16 md:py-20">
        <LayoutContainer>
          <div className="max-w-5xl mx-auto">

            {/* Page header */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
              className="text-center mb-16 p-10 rounded-3xl bg-white border-2 border-stone-200 shadow-xl"
            >
              <p className="text-[11px] font-semibold uppercase tracking-widest text-blue-600 mb-4">Get in Touch</p>
              <h1 className="text-5xl md:text-6xl font-black tracking-tight text-stone-950 leading-tight">Contact Us</h1>
              <p className="mt-5 text-lg text-stone-600 max-w-xl mx-auto leading-relaxed">
                Questions about citrus, your order, or becoming a wholesale partner? We'd love to hear from you.
              </p>
            </motion.div>

            {/* Contact info cards */}
            <div className="grid gap-6 md:grid-cols-3 mb-16">
              {[
                {
                  label: "Address",
                  value: brandSettings?.invoice_business_address ?? "Indian River Region, Florida",
                  icon: <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />,
                  iconPath: <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                },
                {
                  label: "Phone",
                  value: contactPhone ?? "772-971-4484",
                  icon: <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.184-.046-.379-.041-.545.114L18 10.48a2.25 2.25 0 00-.545-.114l-4.423 1.106c-.5.119-.852.575-.852 1.091v1.372a2.25 2.25 0 01-2.25 2.25h-2.25a15 15 0 01-15-15z" />,
                  iconPath: null
                },
                {
                  label: "Email",
                  value: brandSettings?.invoice_business_email ?? "Info@indianriverdirect.com",
                  icon: <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />,
                  iconPath: null
                },
              ].map(({ label, value, icon, iconPath }, index) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="rounded-3xl bg-white border-2 border-stone-200 p-8 shadow-xl text-center hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 mb-5 shadow-md">
                    <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      {icon}
                      {iconPath}
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-stone-950 mb-3">{label}</h3>
                  <p className="text-base text-stone-600 leading-relaxed">{value}</p>
                </motion.div>
              ))}
            </div>

            {/* Contact form */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1], delay: 0.2 }}
              className="rounded-3xl bg-white border-2 border-stone-200 p-10 shadow-xl"
            >
              <div className="mb-8">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-blue-600 mb-3">Send a Message</p>
                <h2 className="text-3xl font-black text-stone-950 tracking-tight leading-tight">
                  Get in Touch
                </h2>
                <div className="mt-4 h-px w-12 bg-blue-600" />
              </div>
              {submitted ? (
                <div className="rounded-2xl bg-blue-50 border-2 border-blue-100 p-10 text-center shadow-md">
                  <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 mb-4 shadow-md">
                    <svg className="h-7 w-7 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </div>
                  <p className="text-xl font-bold text-stone-950">Message received.</p>
                  <p className="mt-2 text-base text-stone-500">We will be in touch within 1-2 business days.</p>
                  <button
                    onClick={() => {
                      setSubmitted(false);
                      setForm({ name: "", email: "", topic: "general", message: "" });
                    }}
                    className="mt-5 text-sm font-semibold text-blue-700 underline hover:text-blue-900"
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
                        className="w-full rounded-xl border-2 border-stone-200 bg-white px-5 py-4 text-base text-stone-900 placeholder:text-stone-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-colors"
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
                        className="w-full rounded-xl border-2 border-stone-200 bg-white px-5 py-4 text-base text-stone-900 placeholder:text-stone-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-colors"
                        placeholder="jane@example.com"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-stone-700 mb-2">Topic</label>
                    <select
                      value={form.topic}
                      onChange={(e) => setForm({ ...form, topic: e.target.value })}
                      className="w-full rounded-xl border-2 border-stone-200 bg-white px-5 py-4 text-base text-stone-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-colors appearance-none"
                    >
                      <option value="general">General Question</option>
                      <option value="orders">Orders & Pickup</option>
                      <option value="wholesale">Wholesale Inquiry</option>
                      <option value="product">Product Question</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-stone-700 mb-2">Message</label>
                    <textarea
                      required
                      rows={5}
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      className="w-full rounded-xl border-2 border-stone-200 bg-white px-5 py-4 text-base text-stone-900 placeholder:text-stone-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-colors resize-none"
                      placeholder="How can we help you?"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="rounded-xl bg-blue-600 hover:bg-blue-500 px-8 py-4 text-base font-bold text-white hover:shadow-lg hover:shadow-blue-600/25 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? "Sending..." : "Send Message"}
                  </button>
                </form>
              )}
            </motion.div>

            {/* Business hours */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1], delay: 0.3 }}
              className="mt-10 rounded-3xl bg-white border-2 border-stone-200 p-10 shadow-xl"
            >
              <div className="mb-6">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-blue-600 mb-3">Seasonal Hours</p>
                <h2 className="text-2xl font-black text-stone-950 tracking-tight leading-tight">
                  When to Reach Us
                </h2>
                <div className="mt-4 h-px w-12 bg-blue-600" />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center justify-between py-4 px-6 rounded-2xl bg-stone-50 border border-stone-200">
                  <p className="font-semibold text-stone-700">Monday – Friday</p>
                  <p className="text-stone-600 font-medium">8:00 AM – 5:00 PM</p>
                </div>
                <div className="flex items-center justify-between py-4 px-6 rounded-2xl bg-stone-50 border border-stone-200">
                  <p className="font-semibold text-stone-700">Saturday – Sunday</p>
                  <p className="text-stone-600 font-medium">By Appointment</p>
                </div>
              </div>
              <p className="mt-5 text-sm text-stone-400 leading-relaxed">
                During the off-season, response times may be longer. For urgent matters, please call the office.
              </p>
            </motion.div>

            {/* Regional info */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1], delay: 0.4 }}
              className="mt-10 rounded-3xl bg-white border-2 border-stone-200 p-10 shadow-xl"
            >
              <div className="mb-4">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-blue-600 mb-3">Delivery Area</p>
                <h2 className="text-2xl font-black text-stone-950 tracking-tight leading-tight">Regional Delivery</h2>
                <div className="mt-4 h-px w-12 bg-blue-600" />
              </div>
              <p className="text-stone-600 leading-relaxed text-base">
                We deliver fresh citrus directly to pickup stops across the Southeast and Midwest. Enter your ZIP code on our homepage to find stops near you, or browse our upcoming schedule below.
              </p>
            </motion.div>

          </div>
        </LayoutContainer>
      </main>

      <StorefrontFooter brandName="Indian River Direct" brandSlug="indian-river-direct" logoUrl={logoUrl} customFooterText={customFooterText} contactEmail={contactEmail} contactPhone={contactPhone} isAdmin={isAdmin} brandAccent="blue" />
    </div>
  );
}