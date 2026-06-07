"use client";

import { signInWithGoogle } from "@/actions/auth-actions";

type LoginClientProps = {
  hasGoogle: boolean;
};

function GoogleSignIn({ hasGoogle }: { hasGoogle: boolean }) {
  if (!hasGoogle) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-medium">Google sign-in is not configured.</p>
        <p className="mt-1 text-amber-800">
          Add <code className="font-mono text-xs">AUTH_GOOGLE_ID</code> and{" "}
          <code className="font-mono text-xs">AUTH_GOOGLE_SECRET</code> to your
          environment to enable it. See{" "}
          <a
            className="underline"
            href="https://authjs.dev/getting-started/providers/google"
            target="_blank"
            rel="noreferrer"
          >
            Auth.js Google provider docs
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <form action={signInWithGoogle}>
      <button
        type="submit"
        className="w-full flex items-center justify-center gap-3 rounded-xl bg-white border border-stone-200/80 px-6 py-3.5 text-sm font-semibold text-stone-800 hover:bg-stone-50 active:scale-[0.98] transition-all shadow-sm"
        style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A10.99 10.99 0 0012 23z" />
          <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 015.5 12c0-.73.13-1.44.34-2.1V7.07H2.18A10.99 10.99 0 001 12c0 1.77.43 3.45 1.18 4.93l3.66-2.83z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z" />
        </svg>
        Continue with Google
      </button>
    </form>
  );
}

export default function LoginClient({ hasGoogle }: LoginClientProps) {
  return (
    <main className="min-h-screen flex flex-col relative overflow-hidden" style={{ backgroundColor: "#faf8f5", height: "100vh" }}>
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap");
        html, body { overflow: hidden; }
      `}</style>

      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-20" style={{ background: "radial-gradient(circle at 30% 30%, #c97a3e20 0%, transparent 70%)", filter: "blur(40px)" }} />
        <div className="absolute -bottom-48 -left-48 w-[600px] h-[600px] rounded-full opacity-15" style={{ background: "radial-gradient(circle at 70% 70%, #6b8f7130 0%, transparent 70%)", filter: "blur(60px)" }} />
        <div className="absolute top-1/3 left-1/4 w-72 h-72 rounded-full opacity-10" style={{ background: "radial-gradient(circle, #1a4d2e15 0%, transparent 70%)", filter: "blur(30px)" }} />
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12 relative z-10">
        <div className="w-full max-w-sm">
          <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl ring-1 ring-black/5 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#6b8f71]/30 to-transparent" />

            <div className="p-8 sm:p-10">
              <div className="text-center mb-8">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl mb-5" style={{ background: "linear-gradient(135deg, #1a4d2e 0%, #2d6a45 100%)", boxShadow: "0 12px 32px rgba(26, 77, 46, 0.25)" }}>
                  <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                  </svg>
                </div>
                <h1 className="text-3xl font-semibold text-stone-900" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", letterSpacing: "-0.02em" }}>
                  Welcome back
                </h1>
                <p className="mt-2 text-sm" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", color: "#7a7570" }}>
                  Sign in to your account
                </p>
              </div>

              <GoogleSignIn hasGoogle={hasGoogle} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
