// Shared AdminUser type — safe to import from both server and client
// components. The shape mirrors what `getAdminUser()` returns and
// includes both the user's role and the tenant they belong to.

export type AdminRole = "platform_admin" | "brand_admin" | "store_employee";

export type AdminUser = {
  /** user.id from the `users` table — or "dev" for dev_session cookies */
  id: string;
  /** user_id (same as id) — kept for legacy callers */
  user_id: string;
  /** email from the `users` table, or null for dev shims */
  email: string | null;
  /** display name */
  display_name: string | null;
  /** tenant id from `tenant_users`, or null for platform_admin */
  tenant_id: string | null;
  /**
   * @deprecated Use `tenant_id` instead. Kept for backward compat with
   * call sites that haven't been migrated yet. Always mirrors
   * `tenant_id`; will be removed in a later cleanup pass.
   */
  brand_id: string | null;
  /** tenant slug (for storefronts) */
  tenant_slug: string | null;
  /** role within the tenant (or platform-wide for platform_admin) */
  role: AdminRole;
  /** is the user active? */
  active: boolean;
  /** auth provider */
  auth_provider: "dev" | "google" | "email" | null;

  // ── Permission flags ────────────────────────────────────────────
  // Derived from the role, but exposed as individual booleans so
  // existing consumer code (forms, sidebar, etc.) can read them
  // directly without doing role math. See `permissionsForRole()` in
  // admin-permissions.ts for the source of truth.
  can_manage_products: boolean;
  can_manage_stops: boolean;
  can_manage_orders: boolean;
  can_manage_pickup: boolean;
  can_manage_messages: boolean;
  can_manage_refunds: boolean;
  can_manage_users: boolean;
  can_manage_water_log: boolean;
  can_manage_reports: boolean;
  can_manage_settings: boolean;
  can_manage_billing: boolean;
  can_manage_branding: boolean;
  can_manage_marketing: boolean;
  can_manage_team: boolean;

  /** must the user change their password? (legacy; unused) */
  must_change_password?: boolean;
};

export type TenantContext = {
  tenant: {
    id: string;
    name: string;
    slug: string;
    status: string;
  };
  user: AdminUser;
};
