import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Loading pricing...",
  description: "Loading...",
  robots: {
    index: false,
    follow: false,
  },
};

export default function Loading() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav skeleton */}
      <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-slate-200 animate-pulse" />
            <div className="h-6 w-36 rounded bg-slate-200 animate-pulse" />
          </div>
          <div className="flex items-center gap-6">
            <div className="h-4 w-16 rounded bg-slate-200 animate-pulse" />
            <div className="h-4 w-20 rounded bg-slate-200 animate-pulse" />
            <div className="h-9 w-24 rounded-xl bg-slate-200 animate-pulse" />
          </div>
        </div>
      </header>

      {/* Hero skeleton */}
      <section className="bg-gradient-to-b from-slate-50 to-white px-6 py-20 text-center">
        <div className="mx-auto max-w-3xl">
          <div className="h-6 w-40 rounded-full bg-slate-200 mx-auto mb-4 animate-pulse" />
          <div className="h-16 w-80 rounded-lg bg-slate-200 mx-auto mb-6 animate-pulse" />
          <div className="h-6 w-96 rounded bg-slate-200 mx-auto animate-pulse" />
        </div>
      </section>

      {/* Plan cards skeleton */}
      <section className="mx-auto max-w-6xl px-6 py-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border-2 border-slate-200 p-6">
              <div className="h-6 w-24 rounded bg-slate-200 mb-3 animate-pulse" />
              <div className="h-4 w-32 rounded bg-slate-200 mb-1 animate-pulse" />
              <div className="h-10 w-24 rounded bg-slate-200 mb-4 animate-pulse" />
              <div className="h-12 w-full rounded-xl bg-slate-200 animate-pulse" />
              <div className="mt-6 space-y-2.5">
                {[1, 2, 3, 4].map((j) => (
                  <div key={j} className="h-4 w-full rounded bg-slate-100 animate-pulse" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
      
      <span role="status" className="sr-only">Loading pricing page...</span>
    </div>
  );
}