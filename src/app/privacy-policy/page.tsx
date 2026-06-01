import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — Route Commerce",
  description: "Privacy Policy for Route Commerce platform.",
};

export default function PrivacyPolicyPage() {
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
          <h1 className="text-4xl sm:text-5xl font-black text-[#0a0a0a] tracking-tight mb-4">Privacy Policy</h1>
          <p className="text-sm text-[#888]">Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
        </div>

        <div className="prose prose-stone max-w-none">
          <div className="bg-white rounded-3xl border border-[#e5e5e5] p-8 sm:p-10 shadow-sm">
            <div className="space-y-6 text-[#555] leading-relaxed">
              <p className="text-lg text-[#333]">
                Your privacy matters to us. This Privacy Policy explains how Route Commerce collects, uses, and protects your information when you use our platform.
              </p>

              <h2 className="text-xl font-bold text-[#0a0a0a] mt-8 mb-4">Information We Collect</h2>
              <p>We collect information you provide directly, such as when you create an account, place an order, or contact us. This includes:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Name, email address, and phone number</li>
                <li>Billing and shipping addresses</li>
                <li>Payment information</li>
                <li>Order history and preferences</li>
              </ul>

              <h2 className="text-xl font-bold text-[#0a0a0a] mt-8 mb-4">How We Use Your Information</h2>
              <p>We use the information we collect to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Process and fulfill orders</li>
                <li>Communicate with you about your orders</li>
                <li>Provide customer support</li>
                <li>Improve our services</li>
                <li>Send marketing communications (with your consent)</li>
              </ul>

              <h2 className="text-xl font-bold text-[#0a0a0a] mt-8 mb-4">Data Security</h2>
              <p>We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.</p>

              <h2 className="text-xl font-bold text-[#0a0a0a] mt-8 mb-4">Third-Party Services</h2>
              <p>We may share your information with third-party service providers who assist us in operating our platform, including payment processors and shipping carriers. These providers are contractually obligated to protect your information.</p>

              <h2 className="text-xl font-bold text-[#0a0a0a] mt-8 mb-4">Your Rights</h2>
              <p>You have the right to access, update, or delete your personal information. Contact us at privacy@routecommerce.com to exercise these rights.</p>

              <h2 className="text-xl font-bold text-[#0a0a0a] mt-8 mb-4">Cookies</h2>
              <p>We use cookies to enhance your browsing experience. You can control cookie preferences through your browser settings.</p>

              <h2 className="text-xl font-bold text-[#0a0a0a] mt-8 mb-4">Contact Us</h2>
              <p>If you have questions about this Privacy Policy, please contact us at:</p>
              <div className="bg-[#fafafa] rounded-2xl p-6 mt-4">
                <p className="font-semibold text-[#1a1a1a]">Route Commerce</p>
                <p className="text-[#666]">Email: privacy@routecommerce.com</p>
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