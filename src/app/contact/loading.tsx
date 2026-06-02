import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Loading contact...",
  description: "Loading...",
  robots: {
    index: false,
    follow: false,
  },
};

export default function Loading() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header skeleton */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-b border-[#e5e5e5]">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#e5e5e5] to-[#f5f5f5] animate-pulse" />
            <div className="h-6 w-36 rounded bg-[#e5e5e5] animate-pulse" />
          </div>
          <div className="h-5 w-24 rounded bg-[#e5e5e5] animate-pulse" />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-32">
        {/* Page header skeleton */}
        <div className="text-center mb-16">
          <div className="h-4 w-20 rounded-full bg-[#e5e5e5] mx-auto mb-4 animate-pulse" />
          <div className="h-12 w-64 rounded-lg bg-[#e5e5e5] mx-auto mb-4 animate-pulse" />
          <div className="h-5 w-96 rounded bg-[#e5e5e5] mx-auto animate-pulse" />
        </div>

        {/* Contact cards skeleton */}
        <div className="grid gap-6 md:grid-cols-3 mb-16">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-3xl bg-white border border-[#e5e5e5] p-8">
              <div className="h-14 w-14 rounded-2xl bg-[#e5e5e5] mx-auto mb-5 animate-pulse" />
              <div className="h-5 w-24 rounded bg-[#e5e5e5] mx-auto mb-3 animate-pulse" />
              <div className="h-4 w-40 rounded bg-[#e5e5e5] mx-auto animate-pulse" />
            </div>
          ))}
        </div>

        {/* Form skeleton */}
        <div className="rounded-3xl bg-white border border-[#e5e5e5] p-10">
          <div className="h-5 w-20 rounded-full bg-[#e5e5e5] mb-3 animate-pulse" />
          <div className="h-8 w-40 rounded bg-[#e5e5e5] mb-4 animate-pulse" />
          <div className="h-1 w-12 bg-[#e5e5e5] mb-8 animate-pulse" />
          
          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <div className="h-4 w-20 rounded bg-[#e5e5e5] animate-pulse" />
                <div className="h-12 rounded-xl bg-[#e5e5e5] animate-pulse" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-16 rounded bg-[#e5e5e5] animate-pulse" />
                <div className="h-12 rounded-xl bg-[#e5e5e5] animate-pulse" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-4 w-16 rounded bg-[#e5e5e5] animate-pulse" />
              <div className="h-12 rounded-xl bg-[#e5e5e5] animate-pulse" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-20 rounded bg-[#e5e5e5] animate-pulse" />
              <div className="h-32 rounded-xl bg-[#e5e5e5] animate-pulse" />
            </div>
            <div className="h-12 w-32 rounded-xl bg-[#e5e5e5] animate-pulse" />
          </div>
        </div>
      </main>
      
      <span role="status" className="sr-only">Loading contact page...</span>
    </div>
  );
}