import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Your Cart — Route Commerce",
  description: "Review and manage your shopping cart. Select pickup stops, adjust quantities, and proceed to checkout.",
  keywords: ["cart", "shopping cart", "produce order", "checkout", "pickup"],
  robots: {
    index: false,
    follow: false,
  },
};

export default function Loading() {
  return (
    <div className="min-h-screen relative">
      {/* Dark background matching cart page */}
      <div className="fixed inset-0 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950" />
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px]" aria-hidden="true" />
      </div>
      
      {/* Minimal header skeleton */}
      <div className="h-20 border-b border-white/5" />
      
      {/* Content skeleton */}
      <main className="px-6 py-12 relative">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_380px]">
          <div>
            {/* Title skeleton */}
            <div className="h-10 w-56 rounded-lg bg-white/5 animate-pulse" />
            <div className="h-5 w-80 rounded mt-3 bg-white/5 animate-pulse" />
            
            {/* Cart items skeleton */}
            <div className="mt-10 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="glass-card p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <div className="h-5 w-40 rounded bg-white/5 animate-pulse" />
                      <div className="h-4 w-24 rounded bg-white/5 animate-pulse" />
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 rounded-xl bg-white/5 animate-pulse" />
                      <div className="h-11 w-10 rounded bg-white/5 animate-pulse" />
                      <div className="h-11 w-11 rounded-xl bg-white/5 animate-pulse" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between pt-3 border-t border-white/5">
                    <div className="h-5 w-20 rounded bg-white/5 animate-pulse" />
                    <div className="h-4 w-16 rounded bg-white/5 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Sidebar skeleton */}
          <aside>
            <div className="glass-card p-6 sticky top-6">
              <div className="h-6 w-32 rounded bg-white/5 animate-pulse" />
              <div className="mt-5 space-y-3">
                <div className="h-4 w-full rounded bg-white/5 animate-pulse" />
                <div className="h-4 w-3/4 rounded bg-white/5 animate-pulse" />
              </div>
              <div className="mt-5 h-14 w-full rounded-xl bg-white/5 animate-pulse" />
              <div className="mt-4 h-4 w-32 mx-auto rounded bg-white/5 animate-pulse" />
            </div>
          </aside>
        </div>
      </main>
      
      {/* Status for accessibility */}
      <span role="status" className="sr-only">Loading your cart...</span>
    </div>
  );
}