import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Loading...",
  description: "Loading...",
  robots: {
    index: false,
    follow: false,
  },
};

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 bg-gradient-to-br from-stone-50 to-amber-50/30">
      {/* Background orbs */}
      <div 
        className="fixed w-96 h-96 rounded-full pointer-events-none animate-pulse"
        style={{
          background: 'radial-gradient(circle, rgba(34, 197, 94, 0.15) 0%, transparent 70%)',
          top: '10%',
          left: '10%',
          filter: 'blur(60px)'
        }}
        aria-hidden="true"
      />
      
      {/* Loading card */}
      <div className="w-full max-w-sm relative">
        <div className="bg-white/70 backdrop-blur-2xl rounded-[2rem] shadow-lg p-8">
          {/* Logo skeleton */}
          <div className="flex justify-center mb-10">
            <div className="h-20 w-20 rounded-3xl bg-slate-200 animate-pulse" />
          </div>
          
          {/* Text skeleton */}
          <div className="space-y-3">
            <div className="h-8 w-32 rounded bg-slate-200 mx-auto animate-pulse" />
            <div className="h-4 w-24 rounded bg-slate-100 mx-auto animate-pulse" />
          </div>
          
          {/* Form skeleton */}
          <div className="mt-8 space-y-4">
            <div className="space-y-2">
              <div className="h-4 w-16 rounded bg-slate-100 animate-pulse" />
              <div className="h-12 rounded-xl bg-slate-100 animate-pulse" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-20 rounded bg-slate-100 animate-pulse" />
              <div className="h-12 rounded-xl bg-slate-100 animate-pulse" />
            </div>
            <div className="h-12 rounded-xl bg-slate-200 animate-pulse" />
          </div>
        </div>
      </div>
      
      <span role="status" className="sr-only">Loading login page...</span>
    </div>
  );
}