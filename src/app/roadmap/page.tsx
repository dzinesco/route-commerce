import type { Metadata } from "next";
import { Check, Clock, TrendingUp, Lightbulb } from "lucide-react";

export const metadata: Metadata = {
  title: "Roadmap — Route Commerce",
  description: "See what&apos;s coming next to Route Commerce. Vote on features, suggest ideas, and track our progress.",
};

const ROADMAP_ITEMS = {
  shipped: [
    { id: 1, title: "Harvest Reach Email Campaigns", description: "Beautiful email marketing with templates and analytics", category: "Communication", upvotes: 124 },
    { id: 2, title: "Square Inventory Sync", description: "Two-way sync with Square POS", category: "Integrations", upvotes: 89 },
    { id: 3, title: "AI Intelligence Pack", description: "Campaign writer, pricing advisor, demand forecasting", category: "AI", upvotes: 156 },
    { id: 4, title: "Water Log Module", description: "Track irrigation and water usage", category: "Operations", upvotes: 67 },
  ],
  inProgress: [
    { id: 5, title: "Mobile App (iOS & Android)", description: "Native apps for field workers and delivery drivers", category: "Mobile", upvotes: 234 },
    { id: 6, title: "Advanced Reporting & Analytics", description: "Custom dashboards, export to BI tools", category: "Reporting", upvotes: 178 },
    { id: 7, title: "Multi-location Support", description: "Manage multiple farms or warehouses from one account", category: "Operations", upvotes: 145 },
  ],
  planned: [
    { id: 8, title: "SMS Campaigns", description: "Text message marketing and notifications", category: "Communication", upvotes: 98 },
    { id: 9, title: "Route Optimization", description: "AI-powered route planning for deliveries", category: "Logistics", upvotes: 167 },
    { id: 10, title: "POS Integration ( Clover, Toast)", description: "Additional POS system integrations", category: "Integrations", upvotes: 76 },
    { id: 11, title: "Customer Loyalty Program", description: "Points, rewards, and referral tracking", category: "Marketing", upvotes: 112 },
  ],
};

const CATEGORIES = ["All", "Communication", "Integrations", "AI", "Operations", "Mobile", "Reporting", "Logistics", "Marketing"];

export default function RoadmapPage() {
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
          <a href="/changelog" className="text-sm text-[#666] hover:text-[#1a4d2e] transition-colors">
            View Changelog →
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-b from-white to-[#faf8f5] py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h1 className="text-5xl font-bold text-[#1a1a1a] mb-4" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
            Product Roadmap
          </h1>
          <p className="text-xl text-[#6b8f71] max-w-2xl mx-auto">
            See what we&apos;re building next. Vote for features you want most, or suggest new ideas.
          </p>
          <div className="flex justify-center gap-4 mt-8">
            <a href="/roadmap#suggest" className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#1a4d2e] to-[#2d6a4f] text-white rounded-xl font-medium hover:from-[#2d6a4f] hover:to-[#1a4d2e] transition-all">
              <Lightbulb className="w-4 h-4" />
              Suggest a Feature
            </a>
          </div>
        </div>
      </section>

      {/* Roadmap Columns */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Shipped */}
            <div>
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <Check className="w-4 h-4 text-emerald-600" />
                </div>
                <h2 className="text-xl font-bold text-[#1a1a1a]">Shipped</h2>
              </div>
              <div className="space-y-4">
                {ROADMAP_ITEMS.shipped.map((item) => (
                  <div key={item.id} className="bg-white rounded-xl p-5 border border-[#e5e5e5] shadow-sm hover:shadow-md transition-shadow">
                    <span className="inline-block px-2 py-0.5 text-xs font-medium bg-[#faf8f5] text-[#888] rounded mb-2">
                      {item.category}
                    </span>
                    <h3 className="font-semibold text-[#1a1a1a] mb-2">{item.title}</h3>
                    <p className="text-sm text-[#666] mb-4">{item.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-emerald-600">
                        <Check className="w-4 h-4" />
                        <span className="text-sm font-medium">Shipped</span>
                      </div>
                      <span className="text-sm text-[#888]">{item.upvotes} votes</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* In Progress */}
            <div>
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-blue-600" />
                </div>
                <h2 className="text-xl font-bold text-[#1a1a1a]">In Progress</h2>
              </div>
              <div className="space-y-4">
                {ROADMAP_ITEMS.inProgress.map((item) => (
                  <div key={item.id} className="bg-white rounded-xl p-5 border border-[#e5e5e5] shadow-sm hover:shadow-md transition-shadow">
                    <span className="inline-block px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-600 rounded mb-2">
                      {item.category}
                    </span>
                    <h3 className="font-semibold text-[#1a1a1a] mb-2">{item.title}</h3>
                    <p className="text-sm text-[#666] mb-4">{item.description}</p>
                    <div className="flex items-center justify-between">
                      <button className="flex items-center gap-1 text-[#1a4d2e] hover:text-[#2d6a4f] transition-colors">
                        <TrendingUp className="w-4 h-4" />
                        <span className="text-sm font-medium">Upvote</span>
                      </button>
                      <span className="text-sm text-[#888]">{item.upvotes} votes</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Planned */}
            <div>
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Lightbulb className="w-4 h-4 text-amber-600" />
                </div>
                <h2 className="text-xl font-bold text-[#1a1a1a]">Planned</h2>
              </div>
              <div className="space-y-4">
                {ROADMAP_ITEMS.planned.map((item) => (
                  <div key={item.id} className="bg-white rounded-xl p-5 border border-[#e5e5e5] shadow-sm hover:shadow-md transition-shadow">
                    <span className="inline-block px-2 py-0.5 text-xs font-medium bg-amber-50 text-amber-600 rounded mb-2">
                      {item.category}
                    </span>
                    <h3 className="font-semibold text-[#1a1a1a] mb-2">{item.title}</h3>
                    <p className="text-sm text-[#666] mb-4">{item.description}</p>
                    <div className="flex items-center justify-between">
                      <button className="flex items-center gap-1 text-[#1a4d2e] hover:text-[#2d6a4f] transition-colors">
                        <TrendingUp className="w-4 h-4" />
                        <span className="text-sm font-medium">Upvote</span>
                      </button>
                      <span className="text-sm text-[#888]">{item.upvotes} votes</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Suggest Feature */}
      <section id="suggest" className="py-16 bg-white border-t border-[#e5e5e5]">
        <div className="max-w-2xl mx-auto px-6">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-[#1a1a1a] mb-2" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
              Suggest a Feature
            </h2>
            <p className="text-[#666]">Have an idea? We&apos;d love to hear it. Share your suggestion and vote on others.</p>
          </div>
          <form className="bg-[#faf8f5] rounded-2xl p-6 border border-[#e5e5e5]">
            <div className="space-y-4">
              <div>
                <label htmlFor="feature-title" className="block text-sm font-medium text-[#1a1a1a] mb-2">
                  Feature Title
                </label>
                <input
                  type="text"
                  id="feature-title"
                  placeholder="e.g., Export orders to CSV"
                  className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] bg-white text-[#1a1a1a] placeholder-[#888] focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/50 focus:border-[#1a4d2e] transition-all"
                />
              </div>
              <div>
                <label htmlFor="feature-description" className="block text-sm font-medium text-[#1a1a1a] mb-2">
                  Description
                </label>
                <textarea
                  id="feature-description"
                  rows={4}
                  placeholder="Describe the feature and how it would help you..."
                  className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] bg-white text-[#1a1a1a] placeholder-[#888] focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/50 focus:border-[#1a4d2e] transition-all resize-none"
                />
              </div>
              <div>
                <label htmlFor="feature-category" className="block text-sm font-medium text-[#1a1a1a] mb-2">
                  Category
                </label>
                <select
                  id="feature-category"
                  className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] bg-white text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/50 focus:border-[#1a4d2e] transition-all"
                >
                  <option value="">Select a category</option>
                  {CATEGORIES.filter(c => c !== "All").map((category) => (
                    <option key={category} value={category.toLowerCase()}>{category}</option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="w-full px-6 py-3 bg-gradient-to-r from-[#1a4d2e] to-[#2d6a4f] text-white rounded-xl font-medium hover:from-[#2d6a4f] hover:to-[#1a4d2e] transition-all"
              >
                Submit Suggestion
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#e5e5e5] py-8">
        <div className="max-w-6xl mx-auto px-6 text-center text-sm text-[#888]">
          © 2025 Route Commerce. All rights reserved.
        </div>
      </footer>
    </div>
  );
}