import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Processing...",
  description: "Loading checkout...",
  robots: {
    index: false,
    follow: false,
  },
};

export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-white to-emerald-50/30">
      <div className="h-20 border-b border-slate-100/50" />
      
      <main className="px-6 py-12">
        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-[1fr_400px]">
          <div>
            {/* Title skeleton */}
            <div className="h-10 w-32 rounded-lg bg-slate-200 animate-pulse" />
            <div className="h-5 w-64 rounded mt-3 bg-slate-100 animate-pulse" />
            
            {/* Form skeleton */}
            <div className="mt-8 space-y-6">
              <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
                <div className="h-6 w-40 rounded bg-slate-100 animate-pulse" />
                <div className="mt-4 space-y-4">
                  <div className="space-y-2">
                    <div className="h-4 w-20 rounded bg-slate-100 animate-pulse" />
                    <div className="h-12 w-full rounded-xl bg-slate-100 animate-pulse" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 w-16 rounded bg-slate-100 animate-pulse" />
                    <div className="h-12 w-full rounded-xl bg-slate-100 animate-pulse" />
                  </div>
                </div>
              </div>
              
              {/* Button skeleton */}
              <div className="h-14 w-full rounded-xl bg-slate-100 animate-pulse" />
            </div>
          </div>
          
          {/* Sidebar skeleton */}
          <aside>
            <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 sticky top-6">
              <div className="h-6 w-32 rounded bg-slate-100 animate-pulse" />
              <div className="mt-4 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex justify-between">
                    <div className="h-4 w-32 rounded bg-slate-100 animate-pulse" />
                    <div className="h-4 w-16 rounded bg-slate-100 animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </main>
      
      <span role="status" className="sr-only">Loading checkout...</span>
    </div>
  );
}