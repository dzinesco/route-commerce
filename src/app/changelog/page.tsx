import type { Metadata } from "next";
import { FileText, Zap, Bug, Shield } from "lucide-react";

export const metadata: Metadata = {
  title: "Changelog — Route Commerce",
  description: "See what&apos;s new in Route Commerce. Track our progress, new features, and improvements.",
};

const CHANGELOG = [
  {
    version: "2.4.0",
    date: "2025-01-15",
    category: "feature",
    title: "Harvest Reach Email Campaigns",
    description: "Send beautiful email campaigns to your customers. Includes templates, scheduling, and analytics.",
    icon: FileText,
  },
  {
    version: "2.3.0",
    date: "2025-01-08",
    category: "feature",
    title: "Square Inventory Sync",
    description: "Keep your product catalog and inventory in sync with Square POS. Import products, push updates automatically.",
    icon: Zap,
  },
  {
    version: "2.2.2",
    date: "2024-12-20",
    category: "improvement",
    title: "Faster Dashboard Loading",
    description: "Dashboard now loads 40% faster with improved caching and lazy loading of components.",
    icon: Zap,
  },
  {
    version: "2.2.1",
    date: "2024-12-15",
    category: "bug",
    title: "Order Export Fix",
    description: "Fixed an issue where order export would fail for orders with more than 50 items.",
    icon: Bug,
  },
  {
    version: "2.2.0",
    date: "2024-12-10",
    category: "feature",
    title: "AI Intelligence Pack",
    description: "New AI-powered features: Campaign Writer, Pricing Advisor, and Demand Forecasting. Available on Enterprise plan.",
    icon: Zap,
  },
  {
    version: "2.1.0",
    date: "2024-11-28",
    category: "feature",
    title: "Water Log Module",
    description: "Track irrigation and water usage for your fields. Generate reports and monitor sustainability metrics.",
    icon: Zap,
  },
  {
    version: "2.0.0",
    date: "2024-11-15",
    category: "improvement",
    title: "New Admin Dashboard",
    description: "Complete redesign of the admin dashboard with improved navigation, faster loading, and better mobile support.",
    icon: Zap,
  },
  {
    version: "1.9.0",
    date: "2024-10-30",
    category: "security",
    title: "Two-Factor Authentication",
    description: "Added 2FA support for enhanced account security. Admin users can now enable TOTP-based authentication.",
    icon: Shield,
  },
];

const categoryStyles = {
  feature: { bg: "bg-emerald-100", text: "text-emerald-700", label: "New Feature" },
  improvement: { bg: "bg-blue-100", text: "text-blue-700", label: "Improvement" },
  bug: { bg: "bg-amber-100", text: "text-amber-700", label: "Bug Fix" },
  security: { bg: "bg-purple-100", text: "text-purple-700", label: "Security" },
};

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-[#faf8f5]">
      {/* Header */}
      <header className="border-b border-[#e5e5e5] bg-white">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1a4d2e] to-[#2d6a4f] flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-lg font-bold text-[#1a1a1a]">Route Commerce</span>
          </a>
          <a href="/admin" className="text-sm text-[#666] hover:text-[#1a4d2e] transition-colors">
            ← Back to Admin
          </a>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-16">
        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-[#1a1a1a] mb-4" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
            Changelog
          </h1>
          <p className="text-xl text-[#6b8f71] max-w-2xl mx-auto">
            Track our progress, discover new features, and stay updated with the latest improvements to Route Commerce.
          </p>
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-8 top-0 bottom-0 w-px bg-[#e5e5e5]" />

          <div className="space-y-8">
            {CHANGELOG.map((item, index) => {
              const Icon = item.icon;
              const style = categoryStyles[item.category as keyof typeof categoryStyles];

              return (
                <div key={index} className="relative flex gap-6">
                  {/* Timeline dot */}
                  <div className="relative z-10 flex-shrink-0 w-16 flex items-center justify-center">
                    <div className={`w-10 h-10 rounded-2xl ${style.bg} flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${style.text}`} />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 bg-white rounded-2xl p-6 border border-[#e5e5e5] shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 rounded-md text-xs font-semibold ${style.bg} ${style.text}`}>
                          {style.label}
                        </span>
                        <span className="text-sm text-[#888]">
                          v{item.version}
                        </span>
                      </div>
                      <time className="text-sm text-[#888]">
                        {new Date(item.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </time>
                    </div>
                    <h3 className="text-lg font-semibold text-[#1a1a1a] mb-2">{item.title}</h3>
                    <p className="text-[#666] leading-relaxed">{item.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RSS & Subscribe */}
        <div className="mt-16 p-8 bg-white rounded-2xl border border-[#e5e5e5] text-center">
          <h3 className="text-xl font-bold text-[#1a1a1a] mb-2">Stay Updated</h3>
          <p className="text-[#666] mb-6">Get notified about new features and improvements.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <a href="/api/feed/changelog.xml" className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#faf8f5] border border-[#e5e5e5] rounded-xl text-sm font-medium text-[#1a1a1a] hover:bg-gray-100 transition-colors">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 18a2 2 0 01-2-2 2 2 0 012-2h2a2 2 0 012 2 2 2 0 01-2 2H6zm6-6a2 2 0 012-2 2 2 0 012 2 2 2 0 01-2 2 2 2 0 01-2-2zm-6 0a2 2 0 00-2 2 2 2 0 002 2 2 2 0 002-2 2 2 0 00-2-2zm12 0a2 2 0 00-2 2 2 2 0 002 2 2 2 0 002-2 2 2 0 00-2-2z" />
              </svg>
              RSS Feed
            </a>
            <a href="/waitlist" className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#1a4d2e] to-[#2d6a4f] text-white rounded-xl text-sm font-medium hover:from-[#2d6a4f] hover:to-[#1a4d2e] transition-all">
              Join Waitlist
            </a>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#e5e5e5] py-8">
        <div className="max-w-4xl mx-auto px-6 text-center text-sm text-[#888]">
          © 2025 Route Commerce. All rights reserved.
        </div>
      </footer>
    </div>
  );
}