import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Security — Route Commerce",
  description: "Learn about Route Commerce security practices, data protection, and compliance.",
};

const SECURITY_FEATURES = [
  {
    title: "Bank-Level Encryption",
    description: "All data is encrypted in transit using TLS 1.3 and at rest using AES-256 encryption.",
    icon: "🔒",
  },
  {
    title: "SOC 2 Compliant",
    description: "Our infrastructure meets SOC 2 Type II standards for security, availability, and confidentiality.",
    icon: "✓",
  },
  {
    title: "Regular Security Audits",
    description: "We conduct quarterly penetration tests and annual security audits with certified third parties.",
    icon: "🔍",
  },
  {
    title: "99.9% Uptime SLA",
    description: "Enterprise plan customers receive a 99.9% uptime guarantee with 24/7 monitoring.",
    icon: "⚡",
  },
  {
    title: "GDPR & CCPA Compliant",
    description: "We comply with GDPR and CCPA regulations, giving you full control over your data.",
    icon: "🛡",
  },
  {
    title: "Secure Authentication",
    description: "Supabase Auth provides secure, compliant authentication with 2FA support.",
    icon: "🔑",
  },
];

const TRUST_BADGES = [
  { label: "SSL Secured", icon: "🔒" },
  { label: "SOC 2 Compliant", icon: "✓" },
  { label: "GDPR Ready", icon: "🛡" },
  { label: "PCI Compliant", icon: "💳" },
];

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-[#faf8f5]">
      {/* Header */}
      <header className="border-b border-[#e5e5e5] bg-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1a4d2e] to-[#2d6a4f] flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-lg font-bold text-[#1a1a1a]">Route Commerce</span>
          </a>
          <Link href="/pricing" className="px-5 py-2 bg-[#1a4d2e] text-white rounded-xl text-sm font-medium hover:bg-[#2d6a4f] transition-colors">
            Get Started
          </Link>
        </div>
      </header>

      {/* Trust Badges */}
      <section className="py-12 bg-white border-b border-[#e5e5e5]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-wrap justify-center gap-6">
            {TRUST_BADGES.map((badge, i) => (
              <div key={i} className="flex items-center gap-2 px-5 py-3 bg-[#faf8f5] rounded-full border border-[#e5e5e5]">
                <span className="text-lg">{badge.icon}</span>
                <span className="text-sm font-medium text-[#1a1a1a]">{badge.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Hero */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h1 className="text-5xl font-bold text-[#1a1a1a] mb-4" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
            Your Data is Safe with Us
          </h1>
          <p className="text-xl text-[#6b8f71] max-w-2xl mx-auto">
            Route Commerce is built on enterprise-grade infrastructure with security at every layer. We protect your business data with the same rigor used by Fortune 500 companies.
          </p>
        </div>
      </section>

      {/* Security Features */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-[#1a1a1a] mb-12 text-center" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
            Enterprise-Grade Security
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {SECURITY_FEATURES.map((feature, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-[#e5e5e5] shadow-sm">
                <div className="w-12 h-12 bg-[#faf8f5] rounded-xl flex items-center justify-center text-2xl mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-[#1a1a1a] mb-2">{feature.title}</h3>
                <p className="text-sm text-[#666]">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Infrastructure */}
      <section className="py-16 bg-white border-t border-[#e5e5e5]">
        <div className="max-w-4xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-[#1a1a1a] mb-4" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
                Built on Trusted Infrastructure
              </h2>
              <p className="text-[#666] mb-6">
                We partner with industry-leading providers to ensure the highest levels of reliability and security.
              </p>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-[#1a4d2e]/10 rounded-lg flex items-center justify-center shrink-0">
                    <span className="text-[#1a4d2e] font-bold text-sm">V</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#1a1a1a]">Vercel</h3>
                    <p className="text-sm text-[#666]">Edge network with automatic DDoS protection and global CDN</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-[#1a4d2e]/10 rounded-lg flex items-center justify-center shrink-0">
                    <span className="text-[#1a4d2e] font-bold text-sm">S</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#1a1a1a]">Supabase</h3>
                    <p className="text-sm text-[#666]">PostgreSQL database with built-in encryption and real-time capabilities</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-[#1a4d2e]/10 rounded-lg flex items-center justify-center shrink-0">
                    <span className="text-[#1a4d2e] font-bold text-sm">$</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#1a1a1a]">Stripe</h3>
                    <p className="text-sm text-[#666]">PCI-compliant payment processing with advanced fraud detection</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-[#1a4d2e] to-[#2d6a4f] rounded-2xl p-8 text-white">
              <h3 className="text-xl font-bold mb-4">Payment Security</h3>
              <p className="text-white/80 mb-6">
                Your payment data is handled by Stripe, who is PCI DSS Level 1 certified. We never store your card details.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm">256-bit SSL encryption</span>
                </li>
                <li className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm">PCI DSS Level 1 compliant</span>
                </li>
                <li className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm">Advanced fraud detection</span>
                </li>
                <li className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm">Secure card tokenization</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Privacy Compliance */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-[#1a1a1a] mb-8 text-center" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
            Privacy Compliance
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-6 border border-[#e5e5e5]">
              <h3 className="font-semibold text-[#1a1a1a] mb-3">GDPR Compliant</h3>
              <p className="text-sm text-[#666]">
                We comply with the General Data Protection Regulation. You can export, delete, or transfer your data at any time.
              </p>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-[#e5e5e5]">
              <h3 className="font-semibold text-[#1a1a1a] mb-3">CCPA Ready</h3>
              <p className="text-sm text-[#666]">
                We honor California Consumer Privacy Act rights, including the right to know, delete, and opt-out of the sale of data.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Report Vulnerability */}
      <section className="py-16 bg-[#1a4d2e] text-white">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-4" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
            Found a Security Issue?
          </h2>
          <p className="text-white/80 mb-6">
            We take security seriously. If you&apos;ve discovered a vulnerability, please let us know so we can address it promptly.
          </p>
          <a href="mailto:security@routecommerce.com" className="inline-flex items-center gap-2 px-6 py-3 bg-white text-[#1a4d2e] rounded-xl font-medium hover:bg-[#faf8f5] transition-colors">
            Report Vulnerability
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#e5e5e5] py-8 bg-white">
        <div className="max-w-6xl mx-auto px-6 text-center text-sm text-[#888]">
          © 2025 Route Commerce. All rights reserved.
        </div>
      </footer>
    </div>
  );
}