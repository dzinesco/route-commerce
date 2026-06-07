"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updatePasswordAction } from "@/actions/admin/password";
import { logUserActivity } from "@/actions/admin/audit";

export default function ChangePasswordForm({ userId }: { userId: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const result = await updatePasswordAction(password);
    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    logUserActivity({
      user_id: userId,
      activity_type: "password_change",
      details: {},
    }).catch(() => {});

    router.push("/admin");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-12 flex items-start justify-center">
      <div className="w-full max-w-md">
        <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-8">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-amber-900/30 border border-amber-700/40">
            <svg
              className="h-6 w-6 text-amber-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-zinc-100">Change Password</h1>
          <p className="mt-1 text-sm text-zinc-500">
            You must set a new password before continuing.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {error && (
              <div className="rounded-xl bg-red-900/20 border border-red-800/50 p-4 text-sm text-red-400">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">
                New Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-violet-500 transition-colors"
                placeholder="Min. 8 characters"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-violet-500 transition-colors"
                placeholder="Repeat password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-violet-600 hover:bg-violet-500 px-6 py-4 text-base font-bold text-white disabled:opacity-50 transition-colors"
            >
              {loading ? "Updating..." : "Update Password"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
