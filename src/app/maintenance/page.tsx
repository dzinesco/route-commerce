import Link from "next/link";

export default function MaintenancePage() {
  return (
    <div className="min-h-screen bg-[#faf8f5] flex items-center justify-center px-6">
      {/* Animated background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-[#1a4d2e]/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: "4s" }} />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#c97a3e]/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: "6s", animationDelay: "1s" }} />
      </div>

      <div className="text-center max-w-lg mx-auto relative">
        {/* Maintenance Icon */}
        <div className="relative mb-8">
          <div className="w-28 h-28 mx-auto bg-gradient-to-br from-[#1a4d2e] to-[#2d6a4f] rounded-3xl flex items-center justify-center shadow-2xl">
            <svg className="w-14 h-14 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <span className="absolute -top-2 -right-2 w-10 h-10 bg-[#c97a3e] rounded-xl flex items-center justify-center text-white text-xl shadow-lg">
            ⚙
          </span>
        </div>

        {/* Heading */}
        <h1 className="text-4xl font-bold text-[#1a1a1a] mb-4" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
          Under Maintenance
        </h1>
        <p className="text-lg text-[#6b8f71] mb-6">
          We&apos;re making improvements to serve you better.
        </p>

        {/* Info box */}
        <div className="bg-white rounded-2xl p-6 border border-[#e5e5e5] shadow-sm mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-[#1a1a1a]">Expected back shortly</span>
          </div>
          <p className="text-sm text-[#666]">
            Our team is working on some exciting updates. We&apos;ll be back online shortly.
          </p>
        </div>

        {/* Contact */}
        <div className="mb-8">
          <p className="text-sm text-[#888] mb-3">Need urgent assistance?</p>
          <div className="flex flex-wrap justify-center gap-3">
            <a href="mailto:support@routecommerce.com" className="px-4 py-2 bg-[#1a4d2e] text-white rounded-xl text-sm font-medium hover:bg-[#2d6a4f] transition-colors">
              Email Support
            </a>
            <Link href="/contact" className="px-4 py-2 bg-white border border-[#e5e5e5] text-[#1a1a1a] rounded-xl text-sm font-medium hover:border-[#1a4d2e] transition-colors">
              Contact Us
            </Link>
          </div>
        </div>

        {/* Social updates */}
        <div className="pt-6 border-t border-[#e5e5e5]">
          <p className="text-xs text-[#888] mb-4">Follow for updates:</p>
          <div className="flex justify-center gap-4">
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-white border border-[#e5e5e5] rounded-xl flex items-center justify-center text-[#1a1a1a] hover:border-[#1a4d2e] hover:text-[#1a4d2e] transition-colors">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
              </svg>
            </a>
            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-white border border-[#e5e5e5] rounded-xl flex items-center justify-center text-[#1a1a1a] hover:border-[#1a4d2e] hover:text-[#1a4d2e] transition-colors">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}