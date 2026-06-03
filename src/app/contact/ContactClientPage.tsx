"use client";

import { useState } from "react";
import Link from "next/link";

type FormState = {
  name: string;
  email: string;
  topic: string;
  message: string;
};

export default function ContactClientPage() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState<FormState>({ name: "", email: "", topic: "general", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setSubmitted(true);
      setIsSubmitting(false);
    }, 600);
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-b border-[#e5e5e5]">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3" aria-label="Route Commerce home">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#1a4d2e] to-[#2d6a4f] flex items-center justify-center shadow-lg shadow-[#1a4d2e]/20" aria-hidden="true">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-xl font-bold text-[#1a1a1a] tracking-tight">Route Commerce</span>
          </Link>
          <Link href="/" className="text-sm font-medium text-[#666] hover:text-[#1a4d2e] transition-colors">
            Back to Home
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-32">
        {/* Page header */}
        <div className="text-center mb-16">
          <p className="text-sm font-bold tracking-[0.15em] uppercase text-[#1a4d2e] mb-4">Get in Touch</p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-[#0a0a0a] tracking-tight mb-4">
            Contact Us
          </h1>
          <p className="text-lg text-[#666] max-w-lg mx-auto">
            Questions about produce, wholesale accounts, or becoming a partner? We would love to hear from you.
          </p>
        </div>

        {/* Contact info cards */}
        <div className="grid gap-6 md:grid-cols-3 mb-16">
          <article className="rounded-3xl bg-white border border-[#e5e5e5] p-8 text-center shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f0fdf4] mb-5 shadow-md" aria-hidden="true">
              <svg className="h-6 w-6 text-[#1a4d2e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-[#0a0a0a] mb-3">Address</h3>
            <p className="text-[#666] leading-relaxed">Serving farms and trucking routes across the nation</p>
          </article>

          <article className="rounded-3xl bg-white border border-[#e5e5e5] p-8 text-center shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f0fdf4] mb-5 shadow-md" aria-hidden="true">
              <svg className="h-6 w-6 text-[#1a4d2e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.184-.046-.379-.041-.545.114L18 10.48a2.25 2.25 0 00-.545-.114l-4.423 1.106c-.5.119-.852.575-.852 1.091v1.372a2.25 2.25 0 01-2.25 2.25h-2.25a15 15 0 01-15-15z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-[#0a0a0a] mb-3">Phone</h3>
            <a
              href="tel:+19703235631"
              className="block text-[#1a4d2e] hover:text-[#2d6a4f] font-semibold leading-relaxed"
            >
              (970) 323-5631
            </a>
            <p className="text-sm text-[#888] mt-1">Mon&ndash;Fri, 8 AM &ndash; 6 PM MT</p>
          </article>

          <article className="rounded-3xl bg-white border border-[#e5e5e5] p-8 text-center shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f0fdf4] mb-5 shadow-md" aria-hidden="true">
              <svg className="h-6 w-6 text-[#1a4d2e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-[#0a0a0a] mb-3">Email</h3>
            <a
              href="mailto:hello@routecommerce.com"
              className="block text-[#1a4d2e] hover:text-[#2d6a4f] font-semibold leading-relaxed"
            >
              hello@routecommerce.com
            </a>
            <a
              href="mailto:support@routecommerce.com"
              className="block text-sm text-[#666] hover:text-[#1a4d2e] mt-1"
            >
              support@routecommerce.com
            </a>
          </article>
        </div>

        {/* Contact form */}
        <div className="rounded-3xl bg-white border border-[#e5e5e5] p-10 shadow-sm">
          <div className="mb-8">
            <p className="text-sm font-bold tracking-[0.15em] uppercase text-[#1a4d2e] mb-3">Send a Message</p>
            <h2 className="text-3xl font-black text-[#0a0a0a] tracking-tight leading-tight">
              Get in Touch
            </h2>
            <div className="mt-4 h-1 w-12 bg-[#1a4d2e]" aria-hidden="true" />
          </div>

          {submitted ? (
            <div className="rounded-2xl bg-[#f0fdf4] border border-[#bbf7d0] p-10 text-center" role="status" aria-live="polite">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#dcfce7] mb-4 shadow-md" aria-hidden="true">
                <svg className="h-7 w-7 text-[#1a4d2e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <p className="text-xl font-bold text-[#0a0a0a]">Message received.</p>
              <p className="mt-2 text-base text-[#666]">We will be in touch within 1-2 business days.</p>
              <button
                onClick={() => {
                  setSubmitted(false);
                  setForm({ name: "", email: "", topic: "general", message: "" });
                }}
                className="mt-5 text-sm font-semibold text-[#1a4d2e] underline hover:text-[#2d6a4f] transition-colors"
              >
                Send another message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6" aria-label="Contact form">
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label htmlFor="contact-name" className="block text-sm font-semibold text-[#333] mb-2">
                    Your Name
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    onFocus={() => setFocusedField("name")}
                    onBlur={() => setFocusedField(null)}
                    className={`w-full rounded-xl border-2 px-5 py-4 text-base text-[#1a1a1a] placeholder:text-[#999] outline-none transition-colors ${
                      focusedField === "name" ? "border-[#1a4d2e] ring-4 ring-[#1a4d2e]/10" : "border-[#e5e5e5] focus:border-[#1a4d2e] focus:ring-4 focus:ring-[#1a4d2e]/10"
                    }`}
                    placeholder="Jane Smith"
                    aria-required="true"
                  />
                </div>
                <div>
                  <label htmlFor="contact-email" className="block text-sm font-semibold text-[#333] mb-2">
                    Email
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    onFocus={() => setFocusedField("email")}
                    onBlur={() => setFocusedField(null)}
                    className={`w-full rounded-xl border-2 px-5 py-4 text-base text-[#1a1a1a] placeholder:text-[#999] outline-none transition-colors ${
                      focusedField === "email" ? "border-[#1a4d2e] ring-4 ring-[#1a4d2e]/10" : "border-[#e5e5e5] focus:border-[#1a4d2e] focus:ring-4 focus:ring-[#1a4d2e]/10"
                    }`}
                    placeholder="jane@example.com"
                    aria-required="true"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="contact-topic" className="block text-sm font-semibold text-[#333] mb-2">
                  Topic
                </label>
                <select
                  id="contact-topic"
                  value={form.topic}
                  onChange={(e) => setForm({ ...form, topic: e.target.value })}
                  onFocus={() => setFocusedField("topic")}
                  onBlur={() => setFocusedField(null)}
                  className={`w-full rounded-xl border-2 px-5 py-4 text-base text-[#1a1a1a] outline-none transition-colors appearance-none cursor-pointer ${
                    focusedField === "topic" ? "border-[#1a4d2e] ring-4 ring-[#1a4d2e]/10" : "border-[#e5e5e5] focus:border-[#1a4d2e] focus:ring-4 focus:ring-[#1a4d2e]/10"
                  }`}
                >
                  <option value="general">General Question</option>
                  <option value="orders">Orders & Pickup</option>
                  <option value="wholesale">Wholesale Inquiry</option>
                  <option value="partner">Become a Partner</option>
                  <option value="support">Technical Support</option>
                </select>
              </div>

              <div>
                <label htmlFor="contact-message" className="block text-sm font-semibold text-[#333] mb-2">
                  Message
                </label>
                <textarea
                  id="contact-message"
                  required
                  rows={5}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  onFocus={() => setFocusedField("message")}
                  onBlur={() => setFocusedField(null)}
                  className={`w-full rounded-xl border-2 px-5 py-4 text-base text-[#1a1a1a] placeholder:text-[#999] outline-none transition-colors resize-none ${
                    focusedField === "message" ? "border-[#1a4d2e] ring-4 ring-[#1a4d2e]/10" : "border-[#e5e5e5] focus:border-[#1a4d2e] focus:ring-4 focus:ring-[#1a4d2e]/10"
                  }`}
                  placeholder="How can we help you?"
                  aria-required="true"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-xl bg-[#1a4d2e] hover:bg-[#2d6a4f] px-8 py-4 text-base font-bold text-white hover:shadow-lg hover:shadow-[#1a4d2e]/25 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Sending...
                  </>
                ) : (
                  <>
                    Send Message
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                    </svg>
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Business hours */}
        <section className="mt-10 rounded-3xl bg-white border border-[#e5e5e5] p-10 shadow-sm" aria-labelledby="hours-heading">
          <div className="mb-6">
            <p className="text-sm font-bold tracking-[0.15em] uppercase text-[#1a4d2e] mb-3">Availability</p>
            <h2 id="hours-heading" className="text-2xl font-black text-[#0a0a0a] tracking-tight leading-tight">
              When to Reach Us
            </h2>
            <div className="mt-4 h-1 w-12 bg-[#1a4d2e]" aria-hidden="true" />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center justify-between py-4 px-6 rounded-2xl bg-[#fafafa]">
              <p className="font-semibold text-[#333]">Monday – Friday</p>
              <p className="text-[#666] font-medium">8:00 AM – 6:00 PM</p>
            </div>
            <div className="flex items-center justify-between py-4 px-6 rounded-2xl bg-[#fafafa]">
              <p className="font-semibold text-[#333]">Saturday – Sunday</p>
              <p className="text-[#666] font-medium">By Appointment</p>
            </div>
          </div>
          <p className="mt-5 text-sm text-[#999] leading-relaxed">
            For urgent matters, please call our support line.
          </p>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#e5e5e5] mt-20">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1a4d2e] to-[#2d6a4f] flex items-center justify-center" aria-hidden="true">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-sm text-[#666]">&copy; {new Date().getFullYear()} Route Commerce. All rights reserved.</span>
            </div>
            <nav className="flex items-center gap-6 text-sm text-[#888]" aria-label="Footer navigation">
              <Link href="/privacy-policy" className="hover:text-[#1a4d2e] transition-colors">Privacy</Link>
              <Link href="/terms-and-conditions" className="hover:text-[#1a4d2e] transition-colors">Terms</Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}