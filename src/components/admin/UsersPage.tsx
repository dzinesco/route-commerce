"use client";

import { useState } from "react";
import { AdminUserRow, UpdateAdminUserInput } from "@/actions/admin/users";
import { formatDate } from "@/lib/format-date";
import CreateUserModal from "./CreateUserModal";

type UsersPageProps = {
  initialUsers: AdminUserRow[];
  brands: { id: string; name: string }[];
  currentUser: {
    id: string;
    role: string;
    can_manage_users?: boolean;
  };
  onUserCreated?: (user: AdminUserRow) => void;
};

type PasswordModal = {
  email: string;
  tempPassword: string | null;
  loading: boolean;
  error: string | null;
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

function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, string> = {
    platform_admin: "bg-purple-100 text-purple-700",
    brand_admin: "bg-blue-100 text-blue-700",
    store_employee: "bg-emerald-100 text-emerald-700",
    staff: "bg-stone-100 text-stone-600",
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${colors[role] ?? "bg-stone-100 text-stone-600"}`}>
      {role.replace("_", " ")}
    </span>
  );
}

type EditingUser = {
  id?: string;
  email?: string;
  password?: string;
  display_name?: string;
  phone_number?: string;
  role: "platform_admin" | "brand_admin" | "store_employee";
  brand_id: string | null;
  flags: Record<string, boolean>;
  active?: boolean;
  isNew: boolean;
};

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

function emptyEditing(isNew: boolean): EditingUser {
  return {
    isNew,
    role: "store_employee",
    brand_id: null,
    display_name: "",
    phone_number: "",
    password: "",
    flags: { ...defaultFlags },
  };
}

function editingFromRow(row: AdminUserRow): EditingUser {
  return {
    id: row.id,
    email: row.email,
    display_name: row.display_name ?? "",
    phone_number: row.phone_number ?? "",
    role: row.role as "platform_admin" | "brand_admin" | "store_employee",
    brand_id: row.brand_id,
    flags: {
      can_manage_products: row.can_manage_products,
      can_manage_stops: row.can_manage_stops,
      can_manage_orders: row.can_manage_orders,
      can_manage_pickup: row.can_manage_pickup,
      can_manage_messages: row.can_manage_messages,
      can_manage_refunds: row.can_manage_refunds,
      can_manage_users: row.can_manage_users,
      can_manage_water_log: row.can_manage_water_log,
      can_manage_reports: row.can_manage_reports,
    },
    active: row.active,
    isNew: false,
  };
}

export default function UsersPage({ initialUsers, brands, currentUser, onUserCreated }: UsersPageProps) {
  const [users, setUsers] = useState(initialUsers);
  const [panelOpen, setPanelOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editing, setEditing] = useState<EditingUser>(emptyEditing(true));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);
  const [passwordModal, setPasswordModal] = useState<PasswordModal | null>(null);
  const [resetLinkLoading, setResetLinkLoading] = useState<string | null>(null);

  const canManageUsers =
    currentUser.role === "platform_admin" ||
    (currentUser.role === "brand_admin" && currentUser.can_manage_users);

  function openCreate() {
    setShowCreateModal(true);
  }

  function handleUserCreated(user: AdminUserRow) {
    setUsers((prev) => [user, ...prev]);
    onUserCreated?.(user);
  }

  function openEdit(row: AdminUserRow) {
    setEditing(editingFromRow(row));
    setError(null);
    setPanelOpen(true);
  }

  function closePanel() {
    setPanelOpen(false);
    setEditing(emptyEditing(true));
    setError(null);
  }

  function setRole(role: EditingUser["role"]) {
    setEditing((prev) => ({ ...prev, role }));
  }

  function setBrand(brand_id: string | null) {
    setEditing((prev) => ({ ...prev, brand_id }));
  }

  function toggleFlag(flag: string) {
    setEditing((prev) => ({
      ...prev,
      flags: { ...prev.flags, [flag]: !prev.flags[flag] },
    }));
  }

  function setActive(active: boolean) {
    setEditing((prev) => ({ ...prev, active }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      if (editing.isNew) {
        const res = await import("@/actions/admin/users").then((m) =>
          m.createAdminUser({
            email: editing.email!,
            password: editing.password!,
            display_name: editing.display_name || undefined,
            phone_number: editing.phone_number || undefined,
            role: editing.role,
            brand_id: editing.brand_id,
            flags: editing.flags,
            mustChangePassword: true,
          })
        );
        if (res.error) {
          if (res.error === "Not authenticated" || res.error.includes("session") || res.error.includes("authenticated")) {
            setError("Your session may have expired. Please log in again.");
          } else if (res.error.includes("permission") || res.error.includes("Insufficient permissions")) {
            setError("You do not have permission to edit this user.");
          } else {
            setError(res.error);
          }
          return;
        }
        if (res.user) setUsers((prev) => [res.user!, ...prev]);
      } else {
        const res = await import("@/actions/admin/users").then((m) =>
          m.updateAdminUser({
            id: editing.id!,
            role: editing.role,
            brand_id: editing.brand_id,
            flags: editing.flags,
            active: editing.active,
            display_name: editing.display_name === "" ? null : editing.display_name || undefined,
            phone_number: editing.phone_number === "" ? null : editing.phone_number || undefined,
          })
        );
        if (res.error) {
          if (res.error === "Not authenticated" || res.error.includes("session") || res.error.includes("authenticated")) {
            setError("Your session may have expired. Please log in again.");
          } else if (res.error.includes("permission") || res.error.includes("Insufficient permissions")) {
            setError("You do not have permission to edit this user.");
          } else {
            setError(res.error);
          }
          return;
        }
        if (res.user) setUsers((prev) => prev.map((u) => (u.id === res.user!.id ? res.user! : u)));
      }
      closePanel();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const res = await import("@/actions/admin/users").then((m) => m.deleteAdminUser(id));
    if (res.error) { setError(res.error); return; }
    setUsers((prev) => prev.filter((u) => u.id !== id));
    setDeleteConfirmId(null);
  }

  async function handleResetPassword(email: string) {
    setPasswordModal({ email, tempPassword: null, loading: true, error: null });
    try {
      const { resetAdminPassword } = await import("@/actions/admin/reset-admin");
      const result = await resetAdminPassword(email, "Tuxedo2026!");
      if (result.success) {
        setPasswordModal({ email, tempPassword: result.tempPassword, loading: false, error: null });
      } else {
        setPasswordModal({ email, tempPassword: null, loading: false, error: result.error ?? "Failed" });
      }
    } catch (e: any) {
      setPasswordModal({ email, tempPassword: null, loading: false, error: e?.message ?? "Error" });
    }
  }

  async function handleForcePasswordChange(id: string) {
    try {
      const { setMustChangePassword } = await import("@/actions/admin/users");
      const res = await setMustChangePassword(id);
      if (res.error) throw new Error(res.error);
      setUsers((prev) => prev.map((u) => u.id === id ? { ...u, must_change_password: true } : u));
    } catch (e: any) {
      setError(e?.message ?? "Failed to require password change");
    }
  }

  async function handleSendResetLink(email: string) {
    setResetLinkLoading(email);
    try {
      const { sendPasswordResetEmail } = await import("@/actions/admin/users");
      const result = await sendPasswordResetEmail(email);
      setResetLinkLoading(null);
      if (result.error) throw new Error(result.error);
      setError(null);
    } catch (e: any) {
      setResetLinkLoading(null);
      setError(e?.message ?? "Failed to send reset email");
    }
  }

  function copyTempPassword() {
    if (passwordModal?.tempPassword) {
      navigator.clipboard.writeText(passwordModal.tempPassword).catch(() => {});
    }
  }

  const showBrandSelect = editing.role === "brand_admin" || editing.role === "store_employee";
  const availableRoles: EditingUser["role"][] =
    currentUser.role === "platform_admin"
      ? ["platform_admin", "brand_admin", "store_employee"]
      : ["brand_admin", "store_employee"];

  return (
    <>
      {/* User list */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-stone-900">{users.length} user{users.length !== 1 ? "s" : ""}</h2>
        </div>
        {canManageUsers && (
          <button
            onClick={openCreate}
            className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800"
          >
            + Create User
          </button>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 flex items-start justify-between rounded-lg bg-red-50 p-4 text-sm text-red-700 gap-3 border border-red-200">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 shrink-0">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <div className="overflow-visible rounded-xl bg-white shadow-sm ring-1 ring-stone-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50 text-stone-500">
            <tr>
              <th className="px-5 py-4 font-semibold">Name</th>
              <th className="px-5 py-4 font-semibold">Phone</th>
              <th className="px-5 py-4 font-semibold">Role</th>
              <th className="px-5 py-4 font-semibold">Brand</th>
              <th className="px-5 py-4 font-semibold">Status</th>
              <th className="px-5 py-4 font-semibold">Created</th>
              {canManageUsers && <th className="px-5 py-4 font-semibold" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-stone-50">
                <td className="px-5 py-4">
                  <div className="font-medium text-stone-900">{user.display_name || user.email}</div>
                  {user.display_name && user.display_name !== "No Name" && (
                    <div className="text-xs text-stone-500">{user.email}</div>
                  )}
                </td>
                <td className="px-5 py-4 text-stone-500 text-sm">{user.phone_number ?? "—"}</td>
                <td className="px-5 py-4">
                  <RoleBadge role={user.role} />
                </td>
                <td className="px-5 py-4 text-stone-500">{user.brand_name ?? "—"}</td>
                <td className="px-5 py-4">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${user.active ? "bg-emerald-100 text-emerald-700" : "bg-stone-100 text-stone-500"}`}>
                    {user.active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-5 py-4 text-stone-400 text-xs">
                  {formatDate(new Date(user.created_at))}
                </td>
                {canManageUsers && (
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => openEdit(user)}
                        className="text-xs font-medium text-stone-500 hover:text-stone-900"
                      >
                        Edit
                      </button>
                      <div className="relative overflow-visible">
                        <button
                          onClick={() => setActionMenuId(actionMenuId === user.id ? null : user.id)}
                          className="text-base font-medium text-stone-400 hover:text-stone-600 px-2 py-1"
                          title="More actions"
                        >
                          ⁝
                        </button>
                        {actionMenuId === user.id && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setActionMenuId(null)} />
                            <div className="absolute right-0 z-50 mt-1 w-48 rounded-xl bg-white shadow-xl ring-1 ring-stone-200 border border-stone-100 py-1 text-xs overflow-visible">
                              <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-stone-400 border-b border-stone-100">
                                Actions
                              </div>
                              <button
                                onClick={() => { setActionMenuId(null); handleResetPassword(user.email); }}
                                className="w-full text-left px-3 py-2.5 text-stone-700 hover:bg-stone-50 flex items-center gap-2"
                              >
                                🔑 Reset Password
                              </button>
                              <button
                                onClick={() => { setActionMenuId(null); handleForcePasswordChange(user.id); }}
                                className="w-full text-left px-3 py-2.5 text-stone-700 hover:bg-stone-50 flex items-center gap-2"
                              >
                                ↪ Require Password Change
                              </button>
                              <button
                                onClick={() => { setActionMenuId(null); handleSendResetLink(user.email); }}
                                className="w-full text-left px-3 py-2.5 text-stone-700 hover:bg-stone-50 flex items-center gap-2"
                              >
                                ✉ Send Reset Email
                              </button>
                              {user.id !== currentUser.id && (
                                <button
                                  onClick={() => { setActionMenuId(null); setDeleteConfirmId(user.id); }}
                                  className="w-full text-left px-3 py-2.5 text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-stone-100 mt-1 pt-1"
                                >
                                  🗑 Delete
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-stone-400">
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Delete confirm modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="w-96 rounded-2xl bg-white p-6 shadow-xl ring-1 ring-stone-200">
            <h3 className="text-lg font-bold text-stone-900">Delete user?</h3>
            <p className="mt-2 text-sm text-stone-600">
              This will remove their admin access. Their auth account will remain active.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Slide-in panel */}
      {panelOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/20" onClick={closePanel}>
          <div
            className="relative flex h-full w-full max-w-md flex-col overflow-y-auto bg-white shadow-xl ring-1 ring-stone-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-stone-100 px-6 py-4">
              <h2 className="text-lg font-bold text-stone-900">
                {editing.isNew ? "Create User" : "Edit User"}
              </h2>
              <button onClick={closePanel} className="text-stone-400 hover:text-stone-600">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Saving overlay */}
            {saving && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70">
                <div className="flex flex-col items-center gap-2">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-stone-200 border-t-stone-900" />
                  <p className="text-sm text-stone-500">Saving…</p>
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-6 py-6">
              <div className="space-y-6">
                {/* Email (create only) */}
                {editing.isNew && (
                  <div>
                    <label className="block text-sm font-medium text-stone-700">Email</label>
                    <input
                      type="email"
                      value={editing.email ?? ""}
                      onChange={(e) => setEditing((p) => ({ ...p, email: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      placeholder="user@example.com"
                    />
                  </div>
                )}

                {/* Password (create only) */}
                {editing.isNew && (
                  <div>
                    <label className="block text-sm font-medium text-stone-700">Password</label>
                    <p className="mt-1 text-xs text-stone-500 mb-1.5">Minimum 6 characters.</p>
                    <input
                      type="password"
                      value={editing.password ?? ""}
                      onChange={(e) => setEditing((p) => ({ ...p, password: e.target.value }))}
                      className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      placeholder="Choose a password"
                      minLength={6}
                    />
                  </div>
                )}

                {/* Display Name */}
                <div>
                  <label className="block text-sm font-medium text-stone-700">Display Name</label>
                  <p className="mt-1 text-xs text-stone-500 mb-1.5">Shown in the admin user list.</p>
                  <input
                    type="text"
                    value={editing.display_name ?? ""}
                    onChange={(e) => setEditing((p) => ({ ...p, display_name: e.target.value }))}
                    className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    placeholder="Kyle Martinez"
                  />
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-sm font-medium text-stone-700">Phone Number</label>
                  <p className="mt-1 text-xs text-stone-500 mb-1.5">Optional.</p>
                  <input
                    type="tel"
                    value={editing.phone_number ?? ""}
                    onChange={(e) => setEditing((p) => ({ ...p, phone_number: e.target.value }))}
                    className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>

                {/* Role */}
                <div>
                  <label className="block text-sm font-medium text-stone-700">Role</label>
                  <div className="mt-2 space-y-2">
                    {availableRoles.map((r) => (
                      <label key={r} className="flex items-center gap-3 rounded-lg border border-stone-200 px-3 py-2.5 cursor-pointer hover:bg-stone-50">
                        <input
                          type="radio"
                          name="role"
                          value={r}
                          checked={editing.role === r}
                          onChange={() => setRole(r)}
                          className="accent-stone-900"
                        />
                        <div>
                          <span className="font-medium text-stone-900 capitalize">{r.replace("_", " ")}</span>
                          <p className="text-xs text-stone-500">
                            {r === "platform_admin" ? "Full platform access" :
                             r === "brand_admin" ? "Brand-level admin" :
                             "Pickup and order operations only"}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Brand */}
                {showBrandSelect && (
                  <div>
                    <label className="block text-sm font-medium text-stone-700">Brand</label>
                    <select
                      value={editing.brand_id ?? ""}
                      onChange={(e) => setBrand(e.target.value || null)}
                      className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2.5 text-sm text-stone-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="">No brand (full platform scope)</option>
                      {brands.map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Active toggle (edit only) */}
                {!editing.isNew && (
                  <div className="flex items-center justify-between rounded-lg border border-stone-200 px-4 py-3">
                    <div>
                      <p className="font-medium text-stone-900">Active</p>
                      <p className="text-xs text-stone-500">Deactivated users cannot log in</p>
                    </div>
                    <button
                      onClick={() => setActive(!editing.active)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${editing.active ? "bg-emerald-600" : "bg-stone-300"}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${editing.active ? "translate-x-6" : "translate-x-1"}`} />
                    </button>
                  </div>
                )}

                {/* Permissions */}
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-3">Permissions</label>
                  <div className="space-y-2">
                    {ALL_FLAGS.map((flag) => (
                      <label key={flag} className="flex items-center justify-between rounded-lg border border-stone-200 px-4 py-2.5 hover:bg-stone-50 cursor-pointer">
                        <span className="text-sm text-stone-700">{FLAG_LABELS[flag]}</span>
                        <button
                          type="button"
                          onClick={() => toggleFlag(flag)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${editing.flags[flag] ? "bg-emerald-600" : "bg-stone-300"}`}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${editing.flags[flag] ? "translate-x-6" : "translate-x-1"}`} />
                        </button>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t px-6 py-4">
              <div className="flex justify-end gap-3">
                <button
                  onClick={closePanel}
                  className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || (editing.isNew && (!editing.email?.includes("@") || !editing.password || editing.password.length < 6))}
                  className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50"
                >
                  {saving ? "Saving…" : editing.isNew ? "Create User" : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Password reset modal */}
      {passwordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="w-96 rounded-2xl bg-white p-6 shadow-xl ring-1 ring-stone-200">
            <h3 className="text-lg font-bold text-stone-900">Reset Password</h3>
            {passwordModal.loading ? (
              <div className="mt-4 flex items-center gap-3 text-sm text-stone-500">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-stone-200 border-t-stone-900" />
                Resetting password for {passwordModal.email}...
              </div>
            ) : passwordModal.error ? (
              <div>
                <p className="mt-3 text-sm text-red-600">{passwordModal.error}</p>
                <button onClick={() => setPasswordModal(null)} className="mt-4 w-full rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50">Close</button>
              </div>
            ) : passwordModal.tempPassword ? (
              <div>
                <p className="mt-3 text-sm text-stone-600">Temporary password for <span className="font-medium text-stone-900">{passwordModal.email}</span>:</p>
                <div className="mt-3 flex items-center gap-2 rounded-xl bg-stone-50 p-4 ring-1 ring-stone-200">
                  <span className="font-mono text-lg font-bold text-stone-900 select-all">{passwordModal.tempPassword}</span>
                  <button onClick={copyTempPassword} className="shrink-0 rounded-lg bg-stone-200 px-3 py-1 text-xs font-medium text-stone-700 hover:bg-stone-300">Copy</button>
                </div>
                <p className="mt-2 text-xs text-stone-500">Share this password securely with the user. They will be required to change it on next login.</p>
                <button onClick={() => setPasswordModal(null)} className="mt-4 w-full rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800">Done</button>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Create User Modal */}
      <CreateUserModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleUserCreated}
        brands={brands}
        currentUser={{
          role: currentUser.role,
        }}
      />
    </>
  );
}