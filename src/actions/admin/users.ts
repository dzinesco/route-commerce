"use server";

import "server-only";
import { cookies } from "next/headers";
import { pool, query } from "@/lib/db";
import { getMockTableData, mockBrands } from "@/lib/mock-data";

const useMockData = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true";

export type AdminUserRow = {
  id: string;
  user_id: string | null;
  display_name: string | null;
  email: string;
  phone_number: string | null;
  role: "platform_admin" | "brand_admin" | "store_employee" | "staff";
  brand_id: string | null;
  brand_name: string | null;
  can_manage_products: boolean;
  can_manage_stops: boolean;
  can_manage_orders: boolean;
  can_manage_pickup: boolean;
  can_manage_messages: boolean;
  can_manage_refunds: boolean;
  can_manage_users: boolean;
  can_manage_water_log: boolean;
  can_manage_reports: boolean;
  active: boolean;
  must_change_password: boolean;
  created_at: string;
  last_login: string | null;
};

export type CreateAdminUserInput = {
  email: string;
  password: string;
  role: "platform_admin" | "brand_admin" | "store_employee";
  brand_id: string | null;
  display_name?: string;
  phone_number?: string;
  flags: {
    can_manage_products?: boolean;
    can_manage_stops?: boolean;
    can_manage_orders?: boolean;
    can_manage_pickup?: boolean;
    can_manage_messages?: boolean;
    can_manage_refunds?: boolean;
    can_manage_users?: boolean;
    can_manage_water_log?: boolean;
    can_manage_reports?: boolean;
  };
  mustChangePassword?: boolean;
};

export type UpdateAdminUserInput = {
  id: string;
  role?: "platform_admin" | "brand_admin" | "store_employee";
  brand_id?: string | null;
  flags?: Partial<{
    can_manage_products: boolean;
    can_manage_stops: boolean;
    can_manage_orders: boolean;
    can_manage_pickup: boolean;
    can_manage_messages: boolean;
    can_manage_refunds: boolean;
    can_manage_users: boolean;
    can_manage_water_log: boolean;
    can_manage_reports: boolean;
  }>;
  active?: boolean;
  display_name?: string | null;
  phone_number?: string | null;
};

// ─── Row mapping ────────────────────────────────────────────────────────────
//
// `admin_users` schema (after migration 204 + 034 + 037):
//   id, user_id, display_name, email, phone_number, role, brand_id,
//   can_manage_<X> (BOOLEAN each), active, must_change_password,
//   created_at, last_login, raw_user_meta_data, auth_provider, auth_subject

function mapUserRow(row: Record<string, unknown>): AdminUserRow {
  return {
    id: String(row.id ?? ""),
    user_id: (row.user_id as string | null) ?? null,
    display_name: (row.display_name as string | null) ?? null,
    email: String(row.email ?? ""),
    phone_number: (row.phone_number as string | null) ?? null,
    role: (row.role as AdminUserRow["role"]) ?? "store_employee",
    brand_id: (row.brand_id as string | null) ?? null,
    brand_name: (row.brand_name as string | null) ?? null,
    can_manage_products: Boolean(row.can_manage_products ?? false),
    can_manage_stops: Boolean(row.can_manage_stops ?? false),
    can_manage_orders: Boolean(row.can_manage_orders ?? false),
    can_manage_pickup: Boolean(row.can_manage_pickup ?? false),
    can_manage_messages: Boolean(row.can_manage_messages ?? false),
    can_manage_refunds: Boolean(row.can_manage_refunds ?? false),
    can_manage_users: Boolean(row.can_manage_users ?? false),
    can_manage_water_log: Boolean(row.can_manage_water_log ?? false),
    can_manage_reports: Boolean(row.can_manage_reports ?? false),
    active: Boolean(row.active ?? true),
    must_change_password: Boolean(row.must_change_password ?? false),
    created_at: String(row.created_at ?? ""),
    last_login: (row.last_login as string | null) ?? null,
  };
}

// ─── Welcome email (best-effort) ────────────────────────────────────────────

async function sendWelcomeEmailSafe(input: {
  to: string;
  name: string;
  role: "platform_admin" | "brand_admin" | "store_employee";
  password: string;
}): Promise<void> {
  try {
    const { sendWelcomeEmail } = await import("@/lib/email-service");
    const emailRole = input.role === "platform_admin" ? "brand_admin" : input.role;
    await sendWelcomeEmail({
      to: input.to,
      name: input.name,
      role: emailRole as "brand_admin" | "wholesale_buyer" | "store_employee",
      brandName: "Tuxedo Corn",
      tempPassword: input.password,
    });
  } catch {
    // welcome email is best-effort; never block user creation
  }
}

// ─── Public actions ─────────────────────────────────────────────────────────

export async function getAdminUsers(brandId?: string): Promise<{ users: AdminUserRow[]; error: string | null }> {
  if (useMockData) {
    const mockUsers = getMockTableData("users") as AdminUserRow[];
    return {
      users: brandId ? mockUsers.filter((u) => u.brand_id === brandId) : mockUsers,
      error: null,
    };
  }

  try {
    const sql = brandId
      ? `SELECT au.id, au.user_id, au.display_name, au.email, au.phone_number,
               au.role, au.brand_id, b.name AS brand_name,
               au.can_manage_products, au.can_manage_stops, au.can_manage_orders,
               au.can_manage_pickup, au.can_manage_messages, au.can_manage_refunds,
               au.can_manage_users, au.can_manage_water_log, au.can_manage_reports,
               au.active, au.must_change_password, au.created_at, au.last_login
           FROM admin_users au
           LEFT JOIN brands b ON b.id = au.brand_id
           WHERE au.brand_id = $1
           ORDER BY au.created_at DESC`
      : `SELECT au.id, au.user_id, au.display_name, au.email, au.phone_number,
               au.role, au.brand_id, b.name AS brand_name,
               au.can_manage_products, au.can_manage_stops, au.can_manage_orders,
               au.can_manage_pickup, au.can_manage_messages, au.can_manage_refunds,
               au.can_manage_users, au.can_manage_water_log, au.can_manage_reports,
               au.active, au.must_change_password, au.created_at, au.last_login
           FROM admin_users au
           LEFT JOIN brands b ON b.id = au.brand_id
           ORDER BY au.created_at DESC`;
    const { rows } = await query<Record<string, unknown>>(sql, brandId ? [brandId] : []);
    return { users: rows.map(mapUserRow), error: null };
  } catch (err) {
    return { users: [], error: err instanceof Error ? err.message : String(err) };
  }
}

export async function createAdminUser(input: CreateAdminUserInput): Promise<{ user: AdminUserRow | null; error: string | null }> {
  if (useMockData) {
    const mockUsers = getMockTableData("users") as AdminUserRow[];
    const newRow: AdminUserRow = {
      id: `mock-${Date.now()}`,
      user_id: null,
      display_name: input.display_name ?? input.email.split("@")[0],
      email: input.email,
      phone_number: input.phone_number ?? null,
      role: input.role,
      brand_id: input.brand_id,
      brand_name: null,
      can_manage_products: input.flags.can_manage_products ?? false,
      can_manage_stops: input.flags.can_manage_stops ?? false,
      can_manage_orders: input.flags.can_manage_orders ?? false,
      can_manage_pickup: input.flags.can_manage_pickup ?? false,
      can_manage_messages: input.flags.can_manage_messages ?? false,
      can_manage_refunds: input.flags.can_manage_refunds ?? false,
      can_manage_users: input.flags.can_manage_users ?? false,
      can_manage_water_log: input.flags.can_manage_water_log ?? false,
      can_manage_reports: input.flags.can_manage_reports ?? false,
      active: true,
      must_change_password: input.mustChangePassword ?? true,
      created_at: new Date().toISOString(),
      last_login: null,
    };
    mockUsers.push(newRow);
    return { user: newRow, error: null };
  }

  try {
    // No Supabase Auth — `user_id` stays NULL until the user signs in
    // via Auth.js and `get_admin_user_for_session` matches them by
    // `auth_subject` / `email`. We just insert the row.
    const f = input.flags;
    const { rows } = await query<Record<string, unknown>>(
      `INSERT INTO admin_users
         (user_id, display_name, email, phone_number, role, brand_id,
          can_manage_products, can_manage_stops, can_manage_orders,
          can_manage_pickup, can_manage_messages, can_manage_refunds,
          can_manage_users, can_manage_water_log, can_manage_reports,
          active, must_change_password, auth_provider, auth_subject)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,true,$16,'pending',$17)
       RETURNING id, user_id, display_name, email, phone_number, role, brand_id,
                 can_manage_products, can_manage_stops, can_manage_orders,
                 can_manage_pickup, can_manage_messages, can_manage_refunds,
                 can_manage_users, can_manage_water_log, can_manage_reports,
                 active, must_change_password, created_at, last_login`,
      [
        null,
        input.display_name ?? input.email.split("@")[0],
        input.email.toLowerCase(),
        input.phone_number ?? null,
        input.role,
        input.brand_id,
        f.can_manage_products ?? false,
        f.can_manage_stops ?? false,
        f.can_manage_orders ?? false,
        f.can_manage_pickup ?? false,
        f.can_manage_messages ?? false,
        f.can_manage_refunds ?? false,
        f.can_manage_users ?? false,
        f.can_manage_water_log ?? false,
        f.can_manage_reports ?? false,
        input.mustChangePassword ?? true,
        input.email.toLowerCase(),
      ],
    );
    if (!rows[0]) return { user: null, error: "Insert returned no row" };

    await sendWelcomeEmailSafe({
      to: input.email,
      name: input.display_name ?? input.email.split("@")[0],
      role: input.role,
      password: input.password,
    });

    return { user: mapUserRow(rows[0]), error: null };
  } catch (err) {
    return { user: null, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function updateAdminUser(input: UpdateAdminUserInput): Promise<{ user: AdminUserRow | null; error: string | null }> {
  if (useMockData) {
    const mockUsers = getMockTableData("users") as AdminUserRow[];
    const idx = mockUsers.findIndex((u) => u.id === input.id);
    if (idx === -1) return { user: null, error: "User not found" };
    const merged: AdminUserRow = { ...mockUsers[idx] };
    if (input.role !== undefined) merged.role = input.role;
    if (input.brand_id !== undefined) merged.brand_id = input.brand_id;
    if (input.active !== undefined) merged.active = input.active;
    if (input.display_name !== undefined) merged.display_name = input.display_name;
    if (input.phone_number !== undefined) merged.phone_number = input.phone_number;
    if (input.flags) {
      for (const [k, v] of Object.entries(input.flags)) {
        if (v !== undefined) (merged as Record<string, unknown>)[k] = v;
      }
    }
    mockUsers[idx] = merged;
    return { user: merged, error: null };
  }

  try {
    // Build a partial SET clause. Each `can_manage_*` column is set
    // individually — the input's `flags` partial is spread across them.
    const sets: string[] = [];
    const params: unknown[] = [];
    const push = (col: string, val: unknown) => { params.push(val); sets.push(`${col} = $${params.length}`); };

    if (input.role !== undefined) push("role", input.role);
    if (input.brand_id !== undefined) push("brand_id", input.brand_id);
    if (input.active !== undefined) push("active", input.active);
    if (input.display_name !== undefined) push("display_name", input.display_name);
    if (input.phone_number !== undefined) push("phone_number", input.phone_number);
    if (input.flags) {
      for (const [key, val] of Object.entries(input.flags)) {
        if (val !== undefined) push(key, val);
      }
    }
    if (sets.length === 0) return { user: null, error: "Nothing to update" };

    params.push(input.id);
    const sql = `UPDATE admin_users SET ${sets.join(", ")}
                 WHERE id = $${params.length}
                 RETURNING id, user_id, display_name, email, phone_number, role, brand_id,
                           can_manage_products, can_manage_stops, can_manage_orders,
                           can_manage_pickup, can_manage_messages, can_manage_refunds,
                           can_manage_users, can_manage_water_log, can_manage_reports,
                           active, must_change_password, created_at, last_login`;
    const { rows } = await query<Record<string, unknown>>(sql, params);
    if (!rows[0]) return { user: null, error: "User not found" };
    return { user: mapUserRow(rows[0]), error: null };
  } catch (err) {
    return { user: null, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function deleteAdminUser(id: string): Promise<{ success: boolean; error: string | null }> {
  if (useMockData) {
    const mockUsers = getMockTableData("users") as AdminUserRow[];
    const idx = mockUsers.findIndex((u) => u.id === id);
    if (idx === -1) return { success: false, error: "User not found" };
    mockUsers.splice(idx, 1);
    return { success: true, error: null };
  }

  try {
    // No Supabase Auth — nothing to delete from the auth service.
    const { rowCount } = await query(`DELETE FROM admin_users WHERE id = $1`, [id]);
    return { success: (rowCount ?? 0) > 0, error: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function setMustChangePassword(userId: string): Promise<{ success: boolean; error: string | null }> {
  if (useMockData) {
    const mockUsers = getMockTableData("users") as AdminUserRow[];
    const u = mockUsers.find((m) => m.id === userId);
    if (!u) return { success: false, error: "User not found" };
    u.must_change_password = true;
    return { success: true, error: null };
  }

  try {
    const { rowCount } = await query(
      `UPDATE admin_users SET must_change_password = true WHERE id = $1`,
      [userId],
    );
    return { success: (rowCount ?? 0) > 0, error: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * No auth service anymore (no Supabase, no Auth.js password-reset
 * endpoint). A platform admin can reset access by deleting +
 * re-creating the user, or by toggling `must_change_password` via the
 * UI — the function is preserved as a no-op so call sites keep
 * compiling.
 */
export async function sendPasswordResetEmail(_email: string): Promise<{ success: boolean; error: string | null }> {
  return {
    success: false,
    error: "Password reset is handled by a platform admin. Contact them to reset your access.",
  };
}

export async function getBrands(): Promise<{ brands: { id: string; name: string }[]; error: string | null }> {
  if (useMockData) {
    return { brands: mockBrands.map((b) => ({ id: b.id, name: b.name })), error: null };
  }
  try {
    const { rows } = await query<{ id: string; name: string }>(
      `SELECT id, name FROM brands ORDER BY name`,
    );
    return { brands: rows, error: null };
  } catch (err) {
    return { brands: [], error: err instanceof Error ? err.message : String(err) };
  }
}

// Keep `pool` reachable so bundlers don't tree-shake the import — the
// import is for the `server-only` side effect.
void pool;
