import type { Metadata } from "next";
import WaitlistForm from "@/components/marketing/WaitlistForm";

export const metadata: Metadata = {
  title: "Join the Waitlist — Route Commerce",
  description: "Sign up for early access to Route Commerce, the all-in-one platform for fresh produce wholesale distribution.",
  openGraph: {
    title: "Join the Waitlist — Route Commerce",
    description: "Sign up for early access to Route Commerce, the all-in-one platform for fresh produce wholesale distribution.",
  },
};

export default function WaitlistPage() {
  return (
    <div className="min-h-screen bg-[#faf8f5]">
      {/* Header */}
      <header className="border-b border-[#6b8f71]/20 bg-white/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#1a4d2e] to-[#2d6a4f] flex items-center justify-center shadow-lg shadow-[#1a4d2e]/20">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-xl font-bold text-[#1a1a1a] tracking-tight" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>Route Commerce</span>
          </a>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 py-20">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left - Hero */}
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#c97a3e]/10 border border-[#c97a3e]/30 mb-6">
              <span className="w-2 h-2 bg-[#c97a3e] rounded-full animate-pulse" />
              <span className="text-sm font-medium text-[#c97a3e]">Early Access</span>
            </div>
            <h1 className="text-5xl sm:text-6xl font-bold text-[#1a1a1a] leading-tight mb-6" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
              Join 500+ farms on the waitlist
            </h1>
            <p className="text-xl text-[#6b8f71] mb-8 leading-relaxed">
              Be among the first to access Route Commerce when we launch. Early members get priority onboarding and special pricing.
            </p>

            {/* Social proof */}
            <div className="flex flex-wrap gap-8 mb-8">
              <div className="text-center">
                <div className="text-4xl font-bold text-[#1a4d2e]">500+</div>
                <div className="text-sm text-[#888]">Farms Waiting</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-[#1a4d2e]">12+</div>
                <div className="text-sm text-[#888]">States Covered</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-[#1a4d2e]">Q2</div>
                <div className="text-sm text-[#888]">Launch Target</div>
              </div>
            </div>

            {/* Testimonial */}
            <div className="bg-white rounded-2xl p-6 border border-[#e5e5e5] shadow-sm">
              <p className="text-[#555] italic mb-4">&ldquo;I&apos;ve been waiting for a platform like this. The wholesale portal alone will save us hours every week.&rdquo;</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#1a4d2e]/10 rounded-full flex items-center justify-center text-[#1a4d2e] font-bold">M</div>
                <div>
                  <div className="font-semibold text-[#1a1a1a]">Maria S.</div>
                  <div className="text-sm text-[#888]">Sunny Acres Farm, California</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right - Form */}
          <div>
            <div className="bg-white rounded-3xl p-8 sm:p-10 shadow-xl border border-[#e5e5e5]">
              <h2 className="text-2xl font-bold text-[#1a1a1a] mb-2" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
                Reserve Your Spot
              </h2>
              <p className="text-[#888] mb-6">No credit card required. We&apos;ll notify you when it&apos;s your turn.</p>
              <WaitlistForm />
            </div>
          </div>
        </div>
      </main>

      {/* FAQ Section */}
      <section className="border-t border-[#e5e5e5] bg-white">
        <div className="max-w-3xl mx-auto px-6 py-16">
          <h2 className="text-3xl font-bold text-[#1a1a1a] mb-8 text-center" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {[
              { q: "When will Route Commerce launch?", a: "We&apos;re targeting Q2 launch. Early waitlist members will get access first." },
              { q: "Is there a free trial?", a: "Yes! Early access members get 30 days free on any plan." },
              { q: "What&apos;s included in the free trial?", a: "Full access to all features including products, orders, stops management, and communications." },
              { q: "Can I refer friends?", a: "Yes! You&apos;ll get a unique referral link after joining. Both you and your friend get bonus months when they sign up." },
            ].map((item, i) => (
              <div key={i} className="bg-[#faf8f5] rounded-xl p-5">
                <h3 className="font-semibold text-[#1a1a1a] mb-2">{item.q}</h3>
                <p className="text-[#666] text-sm">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#e5e5e5] py-8">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1a4d2e] to-[#2d6a4f] flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-sm text-[#666]">© 2025 Route Commerce. All rights reserved.</span>
            </div>
            <nav className="flex items-center gap-6 text-sm text-[#888]">
              <a href="/privacy-policy" className="hover:text-[#1a4d2e]">Privacy</a>
              <a href="/terms-and-conditions" className="hover:text-[#1a4d2e]">Terms</a>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}