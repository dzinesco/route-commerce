"use client";

import { useState } from "react";
import GlassModal from "@/components/admin/GlassModal";
import { AdminInput, AdminTextInput } from "@/components/admin/design-system";

type Role = "platform_admin" | "brand_admin" | "store_employee";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: import("@/actions/admin/users").AdminUserRow) => void;
  brands: { id: string; name: string }[];
  currentUser: {
    role: string;
  };
};

const FLAG_LABELS: Record<string, string> = {
  can_manage_products: "Products",
  can_manage_stops: "Stops",
  can_manage_orders: "Orders",
  can_manage_pickup: "Pickup",
  can_manage_messages: "Messages",
  can_manage_refunds: "Refunds",
  can_manage_users: "Users",
  can_manage_water_log: "Water Log",
  can_manage_reports: "Reports",
};

const ALL_FLAGS = Object.keys(FLAG_LABELS);

const defaultFlags: Record<string, boolean> = {
  can_manage_products: false,
  can_manage_stops: false,
  can_manage_orders: false,
  can_manage_pickup: false,
  can_manage_messages: false,
  can_manage_refunds: false,
  can_manage_users: false,
  can_manage_water_log: false,
  can_manage_reports: false,
};

const UserIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
  </svg>
);

export default function CreateUserModal({ isOpen, onClose, onSuccess, brands, currentUser }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [role, setRole] = useState<Role>("store_employee");
  const [brandId, setBrandId] = useState<string | null>(null);
  const [flags, setFlags] = useState<Record<string, boolean>>({ ...defaultFlags });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showBrandSelect = role === "brand_admin" || role === "store_employee";

  const availableRoles: Role[] =
    currentUser.role === "platform_admin"
      ? ["platform_admin", "brand_admin", "store_employee"]
      : ["brand_admin", "store_employee"];

  function toggleFlag(flag: string) {
    setFlags((prev) => ({ ...prev, [flag]: !prev[flag] }));
  }

  function resetForm() {
    setEmail("");
    setPassword("");
    setDisplayName("");
    setPhoneNumber("");
    setRole("store_employee");
    setBrandId(null);
    setFlags({ ...defaultFlags });
    setError(null);
  }

  async function handleSubmit() {
    if (!email.includes("@") || !password || password.length < 6) {
      setError("Please enter a valid email and a password with at least 6 characters.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const { createAdminUser } = await import("@/actions/admin/users");
      const result = await createAdminUser({
        email,
        password,
        display_name: displayName || undefined,
        phone_number: phoneNumber || undefined,
        role,
        brand_id: brandId,
        flags,
        mustChangePassword: true,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.user) {
        onSuccess(result.user);
        resetForm();
        onClose();
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "An unexpected error occurred.");
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    if (!saving) {
      resetForm();
      onClose();
    }
  }

  const roleDescriptions: Record<Role, string> = {
    platform_admin: "Full platform access",
    brand_admin: "Brand-level admin",
    store_employee: "Pickup and order operations only",
  };

  if (!isOpen) return null;

  return (
    <GlassModal
      title="Create User"
      titleIcon={<UserIcon className="h-5 w-5 text-[var(--admin-accent)]" />}
      subtitle="Add a new admin user to your organization"
      onClose={handleClose}
      maxWidth="max-w-lg"
    >
      <div className="space-y-4 sm:space-y-6">
        {/* Error banner */}
        {error && (
          <div className="flex items-start justify-between rounded-lg bg-red-50 p-3 sm:p-4 text-sm text-red-700 gap-3 border border-red-200">
            <span className="text-xs sm:text-sm">{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 shrink-0">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Email */}
        <div>
          <label htmlFor="create-user-email" className="block text-sm font-medium text-[var(--admin-text-primary)] mb-1.5">
            Email
          </label>
          <input
            id="create-user-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            aria-required="true"
            autoComplete="email"
            className="w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card-bg)] px-3 py-2.5 text-sm text-[var(--admin-text-primary)] outline-none focus:border-[var(--admin-accent)] focus:ring-2 focus:ring-[var(--admin-accent)]/20 placeholder:text-[var(--admin-text-muted)]"
            placeholder="user@example.com"
          />
        </div>

        {/* Password */}
        <div>
          <label htmlFor="create-user-password" className="block text-sm font-medium text-[var(--admin-text-primary)] mb-1.5">
            Password
          </label>
          <p id="create-user-password-help" className="text-xs text-[var(--admin-text-muted)] mb-1.5">Minimum 6 characters.</p>
          <input
            id="create-user-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            aria-required="true"
            aria-describedby="create-user-password-help"
            autoComplete="new-password"
            className="w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card-bg)] px-3 py-2.5 text-sm text-[var(--admin-text-primary)] outline-none focus:border-[var(--admin-accent)] focus:ring-2 focus:ring-[var(--admin-accent)]/20 placeholder:text-[var(--admin-text-muted)]"
            placeholder="Choose a password"
            minLength={6}
          />
        </div>

        {/* Display Name & Phone - 2 columns on larger screens */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <div>
            <label htmlFor="create-user-display-name" className="block text-sm font-medium text-[var(--admin-text-primary)] mb-1.5">
              Display Name
            </label>
            <input
              id="create-user-display-name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              autoComplete="name"
              className="w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card-bg)] px-3 py-2.5 text-sm text-[var(--admin-text-primary)] outline-none focus:border-[var(--admin-accent)] focus:ring-2 focus:ring-[var(--admin-accent)]/20 placeholder:text-[var(--admin-text-muted)]"
              placeholder="Kyle Martinez"
            />
          </div>

          <div>
            <label htmlFor="create-user-phone" className="block text-sm font-medium text-[var(--admin-text-primary)] mb-1.5">
              Phone Number
            </label>
            <p className="text-xs text-[var(--admin-text-muted)] mb-1.5">Optional.</p>
            <input
              id="create-user-phone"
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              autoComplete="tel"
              className="w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card-bg)] px-3 py-2.5 text-sm text-[var(--admin-text-primary)] outline-none focus:border-[var(--admin-accent)] focus:ring-2 focus:ring-[var(--admin-accent)]/20 placeholder:text-[var(--admin-text-muted)]"
              placeholder="+1 (555) 000-0000"
            />
          </div>
        </div>

        {/* Role */}
        <div>
          <label className="block text-sm font-medium text-[var(--admin-text-primary)] mb-2">Role</label>
          <div className="space-y-2">
            {availableRoles.map((r) => (
              <label key={r} className="flex items-center gap-3 rounded-lg border border-[var(--admin-border)] px-3 py-2.5 cursor-pointer hover:bg-[var(--admin-bg)] transition-colors">
                <input
                  type="radio"
                  name="role"
                  value={r}
                  checked={role === r}
                  onChange={() => setRole(r)}
                  className="accent-[var(--admin-accent)]"
                />
                <div>
                  <span className="font-medium text-[var(--admin-text-primary)] capitalize text-sm">{r.replace("_", " ")}</span>
                  <p className="text-xs text-[var(--admin-text-muted)]">{roleDescriptions[r]}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Brand */}
        {showBrandSelect && (
          <div>
            <label htmlFor="create-user-brand" className="block text-sm font-medium text-[var(--admin-text-primary)] mb-1.5">Brand</label>
            <select
              id="create-user-brand"
              value={brandId ?? ""}
              onChange={(e) => setBrandId(e.target.value || null)}
              required
              aria-required="true"
              className="w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card-bg)] px-3 py-2.5 text-sm text-[var(--admin-text-primary)] outline-none focus:border-[var(--admin-accent)] focus:ring-2 focus:ring-[var(--admin-accent)]/20"
            >
              <option value="">Select a brand</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Permissions */}
        <div>
          <label className="block text-sm font-medium text-[var(--admin-text-primary)] mb-2">Permissions</label>
          <div className="space-y-2">
            {ALL_FLAGS.map((flag) => (
              <label key={flag} className="flex items-center justify-between rounded-lg border border-[var(--admin-border)] px-3 sm:px-4 py-2 sm:py-2.5 hover:bg-[var(--admin-bg)] cursor-pointer transition-colors">
                <span className="text-xs sm:text-sm text-[var(--admin-text-primary)]">{FLAG_LABELS[flag]}</span>
                <button
                  type="button"
                  onClick={() => toggleFlag(flag)}
                  className={`relative inline-flex h-5 w-9 sm:h-6 sm:w-11 items-center rounded-full transition-colors ${flags[flag] ? "bg-[var(--admin-accent)]" : "bg-stone-300"}`}
                >
                  <span className={`inline-block h-3 w-3 sm:h-4 sm:w-4 transform rounded-full bg-white shadow transition-transform ${flags[flag] ? "translate-x-5 sm:translate-x-6" : "translate-x-0.5 sm:translate-x-1"}`} />
                </button>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2 sm:gap-3 mt-6 sm:mt-8 -mx-4 sm:-mx-6 md:-mx-8 -mb-4 sm:-mb-6 md:-mb-8 px-4 sm:px-6 md:px-8 py-4 sm:py-6 border-t border-[var(--admin-border)] bg-[var(--admin-bg)] rounded-b-2xl">
        <button
          onClick={handleClose}
          disabled={saving}
          className="w-full sm:w-auto rounded-xl border border-[var(--admin-border)] px-4 sm:px-5 py-2.5 text-sm font-medium text-[var(--admin-text-secondary)] hover:bg-[var(--admin-bg-subtle)] transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={saving || !email.includes("@") || !password || password.length < 6}
          className="w-full sm:w-auto rounded-xl bg-[var(--admin-accent)] px-4 sm:px-5 py-2.5 text-sm font-medium text-white hover:bg-[var(--admin-accent-hover)] transition-colors disabled:opacity-50"
        >
          {saving ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Creating...
            </span>
          ) : "Create User"}
        </button>
      </div>
    </GlassModal>
  );
}