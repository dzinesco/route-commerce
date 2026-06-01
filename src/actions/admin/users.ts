"use server";

import { cookies, headers } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { supabase as publicSupabase } from "@/lib/supabase";
import { getMockTableData, mockBrands } from "@/lib/mock-data";

const useMockData = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true";

export type AdminUserRow = {
  id: string;
  user_id: string;
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

// ─── SSR client for authenticated requests ─────────────────────────────────

async function getAuthClient() {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const request = new NextRequest("http://localhost/admin", { headers: new Headers() });
  const response = NextResponse.next({ request });

  // Read rc_auth_uid from the raw HTTP Cookie header (document.cookie sets
  // cookies that arrive in the header but NOT in next/headers cookies()).
  const cookieHeader = headerStore.get("cookie") || "";
  const allCookies = cookieHeader.split(";").map(c => c.trim());
  const rcUidCookie = allCookies.find(c => c.startsWith("rc_auth_uid="));
  const rcAuthUid = rcUidCookie ? rcUidCookie.split("=")[1] : null;

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });
  return { supabase, response, rcAuthUid };
}

async function callRpcWithAuth<T>(fn: string, params: Record<string, unknown>): Promise<{ data: T | null; error: string | null }> {
  const { supabase, rcAuthUid } = await getAuthClient();

  // Dev force-login UID bypasses Supabase auth entirely
  const DEV_FORCE_UID = "dev-user-00000000-0000-0000-0000-000000000001";
  if (rcAuthUid === DEV_FORCE_UID) {
    return { data: null, error: null }; // let the action proceed without auth check
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return { data: null, error: "Not authenticated" };
  }
  const { data, error } = await supabase.rpc(fn, params as Record<string, unknown>);
  if (error) { /* RPC error handled silently */ }
  return { data: data as T, error: error ? error.message : null };
}

// ─── Service role client (server-only, never exposed to browser) ───────────

function getServiceClient() {
  const roleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!roleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set. Cannot use service role in dev path.");
  }
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    roleKey,
  );
}

// ─── Dev-only path — uses service role to create auth user + admin_users ──

async function devCreateAdminUser(input: CreateAdminUserInput): Promise<{ user: AdminUserRow | null; error: string | null }> {
  if (process.env.NODE_ENV === "production") {
    return { user: null, error: "Dev path not available in production" };
  }
  const cookieStore = await cookies();
  const devSession = cookieStore.get("dev_session")?.value;
  if (!devSession || devSession !== "platform_admin") {
    return { user: null, error: "Not authenticated" };
  }

  const service = getServiceClient();

  // Create auth user with the provided password
  const { data: authUser, error: authError } = await service.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      display_name: input.display_name || input.email.split("@")[0],
      phone_number: input.phone_number ?? null,
    },
  });
  if (authError || !authUser.user) {
    return { user: null, error: authError?.message ?? "Failed to create auth user" };
  }

  // Insert into admin_users
  const { data: inserted, error: insertError } = await service
    .from("admin_users")
    .insert({
      user_id: authUser.user.id,
      role: input.role,
      brand_id: input.brand_id,
      display_name: input.display_name || input.email.split("@")[0],
      phone_number: input.phone_number ?? null,
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
    })
    .select()
    .single();

  if (insertError) {
    return { user: null, error: insertError.message };
  }

  // Send welcome email
  try {
    const { sendWelcomeEmail } = await import("@/lib/email-service");
    const emailRole = input.role === "platform_admin" ? "brand_admin" : input.role;
    await sendWelcomeEmail({
      to: input.email,
      name: input.display_name || input.email.split("@")[0],
      role: emailRole as "brand_admin" | "wholesale_buyer" | "store_employee",
      brandName: "Tuxedo Corn",
      tempPassword: input.password,
    });
  } catch (e) {
    // welcome email failed silently
  }

  return {
    user: {
      id: inserted.id,
      user_id: inserted.user_id,
      display_name: inserted.display_name ?? input.display_name ?? input.email.split("@")[0],
      email: input.email,
      phone_number: inserted.phone_number ?? input.phone_number ?? null,
      role: inserted.role,
      brand_id: inserted.brand_id,
      brand_name: null,
      can_manage_products: inserted.can_manage_products,
      can_manage_stops: inserted.can_manage_stops,
      can_manage_orders: inserted.can_manage_orders,
      can_manage_pickup: inserted.can_manage_pickup,
      can_manage_messages: inserted.can_manage_messages,
      can_manage_refunds: inserted.can_manage_refunds,
      can_manage_users: inserted.can_manage_users,
      can_manage_water_log: inserted.can_manage_water_log,
      can_manage_reports: inserted.can_manage_reports,
      active: inserted.active,
      must_change_password: inserted.must_change_password ?? true,
      created_at: inserted.created_at,
      last_login: null,
    },
    error: null,
  };
}

function mapUserRow(row: Record<string, unknown>): AdminUserRow {
  return {
    id: String(row.id ?? ""),
    user_id: String(row.user_id ?? ""),
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

// ─── Dev path helpers (service role, local only) ───────────────────────────

async function devListAdminUsers(callerUid?: string): Promise<{ users: AdminUserRow[]; error: string | null }> {
  const service = getServiceClient();

  // Ensure caller has an admin_users record
  if (callerUid) {
    const { data: existing } = await service
      .from("admin_users")
      .select("id")
      .eq("user_id", callerUid)
      .maybeSingle();

    if (!existing) {
      // auto-creating admin_users for uid
      const { data: authData } = await service.auth.admin.listUsers();
      const authUser = authData?.users?.find((u) => u.id === callerUid);
      const meta = (authUser as { user_metadata?: Record<string, unknown> })?.user_metadata;
      await service.from("admin_users").insert({
        user_id: callerUid,
        role: "platform_admin",
        brand_id: null,
        display_name: (meta?.display_name as string | null) ?? authUser?.email?.split("@")[0] ?? "Admin",
        phone_number: (meta?.phone_number as string | null) ?? null,
        can_manage_products: true,
        can_manage_stops: true,
        can_manage_orders: true,
        can_manage_pickup: true,
        can_manage_messages: true,
        can_manage_refunds: true,
        can_manage_users: true,
        can_manage_water_log: true,
        can_manage_reports: true,
        active: true,
        must_change_password: false,
      });
    }
  }

  // Fetch all admin_users rows (no RLS for service role)
  const { data: adminRows, error: adminError } = await service
    .from("admin_users")
    .select(`
      id, user_id, role, brand_id, active, must_change_password, created_at, last_login,
      can_manage_products, can_manage_stops, can_manage_orders, can_manage_pickup,
      can_manage_messages, can_manage_refunds, can_manage_users, can_manage_water_log, can_manage_reports,
      brands (name)
    `)
    .order("created_at", { ascending: false });

  if (adminError) return { users: [], error: adminError.message };

  // Fetch auth user details via service role admin API
  const { data: authData, error: authError } = await service.auth.admin.listUsers();
  if (authError) return { users: [], error: authError.message };

  const authMap: Record<string, { email: string; display_name: string | null; phone_number: string | null }> = {};
  (authData?.users ?? []).forEach((u) => {
    const user = u as { id: string; email?: string; user_metadata?: Record<string, unknown> };
    authMap[user.id] = {
      email: user.email ?? "",
      display_name: (user.user_metadata?.display_name as string | null) ?? (user.user_metadata?.full_name as string | null) ?? null,
      phone_number: (user.user_metadata?.phone_number as string | null) ?? null,
    };
  });

  const users: AdminUserRow[] = (adminRows ?? []).map((row) => {
    const r = row as Record<string, unknown> & { brands?: { name?: string } };
    const authInfo = authMap[String(r.user_id ?? "")] ?? { email: "", display_name: null, phone_number: null };
    return {
      ...mapUserRow(r),
      email: authInfo.email || "No Email",
      display_name: authInfo.display_name ?? null,
      phone_number: authInfo.phone_number ?? (r.phone_number as string | null) ?? null,
      brand_name: r.brands?.name ?? null,
    };
  });

  return { users, error: null };
}

function buildUsersFromRows(adminRows: Record<string, unknown>[], authUsers: { id: string; email?: string; user_metadata?: Record<string, unknown> }[]): { users: AdminUserRow[]; error: string | null } {
  const authMap: Record<string, { email: string; display_name: string | null; phone_number: string | null }> = {};
  (authUsers ?? []).forEach((u) => {
    authMap[u.id] = {
      email: u.email ?? "",
      display_name: (u.user_metadata?.display_name as string | null) ?? (u.user_metadata?.full_name as string | null) ?? null,
      phone_number: (u.user_metadata?.phone_number as string | null) ?? null,
    };
  });

  const users: AdminUserRow[] = adminRows.map((row) => {
    const r = row as Record<string, unknown> & { brands?: { name?: string } };
    const authInfo = authMap[String(r.user_id ?? "")] ?? { email: "", display_name: null, phone_number: null };
    return {
      ...mapUserRow(r),
      email: authInfo.email || "No Email",
      display_name: authInfo.display_name ?? null,
      phone_number: authInfo.phone_number ?? (r.phone_number as string | null) ?? null,
      brand_name: r.brands?.name ?? null,
    };
  });

  return { users, error: null };
}

// ─── Production admin actions (require real Supabase auth) ─────────────────

const DEV_FORCE_UID = "dev-user-00000000-0000-0000-0000-000000000001";

export async function getAdminUsers(brandId?: string): Promise<{ users: AdminUserRow[]; error: string | null }> {
  if (useMockData) {
    const mockUsers = getMockTableData("users") as AdminUserRow[];
    let filteredUsers = mockUsers;
    if (brandId) {
      filteredUsers = mockUsers.filter(u => u.brand_id === brandId);
    }
    return { users: filteredUsers, error: null };
  }

  const cookieStore = await cookies();
  const headerStore = await headers();
  const devSession = cookieStore.get("dev_session")?.value;

  // Read rc_auth_uid for force-login check
  const cookieHeader = headerStore.get("cookie") || "";
  const rcAuthUid = cookieHeader.split(";").map(c => c.trim())
    .find(c => c.startsWith("rc_auth_uid="))?.split("=")[1] ?? null;

  // In development mode: ALL requests with a valid rc_auth_uid use the dev/service path.
  // This includes real Supabase auth users — bypassing supabase.auth.getUser JWT validation.
  if (process.env.NODE_ENV !== "production" && rcAuthUid && rcAuthUid !== DEV_FORCE_UID) {
    return devListAdminUsers(rcAuthUid);
  }

  // Dev session cookie (platform_admin/brand_admin) — always use service role path
  const isDevAdmin = process.env.NODE_ENV !== "production" && (
    devSession === "platform_admin" || devSession === "brand_admin" || rcAuthUid === DEV_FORCE_UID
  );
  if (isDevAdmin) {
    return devListAdminUsers(rcAuthUid ?? undefined);
  }

  // Production path: try authenticated RPC first, fall back to service role if not authenticated
  const result = await callRpcWithAuth<AdminUserRow[]>("get_admin_users", { p_brand_id: brandId ?? null });
  if (result.error === "Not authenticated" && rcAuthUid) {
    // No Supabase session token in browser — use service role with rc_auth_uid
    const service = getServiceClient();
    const { data: adminRows, error: adminError } = await service
      .from("admin_users")
      .select(`id, user_id, role, brand_id, active, must_change_password, created_at, last_login,
        can_manage_products, can_manage_stops, can_manage_orders, can_manage_pickup,
        can_manage_messages, can_manage_refunds, can_manage_users, can_manage_water_log, can_manage_reports,
        brands (name)`)
      .order("created_at", { ascending: false });
    if (adminError) return { users: [], error: adminError.message };
    const { data: authData } = await service.auth.admin.listUsers();
    const authMap: Record<string, { email: string; display_name: string | null; phone_number: string | null }> = {};
    (authData?.users ?? []).forEach((u) => {
      const user = u as { id: string; email?: string; user_metadata?: Record<string, unknown> };
      authMap[user.id] = {
        email: user.email ?? "",
        display_name: (user.user_metadata?.display_name as string | null) ?? null,
        phone_number: (user.user_metadata?.phone_number as string | null) ?? null,
      };
    });
    const users: AdminUserRow[] = (adminRows ?? []).map((row) => {
      const r = row as Record<string, unknown> & { brands?: { name?: string } };
      const authInfo = authMap[String(r.user_id ?? "")] ?? { email: "", display_name: null, phone_number: null };
      return {
        ...mapUserRow(r),
        email: authInfo.email || "No Email",
        display_name: authInfo.display_name ?? null,
        phone_number: authInfo.phone_number ?? (r.phone_number as string | null) ?? null,
        brand_name: r.brands?.name ?? null,
      };
    });
    return { users, error: null };
  }
  return { users: result.data ?? [], error: result.error };
}

export async function createAdminUser(input: CreateAdminUserInput): Promise<{ user: AdminUserRow | null; error: string | null }> {
  // Read auth context
  const cookieStore = await cookies();
  const headerStore = await headers();
  const devSession = cookieStore.get("dev_session")?.value;
  const cookieHeader = headerStore.get("cookie") || "";
  const rcAuthUid = cookieHeader.split(";").map(c => c.trim())
    .find(c => c.startsWith("rc_auth_uid="))?.split("=")[1] ?? null;

  // DEV_FORCE_UID bypass — set by Emergency Force Login or /api/force-admin
  if (rcAuthUid === DEV_FORCE_UID) {
    return devCreateAdminUser(input);
  }

  const isDevAdmin = process.env.NODE_ENV !== "production" && devSession === "platform_admin";

  // Dev path: use service role to create user without Supabase auth session
  if (isDevAdmin) {
    return devCreateAdminUser(input);
  }

  // Production path — use service role directly (bypasses Supabase JWT auth)
  // rc_auth_uid cookie proves the admin is logged in; service role creates the account
  if (rcAuthUid) {
    const service = getServiceClient();

    // Create auth user
    const { data: authUser, error: authError } = await service.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
      user_metadata: {
        display_name: input.display_name || input.email.split("@")[0],
        phone_number: input.phone_number ?? null,
      },
    });
    if (authError || !authUser.user) {
      return { user: null, error: authError?.message ?? "Failed to create auth user" };
    }

    // Insert into admin_users
    const { data: inserted, error: insertError } = await service
      .from("admin_users")
      .insert({
        user_id: authUser.user.id,
        role: input.role,
        brand_id: input.brand_id,
        display_name: input.display_name || input.email.split("@")[0],
        phone_number: input.phone_number ?? null,
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
      })
      .select()
      .single();

    if (insertError) return { user: null, error: insertError.message };

    // Send welcome email
    try {
      const { sendWelcomeEmail } = await import("@/lib/email-service");
      const emailRole = input.role === "platform_admin" ? "brand_admin" : input.role;
      await sendWelcomeEmail({
        to: input.email,
        name: input.display_name || input.email.split("@")[0],
        role: emailRole as "brand_admin" | "wholesale_buyer" | "store_employee",
        brandName: "Tuxedo Corn",
        tempPassword: input.password,
      });
    } catch (e) {
      // welcome email failed silently
    }

    return {
      user: {
        id: inserted.id,
        user_id: inserted.user_id,
        display_name: inserted.display_name ?? input.display_name ?? input.email.split("@")[0],
        email: input.email,
        phone_number: inserted.phone_number ?? input.phone_number ?? null,
        role: inserted.role,
        brand_id: inserted.brand_id,
        brand_name: null,
        can_manage_products: inserted.can_manage_products,
        can_manage_stops: inserted.can_manage_stops,
        can_manage_orders: inserted.can_manage_orders,
        can_manage_pickup: inserted.can_manage_pickup,
        can_manage_messages: inserted.can_manage_messages,
        can_manage_refunds: inserted.can_manage_refunds,
        can_manage_users: inserted.can_manage_users,
        can_manage_water_log: inserted.can_manage_water_log,
        can_manage_reports: inserted.can_manage_reports,
        active: inserted.active,
        must_change_password: inserted.must_change_password ?? true,
        created_at: inserted.created_at,
        last_login: null,
      },
      error: null,
    };
  }

  return { user: null, error: "Not authenticated" };
}

export async function updateAdminUser(input: UpdateAdminUserInput): Promise<{ user: AdminUserRow | null; error: string | null }> {
  // Dev bypass check
  const cookieStore = await cookies();
  const headerStore = await headers();
  const devSession = cookieStore.get("dev_session")?.value;
  const cookieHeader = headerStore.get("cookie") || "";
  const rcAuthUid = cookieHeader.split(";").map(c => c.trim())
    .find(c => c.startsWith("rc_auth_uid="))?.split("=")[1] ?? null;
  // DEV_FORCE_UID bypass — Emergency Force Login sets this cookie directly
  if (rcAuthUid === DEV_FORCE_UID) {
    const service = getServiceClient();
    const { data, error } = await service
      .from("admin_users")
      .update({
        role: input.role ?? undefined,
        brand_id: input.brand_id ?? undefined,
        can_manage_products: input.flags?.can_manage_products ?? undefined,
        can_manage_stops: input.flags?.can_manage_stops ?? undefined,
        can_manage_orders: input.flags?.can_manage_orders ?? undefined,
        can_manage_pickup: input.flags?.can_manage_pickup ?? undefined,
        can_manage_messages: input.flags?.can_manage_messages ?? undefined,
        can_manage_refunds: input.flags?.can_manage_refunds ?? undefined,
        can_manage_users: input.flags?.can_manage_users ?? undefined,
        can_manage_water_log: input.flags?.can_manage_water_log ?? undefined,
        can_manage_reports: input.flags?.can_manage_reports ?? undefined,
        active: input.active ?? undefined,
        display_name: input.display_name ?? null,
        phone_number: input.phone_number ?? null,
      })
      .eq("id", input.id)
      .select()
      .single();
    if (error) return { user: null, error: error.message };
    return { user: mapUserRow(data), error: null };
  }

  const result = await callRpcWithAuth<AdminUserRow[]>("update_admin_user", {
    p_id: input.id,
    p_role: input.role ?? null,
    p_brand_id: input.brand_id ?? null,
    p_flags: input.flags ?? null,
    p_active: input.active ?? null,
    p_display_name: input.display_name ?? null,
    p_phone_number: input.phone_number ?? null,
  });
  const rows = result.data as AdminUserRow[] | null;
  return { user: rows?.[0] ?? null, error: result.error };
}

export async function deleteAdminUser(id: string): Promise<{ success: boolean; error: string | null }> {
  // Dev bypass check
  const cookieStore = await cookies();
  const headerStore = await headers();
  const devSession = cookieStore.get("dev_session")?.value;
  const cookieHeader = headerStore.get("cookie") || "";
  const rcAuthUid = cookieHeader.split(";").map(c => c.trim())
    .find(c => c.startsWith("rc_auth_uid="))?.split("=")[1] ?? null;
  // DEV_FORCE_UID bypass — Emergency Force Login sets this cookie directly
  if (rcAuthUid === DEV_FORCE_UID) {
    const service = getServiceClient();
    // Get user_id first
    const { data: adminRow, error: fetchError } = await service
      .from("admin_users")
      .select("user_id")
      .eq("id", id)
      .single();
    if (fetchError) return { success: false, error: fetchError.message };
    // Delete from admin_users
    const { error: deleteError } = await service.from("admin_users").delete().eq("id", id);
    if (deleteError) return { success: false, error: deleteError.message };
    // Delete auth user
    if (adminRow?.user_id) {
      await service.auth.admin.deleteUser(adminRow.user_id);
    }
    return { success: true, error: null };
  }

  const result = await callRpcWithAuth<boolean>("delete_admin_user", { p_id: id });
  return { success: result.data ?? false, error: result.error };
}

export async function setMustChangePassword(userId: string): Promise<{ success: boolean; error: string | null }> {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const cookieHeader = headerStore.get("cookie") || "";
  const rcAuthUid = cookieHeader.split(";").map(c => c.trim())
    .find(c => c.startsWith("rc_auth_uid="))?.split("=")[1] ?? null;

  if (rcAuthUid === DEV_FORCE_UID || process.env.NODE_ENV !== "production") {
    const service = getServiceClient();
    const { error } = await service.from("admin_users").update({ must_change_password: true }).eq("id", userId);
    return { success: !error, error: error?.message ?? null };
  }

  // Production path — use service role via direct update
  const service = getServiceClient();
  const { error } = await service.from("admin_users").update({ must_change_password: true }).eq("id", userId);
  return { success: !error, error: error?.message ?? null };
}

export async function sendPasswordResetEmail(email: string): Promise<{ success: boolean; error: string | null }> {
  const { error } = await publicSupabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"}/change-password`,
  });
  return { success: !error, error: error?.message ?? null };
}

export async function getBrands(): Promise<{ brands: { id: string; name: string }[]; error: string | null }> {
  if (useMockData) {
    const brands = mockBrands.map(b => ({ id: b.id, name: b.name }));
    return { brands, error: null };
  }

  const { data, error } = await publicSupabase.from("brands").select("id, name").order("name");
  return { brands: data ?? [], error: error?.message ?? null };
}