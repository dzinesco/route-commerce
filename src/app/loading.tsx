import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Loading Route Commerce...",
  description: "Loading...",
  robots: {
    index: false,
    follow: false,
  },
};

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ backgroundColor: "#faf8f5" }}>
      {/* Subtle loading animation */}
      <div className="flex flex-col items-center gap-6">
        <div 
          className="w-16 h-16 rounded-2xl flex items-center justify-center animate-pulse"
          style={{ 
            background: "linear-gradient(135deg, #1a4d2e 0%, #166534 100%)",
            boxShadow: "0 8px 32px rgba(26, 77, 46, 0.3)"
          }}
          aria-label="Loading"
          role="status"
        >
          <svg className="w-8 h-8 text-white animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 2L4.5 13.5H11.5L10.5 22L19 10.5H12L13 2Z" />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-stone-700" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
            Loading
          </p>
          <p className="text-sm text-stone-500 mt-1">Please wait...</p>
        </div>
      </div>
      
      {/* Decorative elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div 
          className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle at 30% 30%, #c97a3e20 0%, transparent 70%)", filter: "blur(40px)" }}
          aria-hidden="true"
        />
        <div 
          className="absolute -bottom-48 -left-48 w-[600px] h-[600px] rounded-full opacity-10"
          style={{ background: "radial-gradient(circle at 70% 70%, #6b8f7130 0%, transparent 70%)", filter: "blur(60px)" }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}