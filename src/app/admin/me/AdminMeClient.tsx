"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { AdminUserRow } from "@/actions/admin/users";
import { logUserActivity } from "@/actions/admin/audit";

type ProfilePageProps = {
  currentUser: AdminUserRow;
};

export default function AdminMeClient({ currentUser }: ProfilePageProps) {
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(currentUser.display_name ?? "");
  const [phoneNumber, setPhoneNumber] = useState(currentUser.phone_number ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailChangeSent, setEmailChangeSent] = useState(false);
  const [changingEmail, setChangingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const { error: rpcError } = await supabase.rpc("update_admin_user", {
        p_id: currentUser.id,
        p_display_name: displayName || null,
        p_phone_number: phoneNumber || null,
      });
      if (rpcError) {
        setError(rpcError.message);
        return;
      }
      await logUserActivity({
        user_id: currentUser.user_id,
        activity_type: "profile_update",
        details: { fields: ["display_name", "phone_number"] },
      });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleEmailChange(e: React.FormEvent) {
    e.preventDefault();
    setChangingEmail(true);
    setEmailError(null);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        email: newEmail,
      });
      if (updateError) {
        setEmailError(updateError.message);
        return;
      }
      await logUserActivity({
        user_id: currentUser.user_id,
        activity_type: "email_change",
        details: { new_email: newEmail },
      });
      setEmailChangeSent(true);
      setChangingEmail(false);
    } finally {
      setChangingEmail(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-12">
      <div className="mx-auto max-w-2xl">
        <Link href="/admin" className="text-sm text-zinc-500 hover:text-zinc-300">
          ← Back to dashboard
        </Link>

        <h1 className="mt-6 text-3xl font-bold text-zinc-100">My Profile</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Manage your profile information and preferences.
        </p>

        {error && (
          <div className="mt-4 rounded-xl bg-red-900/30 p-4 text-sm text-red-400">{error}</div>
        )}

        {/* Profile card */}
        <div className="mt-6 rounded-2xl bg-zinc-900 p-6 shadow-black/20 ring-1 ring-zinc-700">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-zinc-100">
                {currentUser.display_name || currentUser.email}
              </h2>
              {currentUser.display_name && (
                <p className="text-sm text-zinc-500">{currentUser.email}</p>
              )}
              <div className="mt-2 flex items-center gap-2">
                <span className="rounded-full bg-zinc-950 px-2.5 py-0.5 text-xs font-semibold capitalize text-zinc-400">
                  {currentUser.role.replace("_", " ")}
                </span>
                {currentUser.brand_name && (
                  <span className="text-xs text-zinc-500">{currentUser.brand_name}</span>
                )}
              </div>
            </div>
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="rounded-lg border border-zinc-800 px-4 py-2 text-sm font-medium text-zinc-400 hover:bg-zinc-800"
              >
                Edit Profile
              </button>
            )}
          </div>

          {/* Read-only info when not editing */}
          {!editing && (
            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Phone</p>
                  <p className="mt-1 text-sm text-zinc-300">{currentUser.phone_number ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Email</p>
                  <p className="mt-1 text-sm text-zinc-300">{currentUser.email}</p>
                </div>
              </div>
            </div>
          )}

          {/* Edit form */}
          {editing && (
            <form onSubmit={handleSaveProfile} className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-600 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300">Phone Number</label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-600 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                  placeholder="+1 (555) 000-0000"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { setEditing(false); setError(null); }}
                  className="rounded-lg border border-zinc-800 px-4 py-2 text-sm font-medium text-zinc-400 hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Email change section */}
        <div className="mt-6 rounded-2xl bg-zinc-900 p-6 shadow-black/20 ring-1 ring-zinc-700">
          <h3 className="text-base font-semibold text-zinc-100">Email Address</h3>
          <p className="mt-1 text-sm text-zinc-500">
            Current: <span className="font-medium text-zinc-300">{currentUser.email}</span>
          </p>

          {emailChangeSent ? (
            <div className="mt-4 rounded-lg bg-green-900/30 p-4 text-sm text-green-400">
              A confirmation email has been sent to <strong>{newEmail}</strong>. Click the link in the email to confirm the change.
            </div>
          ) : (
            <form onSubmit={handleEmailChange} className="mt-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-zinc-300">New Email Address</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-600 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                  placeholder="new@example.com"
                />
              </div>
              {emailError && (
                <div className="rounded-lg bg-red-900/30 p-3 text-sm text-red-400">{emailError}</div>
              )}
              <button
                type="submit"
                disabled={changingEmail || !newEmail || !newEmail.includes("@")}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {changingEmail ? "Sending…" : "Change Email"}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
