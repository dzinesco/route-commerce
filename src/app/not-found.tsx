import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#faf8f5] flex items-center justify-center px-6">
      {/* Background decorations */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-20 w-40 h-40 bg-[#1a4d2e]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-40 right-20 w-60 h-60 bg-[#c97a3e]/5 rounded-full blur-3xl" />
      </div>

      <div className="text-center max-w-md mx-auto relative">
        {/* 404 Illustration */}
        <div className="relative mb-8">
          <div className="w-24 h-24 mx-auto bg-gradient-to-br from-[#1a4d2e] to-[#2d6a4f] rounded-3xl flex items-center justify-center shadow-xl">
            <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span className="absolute -top-4 -right-4 w-12 h-12 bg-[#c97a3e]/20 rounded-full flex items-center justify-center text-2xl">📦</span>
        </div>

        <h1 className="text-6xl font-bold text-[#1a1a1a] mb-4 tracking-tight" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
          404
        </h1>
        <h2 className="text-2xl font-semibold text-[#1a1a1a] mb-3">
          Page not found
        </h2>
        <p className="text-[#6b8f71] mb-8">
          Looks like this route got lost along the way. Let&apos;s get you back on track.
        </p>

        {/* Search suggestion */}
        <div className="bg-white rounded-2xl p-4 border border-[#e5e5e5] mb-8">
          <p className="text-sm text-[#888] mb-3">Try searching for what you need:</p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search..."
              className="flex-1 px-4 py-2 rounded-xl border border-[#e5e5e5] text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/50"
            />
            <button className="px-4 py-2 bg-[#1a4d2e] text-white rounded-xl text-sm font-medium hover:bg-[#2d6a4f] transition-colors">
              Search
            </button>
          </div>
        </div>

        {/* Quick links */}
        <div className="space-y-3">
          <p className="text-sm text-[#888]">Or explore these pages:</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/" className="px-4 py-2 bg-white border border-[#e5e5e5] rounded-xl text-sm text-[#1a1a1a] hover:border-[#1a4d2e] hover:text-[#1a4d2e] transition-colors">
              Home
            </Link>
            <Link href="/pricing" className="px-4 py-2 bg-white border border-[#e5e5e5] rounded-xl text-sm text-[#1a1a1a] hover:border-[#1a4d2e] hover:text-[#1a4d2e] transition-colors">
              Pricing
            </Link>
            <Link href="/blog" className="px-4 py-2 bg-white border border-[#e5e5e5] rounded-xl text-sm text-[#1a1a1a] hover:border-[#1a4d2e] hover:text-[#1a4d2e] transition-colors">
              Blog
            </Link>
            <Link href="/roadmap" className="px-4 py-2 bg-white border border-[#e5e5e5] rounded-xl text-sm text-[#1a1a1a] hover:border-[#1a4d2e] hover:text-[#1a4d2e] transition-colors">
              Roadmap
            </Link>
          </div>
        </div>

        {/* Report broken link */}
        <div className="mt-12 pt-8 border-t border-[#e5e5e5]">
          <p className="text-xs text-[#888]">
            Found a broken link?{" "}
            <a href="mailto:support@routecommerce.com" className="text-[#1a4d2e] hover:underline">
              Let us know
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}