import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Circle, ExternalLink, AlertCircle, ChevronRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Launch Checklist — Route Commerce",
  description: "Pre-launch checklist to ensure a successful product launch.",
};

const CHECKLIST_CATEGORIES = [
  {
    id: "account",
    title: "Account & Access",
    icon: "🔐",
    items: [
      { id: "admin-account", title: "Create admin accounts", description: "Set up admin accounts for all team members", link: "/admin/users" },
      { id: "2fa", title: "Enable 2FA", description: "Enable two-factor authentication for all admin accounts", link: "/admin/settings/security" },
      { id: "permissions", title: "Set up permissions", description: "Configure role-based access control", link: "/admin/users" },
    ],
  },
  {
    id: "billing",
    title: "Billing & Payments",
    icon: "💳",
    items: [
      { id: "stripe-connect", title: "Connect Stripe", description: "Set up Stripe account for payments", link: "/admin/settings/payments" },
      { id: "pricing-check", title: "Review pricing", description: "Confirm all plan pricing is correct", link: "/pricing" },
      { id: "invoices", title: "Test invoices", description: "Create and verify invoice generation", link: "/admin/settings/billing" },
    ],
  },
  {
    id: "products",
    title: "Products & Catalog",
    icon: "📦",
    items: [
      { id: "products-import", title: "Import products", description: "Add products to the catalog", link: "/admin/products" },
      { id: "pricing-set", title: "Set wholesale pricing", description: "Configure pricing for wholesale customers", link: "/admin/products" },
      { id: "images-upload", title: "Upload product images", description: "Add high-quality product images", link: "/admin/products" },
      { id: "categories", title: "Organize categories", description: "Set up product categories", link: "/admin/products" },
    ],
  },
  {
    id: "communications",
    title: "Communication",
    icon: "📧",
    items: [
      { id: "email-setup", title: "Configure email", description: "Set up Resend for email delivery", link: "/admin/communications/settings" },
      { id: "templates", title: "Review email templates", description: "Check transactional email templates", link: "/admin/communications/templates" },
      { id: "welcome-sequence", title: "Set up welcome emails", description: "Create welcome email sequence", link: "/admin/communications/welcome-sequence" },
    ],
  },
  {
    id: "legal",
    title: "Legal & Compliance",
    icon: "⚖️",
    items: [
      { id: "privacy-policy", title: "Privacy Policy live", description: "Confirm privacy policy page is accessible", link: "/privacy-policy" },
      { id: "terms", title: "Terms of Service live", description: "Confirm terms page is accessible", link: "/terms-and-conditions" },
      { id: "cookie-banner", title: "Cookie banner active", description: "GDPR cookie consent is implemented", link: "/security" },
      { id: "security-page", title: "Security page live", description: "Trust and security information is visible", link: "/security" },
    ],
  },
  {
    id: "marketing",
    title: "Marketing & SEO",
    icon: "📈",
    items: [
      { id: "analytics", title: "Install PostHog", description: "Set up product analytics", link: "/admin/reports" },
      { id: "sitemap", title: "Submit sitemap", description: "Submit sitemap to Google Search Console", link: "/sitemap.xml" },
      { id: "og-images", title: "Create OG images", description: "Add social sharing images", link: "/admin/settings" },
      { id: "social-profiles", title: "Set up social profiles", description: "Create social media accounts", link: "/" },
    ],
  },
  {
    id: "testing",
    title: "Testing & QA",
    icon: "🧪",
    items: [
      { id: "checkout-test", title: "Test checkout flow", description: "Complete end-to-end checkout test", link: "/checkout" },
      { id: "auth-test", title: "Test authentication", description: "Verify login, signup, password reset", link: "/login" },
      { id: "mobile-test", title: "Test mobile responsive", description: "Check all pages on mobile devices", link: "/" },
      { id: "email-test", title: "Test email delivery", description: "Verify transactional emails arrive", link: "/admin/communications/logs" },
    ],
  },
  {
    id: "infrastructure",
    title: "Infrastructure",
    icon: "🏗️",
    items: [
      { id: "domain", title: "Configure domain", description: "Set up custom domain", link: "/admin/settings" },
      { id: "ssl", title: "Verify SSL", description: "Confirm HTTPS is working", link: "/" },
      { id: "backups", title: "Configure backups", description: "Database backups are enabled", link: "/admin/settings" },
      { id: "monitoring", title: "Set up monitoring", description: "Configure uptime monitoring", link: "/admin" },
    ],
  },
];

export default function LaunchChecklistPage() {
  return (
    <div className="min-h-screen bg-[#faf8f5]">
      {/* Header */}
      <header className="border-b border-[#e5e5e5] bg-white sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-sm text-[#888] hover:text-[#1a1a1a] transition-colors">
              ← Back to Admin
            </Link>
            <div className="h-6 w-px bg-[#e5e5e5]" />
            <h1 className="text-lg font-bold text-[#1a1a1a]">Launch Checklist</h1>
          </div>
          <button className="px-4 py-2 bg-[#faf8f5] border border-[#e5e5e5] rounded-xl text-sm font-medium text-[#1a1a1a] hover:bg-white transition-colors">
            Export PDF
          </button>
        </div>
      </header>

      {/* Progress Overview */}
      <section className="bg-white border-b border-[#e5e5e5] py-8">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center gap-8">
            {/* Progress Ring */}
            <div className="relative w-24 h-24">
              <svg className="w-24 h-24 -rotate-90" viewBox="0 0 36 36">
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#f0f0f0"
                  strokeWidth="3"
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#1a4d2e"
                  strokeWidth="3"
                  strokeDasharray="20, 100"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-bold text-[#1a4d2e]">20%</span>
              </div>
            </div>

            {/* Stats */}
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-[#1a1a1a] mb-1">7 of 32 tasks complete</h2>
              <p className="text-[#888]">You&apos;re making great progress. Keep going!</p>
              <div className="flex gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm text-[#666]">7 done</span>
                </div>
                <div className="flex items-center gap-2">
                  <Circle className="w-4 h-4 text-gray-300" />
                  <span className="text-sm text-[#666]">25 remaining</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-3">
              <button className="px-4 py-2 bg-[#1a4d2e] text-white rounded-xl text-sm font-medium hover:bg-[#2d6a4f] transition-colors">
                Mark All Complete
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Checklist */}
      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid gap-8">
          {CHECKLIST_CATEGORIES.map((category) => (
            <section key={category.id} className="bg-white rounded-2xl border border-[#e5e5e5] overflow-hidden">
              {/* Category Header */}
              <div className="px-6 py-4 bg-[#faf8f5] border-b border-[#e5e5e5] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{category.icon}</span>
                  <h2 className="text-lg font-semibold text-[#1a1a1a]">{category.title}</h2>
                </div>
                <div className="text-sm text-[#888]">
                  0 / {category.items.length} complete
                </div>
              </div>

              {/* Items */}
              <div className="divide-y divide-[#f0f0f0]">
                {category.items.map((item) => (
                  <div key={item.id} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                    <button className="w-6 h-6 rounded-full border-2 border-gray-300 flex items-center justify-center hover:border-[#1a4d2e] transition-colors">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 opacity-0" />
                    </button>
                    <div className="flex-1">
                      <h3 className="font-medium text-[#1a1a1a]">{item.title}</h3>
                      <p className="text-sm text-[#888]">{item.description}</p>
                    </div>
                    <Link href={item.link} className="flex items-center gap-1 text-sm text-[#1a4d2e] hover:underline">
                      Go <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-12 bg-gradient-to-r from-[#1a4d2e] to-[#2d6a4f] rounded-2xl p-8 text-center text-white">
          <h2 className="text-2xl font-bold mb-2">Ready to launch?</h2>
          <p className="text-white/80 mb-6">When all items are complete, you&apos;re ready to go live!</p>
          <button className="px-6 py-3 bg-white text-[#1a4d2e] rounded-xl font-medium hover:bg-[#faf8f5] transition-colors">
            Mark Launch Complete
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#e5e5e5] py-8 mt-12">
        <div className="max-w-6xl mx-auto px-6 text-center text-sm text-[#888]">
          Progress is saved automatically as you check items off.
        </div>
      </footer>
    </div>
  );
}