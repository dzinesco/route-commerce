"use client";

import { useState } from "react";
import Link from "next/link";
import { AdminUserRow } from "@/actions/admin/users";

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

  // Profile / email mutations used to call Supabase directly. With the
  // platform moved off Supabase entirely, those handlers are stubbed out
  // — the page remains read-only until a server-action equivalent ships.
  // See the final YOLO report for the broader Supabase → pg data-fetch
  // migration that covers the rest of the admin pages.

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("Profile editing is temporarily unavailable. Contact a platform admin.");
    setSaving(false);
  }

  async function handleEmailChange(e: React.FormEvent) {
    e.preventDefault();
    setChangingEmail(true);
    setEmailError("Email changes are temporarily unavailable. Contact a platform admin.");
    setChangingEmail(false);
  }

  return (
    <main className="min-h-screen px-6 py-12" style={{ backgroundColor: "var(--admin-bg)" }}>
      <div className="mx-auto max-w-2xl">
        <Link 
          href="/admin" 
          className="text-sm transition-colors"
          style={{ color: "var(--admin-text-muted)" }}
        >
          ← Back to dashboard
        </Link>

        <h1 className="mt-6 text-3xl font-bold" style={{ color: "var(--admin-text-primary)" }}>My Profile</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--admin-text-muted)" }}>
          Manage your profile information and preferences.
        </p>

        {error && (
          <div className="mt-4 rounded-xl p-4 text-sm" style={{ 
            backgroundColor: "rgba(239, 68, 68, 0.1)", 
            color: "rgb(239, 68, 68)" 
          }}>{error}</div>
        )}

        {/* Profile card */}
        <div className="mt-6 rounded-2xl p-6 shadow-lg border" style={{ 
          backgroundColor: "white", 
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)",
          borderColor: "var(--admin-border)" 
        }}>
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold" style={{ color: "var(--admin-text-primary)" }}>
                {currentUser.display_name || currentUser.email}
              </h2>
              {currentUser.display_name && (
                <p className="text-sm" style={{ color: "var(--admin-text-muted)" }}>{currentUser.email}</p>
              )}
              <div className="mt-2 flex items-center gap-2">
                <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize" style={{ 
                  backgroundColor: "var(--admin-bg-subtle)", 
                  color: "var(--admin-text-muted)" 
                }}>
                  {currentUser.role.replace("_", " ")}
                </span>
                {currentUser.brand_name && (
                  <span className="text-xs" style={{ color: "var(--admin-text-muted)" }}>{currentUser.brand_name}</span>
                )}
              </div>
            </div>
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
                style={{ 
                  borderColor: "var(--admin-border)", 
                  color: "var(--admin-text-muted)" 
                }}
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
                  <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--admin-text-muted)" }}>Phone</p>
                  <p className="mt-1 text-sm" style={{ color: "var(--admin-text-primary)" }}>{currentUser.phone_number ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--admin-text-muted)" }}>Email</p>
                  <p className="mt-1 text-sm" style={{ color: "var(--admin-text-primary)" }}>{currentUser.email}</p>
                </div>
              </div>
            </div>
          )}

          {/* Edit form */}
          {editing && (
            <form onSubmit={handleSaveProfile} className="mt-6 space-y-4">
              <div>
                <label htmlFor="me-display-name" className="block text-sm font-medium" style={{ color: "var(--admin-text-primary)" }}>Display Name</label>
                <input
                  id="me-display-name"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1"
                  style={{
                    borderColor: "var(--admin-border)",
                    color: "var(--admin-text-primary)",
                    backgroundColor: "white"
                  }}
                  placeholder="Your name"
                />
              </div>
              <div>
                <label htmlFor="me-phone" className="block text-sm font-medium" style={{ color: "var(--admin-text-primary)" }}>Phone Number</label>
                <input
                  id="me-phone"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1"
                  style={{
                    borderColor: "var(--admin-border)",
                    color: "var(--admin-text-primary)",
                    backgroundColor: "white"
                  }}
                  placeholder="+1 (555) 000-0000"
                  autoComplete="tel"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { setEditing(false); setError(null); }}
                  className="rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
                  style={{ 
                    borderColor: "var(--admin-border)", 
                    color: "var(--admin-text-muted)" 
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50"
                  style={{ backgroundColor: "var(--admin-accent)" }}
                >
                  {saving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Email change section */}
        <div className="mt-6 rounded-2xl p-6 shadow-lg border" style={{ 
          backgroundColor: "white", 
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)",
          borderColor: "var(--admin-border)" 
        }}>
          <h3 className="text-base font-semibold" style={{ color: "var(--admin-text-primary)" }}>Email Address</h3>
          <p className="mt-1 text-sm" style={{ color: "var(--admin-text-muted)" }}>
            Current: <span className="font-medium" style={{ color: "var(--admin-text-primary)" }}>{currentUser.email}</span>
          </p>

          {emailChangeSent ? (
            <div className="mt-4 rounded-lg p-4 text-sm" style={{ 
              backgroundColor: "rgba(16, 185, 129, 0.1)", 
              color: "var(--admin-accent)" 
            }}>
              A confirmation email has been sent to <strong>{newEmail}</strong>. Click the link in the email to confirm the change.
            </div>
          ) : (
            <form onSubmit={handleEmailChange} className="mt-4 space-y-3">
              <div>
                <label htmlFor="me-new-email" className="block text-sm font-medium" style={{ color: "var(--admin-text-primary)" }}>New Email Address</label>
                <input
                  id="me-new-email"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  required
                  aria-required="true"
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1"
                  style={{
                    borderColor: "var(--admin-border)",
                    color: "var(--admin-text-primary)",
                    backgroundColor: "white"
                  }}
                  placeholder="new@example.com"
                  autoComplete="email"
                />
              </div>
              {emailError && (
                <div className="rounded-lg p-3 text-sm" style={{ 
                  backgroundColor: "rgba(239, 68, 68, 0.1)", 
                  color: "rgb(239, 68, 68)" 
                }}>{emailError}</div>
              )}
              <button
                type="submit"
                disabled={changingEmail || !newEmail || !newEmail.includes("@")}
                className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50"
                style={{ backgroundColor: "var(--admin-accent)" }}
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
