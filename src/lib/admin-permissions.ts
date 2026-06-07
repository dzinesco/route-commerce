import "server-only";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { withPlatformAdmin } from "@/db/client";
import { users, tenants, tenantUsers } from "@/db/schema";
import type { AdminRole, AdminUser, TenantContext } from "@/lib/admin-permissions-types";

/**
 * Source of truth for the current admin user.
 *
 * Looks up the Auth.js v5 session, then resolves the user + tenant
 * from the `users` and `tenant_users` tables.
 *
 * Returns `null` if:
 *   - No Auth.js session (caller not signed in)
 *   - The session email doesn't match any `users.email`
 *   - The user has no `tenant_users` row (not provisioned yet)
 *
 * Provisioning: an admin must run
 *   INSERT INTO users (email, ...) VALUES (...)
 *   INSERT INTO tenant_users (tenant_id, user_id, role) VALUES (...)
 * to grant a Google-sign-in user admin access. Until provisioned, the
 * layout shows "Access Denied" — correct behavior.
 *
 * The previous `dev_session` cookie bypass has been removed. The only
 * way into the admin is through real Auth.js (Google in production;
 * for local dev, configure `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`).
 */
export async function getAdminUser(): Promise<AdminUser | null> {
  let sessionEmail: string | null = null;
  try {
    const session = await auth();
    sessionEmail = session?.user?.email ?? null;
  } catch (err) {
    console.error("[admin-permissions] auth() failed:", err);
    return null;
  }

  if (!sessionEmail) return null;

  return await withPlatformAdmin(async (db) => {
    const userRows = await db
      .select()
      .from(users)
      .where(eq(users.email, sessionEmail))
      .limit(1);
    const user = userRows[0];
    if (!user) return null;

    const membershipRows = await db
      .select({
        tenantId: tenants.id,
        tenantName: tenants.name,
        tenantSlug: tenants.slug,
        tenantStatus: tenants.status,
        role: tenantUsers.role,
      })
      .from(tenantUsers)
      .innerJoin(tenants, eq(tenants.id, tenantUsers.tenantId))
      .where(eq(tenantUsers.userId, user.id))
      .limit(1);

    if (membershipRows.length === 0) {
      // Signed in but not provisioned for any tenant.
      return null;
    }

    const m = membershipRows[0];
    const role = m.role as AdminRole;
    return buildAdminUser({
      id: user.id,
      email: user.email,
      displayName: user.name,
      authProvider: user.authProvider,
      tenantId: m.tenantId,
      tenantSlug: m.tenantSlug,
      tenantName: m.tenantName,
      role,
      active: true,
    });
  });
}

/**
 * Resolves the current admin user AND their tenant. Returns `null` if
 * the user is not signed in or has no tenant. For platform_admin (no
 * tenant), `tenant` is `null` and callers should use `withPlatformAdmin`
 * to query across all tenants.
 */
export async function getCurrentTenant(): Promise<TenantContext | null> {
  const user = await getAdminUser();
  if (!user) return null;
  if (!user.tenant_id) {
    // platform_admin — no specific tenant
    return null;
  }
  return {
    user,
    tenant: {
      id: user.tenant_id,
      name: user.display_name ?? user.tenant_slug ?? "Unknown",
      slug: user.tenant_slug ?? "unknown",
      status: "active",
    },
  };
}

// ────────────────────────────────────────────────────────────────────────
// Re-exports for backward compat
// ────────────────────────────────────────────────────────────────────────

export type { AdminUser, AdminRole, TenantContext } from "@/lib/admin-permissions-types";

/**
 * @deprecated Kept for unit tests that exercise the dev shim path.
 * Production code should never call this — `getAdminUser()` only reads
 * the Auth.js session now.
 */
export function buildDevAdmin(role: AdminRole): AdminUser {
  const isPlatform = role === "platform_admin";
  const tenantId = isPlatform ? null : "dev-tenant";
  return {
    id: "dev",
    user_id: "dev",
    email: null,
    display_name: "Demo Admin",
    tenant_id: tenantId,
    brand_id: tenantId, // legacy alias
    brand_ids: tenantId ? [tenantId] : [], // legacy array alias
    tenant_slug: isPlatform ? null : "tuxedo",
    role,
    active: true,
    auth_provider: "dev",
    ...permissionsForRole(role),
    must_change_password: false,
  };
}

function buildAdminUser(input: {
  id: string;
  email: string | null;
  displayName: string | null;
  authProvider: "dev" | "google" | "email" | null;
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  role: AdminRole;
  active: boolean;
}): AdminUser {
  return {
    id: input.id,
    user_id: input.id,
    email: input.email,
    display_name: input.displayName,
    tenant_id: input.tenantId,
    brand_id: input.tenantId, // legacy alias
    brand_ids: [input.tenantId], // legacy array alias
    tenant_slug: input.tenantSlug,
    role: input.role,
    active: input.active,
    auth_provider: input.authProvider,
    ...permissionsForRole(input.role),
  };
}

/**
 * Single source of truth for "what can a role do". Used by both the
 * dev shim and the real user lookup so the demo and the real thing
 * behave identically.
 */
export function permissionsForRole(role: AdminRole) {
  if (role === "platform_admin") {
    return {
      can_manage_products: true,
      can_manage_stops: true,
      can_manage_orders: true,
      can_manage_pickup: true,
      can_manage_messages: true,
      can_manage_refunds: true,
      can_manage_users: true,
      can_manage_water_log: true,
      can_manage_reports: true,
      can_manage_settings: true,
      can_manage_billing: true,
      can_manage_branding: true,
      can_manage_marketing: true,
      can_manage_team: true,
    };
  }
  if (role === "brand_admin") {
    return {
      can_manage_products: true,
      can_manage_stops: true,
      can_manage_orders: true,
      can_manage_pickup: true,
      can_manage_messages: true,
      can_manage_refunds: true,
      can_manage_users: false,
      can_manage_water_log: true,
      can_manage_reports: true,
      can_manage_settings: true,
      can_manage_billing: true,
      can_manage_branding: true,
      can_manage_marketing: true,
      can_manage_team: true,
    };
  }
  // store_employee
  return {
    can_manage_products: false,
    can_manage_stops: false,
    can_manage_orders: true,
    can_manage_pickup: true,
    can_manage_messages: false,
    can_manage_refunds: false,
    can_manage_users: false,
    can_manage_water_log: false,
    can_manage_reports: false,
    can_manage_settings: false,
    can_manage_billing: false,
    can_manage_branding: false,
    can_manage_marketing: false,
    can_manage_team: false,
  };
}
