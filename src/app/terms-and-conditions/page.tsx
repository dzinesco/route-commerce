import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms & Conditions — Route Commerce",
  description: "Terms and Conditions for Route Commerce platform.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-b border-[#e5e5e5]">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#1a4d2e] to-[#2d6a4f] flex items-center justify-center shadow-lg shadow-[#1a4d2e]/20">
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

      <main className="max-w-3xl mx-auto px-6 py-32">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-[#888] hover:text-[#1a4d2e] transition-colors mb-8">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Home
        </Link>

        <div className="mb-12">
          <p className="text-sm font-bold tracking-[0.15em] uppercase text-[#1a4d2e] mb-3">Legal</p>
          <h1 className="text-4xl sm:text-5xl font-black text-[#0a0a0a] tracking-tight mb-4">Terms & Conditions</h1>
          <p className="text-sm text-[#888]">Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
        </div>

        <div className="prose prose-stone max-w-none">
          <div className="bg-white rounded-3xl border border-[#e5e5e5] p-8 sm:p-10 shadow-sm">
            <div className="space-y-6 text-[#555] leading-relaxed">
              <p className="text-lg text-[#333]">
                By using the Route Commerce platform, you agree to these Terms & Conditions. Please read them carefully before using our services.
              </p>

              <h2 className="text-xl font-bold text-[#0a0a0a] mt-8 mb-4">Acceptance of Terms</h2>
              <p>By accessing or using our platform, you agree to be bound by these Terms & Conditions. If you do not agree to these terms, please do not use our services.</p>

              <h2 className="text-xl font-bold text-[#0a0a0a] mt-8 mb-4">Account Registration</h2>
              <p>You must provide accurate information when creating an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account.</p>

              <h2 className="text-xl font-bold text-[#0a0a0a] mt-8 mb-4">Orders and Payment</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>All orders are subject to availability</li>
                <li>Prices are subject to change without notice</li>
                <li>Payment must be received before order fulfillment</li>
                <li>We reserve the right to cancel any order at our discretion</li>
              </ul>

              <h2 className="text-xl font-bold text-[#0a0a0a] mt-8 mb-4">Pickup and Delivery</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>Pickup orders must be collected from the designated stop location during the specified time window</li>
                <li>For shipping orders, delivery times vary by location</li>
                <li>We are not responsible for delays caused by carriers</li>
              </ul>

              <h2 className="text-xl font-bold text-[#0a0a0a] mt-8 mb-4">Product Information</h2>
              <p>We strive to display accurate product information, including pricing and availability. However, we do not warrant that product descriptions or other content is accurate, complete, or error-free.</p>

              <h2 className="text-xl font-bold text-[#0a0a0a] mt-8 mb-4">Intellectual Property</h2>
              <p>All content on our platform, including text, graphics, logos, and images, is the property of Route Commerce or its content suppliers and is protected by copyright laws.</p>

              <h2 className="text-xl font-bold text-[#0a0a0a] mt-8 mb-4">Limitation of Liability</h2>
              <p>Route Commerce shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of our services.</p>

              <h2 className="text-xl font-bold text-[#0a0a0a] mt-8 mb-4">Changes to Terms</h2>
              <p>We reserve the right to modify these Terms & Conditions at any time. Continued use of our platform after changes constitutes acceptance of the modified terms.</p>

              <h2 className="text-xl font-bold text-[#0a0a0a] mt-8 mb-4">Contact Us</h2>
              <p>If you have questions about these Terms & Conditions, please contact us at:</p>
              <div className="bg-[#fafafa] rounded-2xl p-6 mt-4">
                <p className="font-semibold text-[#1a1a1a]">Route Commerce</p>
                <p className="text-[#666]">Email: legal@routecommerce.com</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#e5e5e5] mt-20">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1a4d2e] to-[#2d6a4f] flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-sm text-[#666]">2024 Route Commerce. All rights reserved.</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-[#888]">
              <Link href="/privacy-policy" className="hover:text-[#1a4d2e] transition-colors">Privacy</Link>
              <Link href="/terms-and-conditions" className="hover:text-[#1a4d2e] transition-colors">Terms</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}