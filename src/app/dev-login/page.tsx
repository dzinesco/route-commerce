"use client";

export default function DevLoginPage() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-8 shadow-xl">
        <h1 className="text-2xl font-bold text-zinc-100 mb-4">Dev Login</h1>
        <p className="text-zinc-400 mb-6">Click below to login as platform admin:</p>
        <form action="/api/dev-login" method="POST">
          <button
            type="submit"
            className="w-full rounded-xl bg-emerald-600 px-6 py-4 text-base font-bold text-white hover:bg-emerald-500 transition-colors"
          >
            Login as Platform Admin
          </button>
        </form>
      </div>
    </div>
  );
}