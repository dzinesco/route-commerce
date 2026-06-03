import type { Metadata, Viewport } from "next";
import Link from "next/link";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://routecommerce.com";

export const metadata: Metadata = {
  title: "Blog & Resources — Route Commerce",
  description: "Guides, case studies, and resources for produce wholesale businesses. Learn how to optimize your operations and grow your business.",
  keywords: ["produce wholesale blog", "farm business resources", "agriculture tips", "wholesale distribution guides", "Route Commerce blog"],
  authors: [{ name: "Route Commerce" }],
  creator: "Route Commerce",
  publisher: "Route Commerce",
  openGraph: {
    title: "Blog & Resources — Route Commerce",
    description: "Guides, case studies, and resources for produce wholesale businesses.",
    url: `${BASE_URL}/blog`,
    siteName: "Route Commerce",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/og-default.jpg",
        width: 1200,
        height: 630,
        alt: "Route Commerce Blog",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Blog & Resources — Route Commerce",
    description: "Guides, case studies, and resources for produce wholesale businesses.",
    site: "@RouteCommerce",
    creator: "@RouteCommerce",
  },
  alternates: {
    canonical: `${BASE_URL}/blog`,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

const BLOG_POSTS = [
  {
    slug: "getting-started-with-route-commerce",
    title: "Getting Started with Route Commerce",
    excerpt: "Learn how to set up your wholesale business on Route Commerce in under 10 minutes.",
    category: "Guides",
    author: "Team Route Commerce",
    date: "Jan 15, 2025",
    readTime: "5 min read",
    image: "/blog/getting-started.jpg",
  },
  {
    slug: "maximize-produce-profitability",
    title: "5 Tips to Maximize Your Produce Profitability",
    excerpt: "Strategic pricing and inventory management can significantly boost your bottom line.",
    category: "Tips",
    author: "Sarah Johnson",
    date: "Jan 10, 2025",
    readTime: "7 min read",
    image: "/blog/profitability.jpg",
  },
  {
    slug: "customer-communication-best-practices",
    title: "Best Practices for Customer Communication",
    excerpt: "Keep your customers informed and engaged with these communication strategies.",
    category: "Marketing",
    author: "Marcus Chen",
    date: "Jan 5, 2025",
    readTime: "6 min read",
    image: "/blog/communication.jpg",
  },
];

const RESOURCES = [
  {
    title: "Wholesale Pricing Guide",
    description: "Complete guide to setting profitable wholesale prices",
    type: "Guide",
    downloads: 342,
    icon: "📋",
  },
  {
    title: "Order Management Checklist",
    description: "Step-by-step checklist for order fulfillment",
    type: "Checklist",
    downloads: 256,
    icon: "✓",
  },
  {
    title: "Customer Email Templates",
    description: "Pre-written email templates for common scenarios",
    type: "Templates",
    downloads: 189,
    icon: "✉",
  },
];

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-[#faf8f5]">
      {/* Header */}
      <header className="border-b border-[#e5e5e5] bg-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1a4d2e] to-[#2d6a4f] flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-lg font-bold text-[#1a1a1a]">Route Commerce</span>
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/blog" className="font-medium text-[#1a4d2e]">Blog</Link>
            <Link href="/resources" className="text-[#888] hover:text-[#1a1a1a]">Resources</Link>
            <Link href="/roadmap" className="text-[#888] hover:text-[#1a1a1a]">Roadmap</Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="py-12 sm:py-16 md:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-[#1a1a1a] mb-4" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
            Blog & Resources
          </h1>
          <p className="text-lg sm:text-xl text-[#6b8f71]">
            Guides, tips, and resources to help you grow your wholesale produce business.
          </p>
        </div>
      </section>

      {/* Featured Post */}
      <section className="pb-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="bg-white rounded-3xl overflow-hidden border border-[#e5e5e5] shadow-sm">
            <div className="grid md:grid-cols-2">
              <div className="bg-gradient-to-br from-[#1a4d2e]/10 to-[#2d6a4f]/5 aspect-video md:aspect-auto flex items-center justify-center">
                <div className="text-6xl opacity-30">📰</div>
              </div>
              <div className="p-8 flex flex-col justify-center">
                <span className="inline-block w-fit px-3 py-1 bg-[#c97a3e]/10 text-[#c97a3e] text-sm font-medium rounded-full mb-4">
                  Featured
                </span>
                <h2 className="text-3xl font-bold text-[#1a1a1a] mb-4" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
                  Getting Started with Route Commerce
                </h2>
                <p className="text-[#666] mb-6">
                  Learn how to set up your wholesale business on Route Commerce in under 10 minutes. From adding products to scheduling stops, we&apos;ve got you covered.
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#1a4d2e]/10 rounded-full flex items-center justify-center text-[#1a4d2e] font-bold">R</div>
                    <div>
                      <p className="font-medium text-[#1a1a1a]">Team Route Commerce</p>
                      <p className="text-sm text-[#888]">Jan 15, 2025 · 5 min read</p>
                    </div>
                  </div>
                  <Link href="/blog/getting-started-with-route-commerce" className="px-5 py-2.5 bg-[#1a4d2e] text-white rounded-xl font-medium hover:bg-[#2d6a4f] transition-colors">
                    Read More
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Latest Posts */}
      <section className="pb-16">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-[#1a1a1a] mb-8">Latest Articles</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {BLOG_POSTS.slice(1).map((post) => (
              <article key={post.slug} className="bg-white rounded-2xl overflow-hidden border border-[#e5e5e5] hover:shadow-lg transition-shadow">
                <div className="bg-gradient-to-br from-[#6b8f71]/10 to-[#1a4d2e]/5 p-8 aspect-video flex items-center justify-center">
                  <div className="text-4xl opacity-30">📝</div>
                </div>
                <div className="p-6">
                  <span className="inline-block px-2 py-0.5 bg-[#faf8f5] text-[#888] text-xs font-medium rounded mb-3">
                    {post.category}
                  </span>
                  <h3 className="text-lg font-semibold text-[#1a1a1a] mb-2">{post.title}</h3>
                  <p className="text-sm text-[#666] mb-4 line-clamp-2">{post.excerpt}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#888]">{post.author}</span>
                    <span className="text-xs text-[#888]">{post.readTime}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Resources */}
      <section className="py-16 bg-white border-t border-[#e5e5e5]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-[#1a1a1a]">Free Resources</h2>
            <Link href="/resources" className="text-[#1a4d2e] font-medium hover:underline">
              View All →
            </Link>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {RESOURCES.map((resource, i) => (
              <div key={i} className="bg-[#faf8f5] rounded-2xl p-6 border border-[#e5e5e5] hover:border-[#1a4d2e]/30 transition-colors">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-2xl mb-4 border border-[#e5e5e5]">
                  {resource.icon}
                </div>
                <h3 className="font-semibold text-[#1a1a1a] mb-2">{resource.title}</h3>
                <p className="text-sm text-[#666] mb-4">{resource.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#888]">{resource.downloads} downloads</span>
                  <button className="text-sm text-[#1a4d2e] font-medium hover:underline">
                    Download →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="py-20 bg-gradient-to-br from-[#1a4d2e] to-[#2d6a4f]">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-4" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
            Stay in the Loop
          </h2>
          <p className="text-[#faf8f5]/80 mb-8">
            Get weekly tips, industry insights, and product updates delivered to your inbox.
          </p>
          <form className="flex gap-3 max-w-md mx-auto">
            <input
              type="email"
              placeholder="you@farm.com"
              className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-[#faf8f5]/50 focus:outline-none focus:ring-2 focus:ring-white/50"
            />
            <button
              type="submit"
              className="px-6 py-3 bg-white text-[#1a4d2e] rounded-xl font-medium hover:bg-[#faf8f5] transition-colors"
            >
              Subscribe
            </button>
          </form>
          <p className="text-xs text-[#faf8f5]/60 mt-4">No spam. Unsubscribe anytime.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#e5e5e5] py-8 bg-white">
        <div className="max-w-6xl mx-auto px-6 text-center text-sm text-[#888]">
          © {new Date().getFullYear()} Route Commerce. All rights reserved.
        </div>
      </footer>
    </div>
  );
}