/**
 * Unit tests for `getAdminUser()`. The dev_session cookie bypass has been
 * removed; the only path into the admin is through a real Auth.js
 * session. These tests mock the `auth()` function and the DB layer
 * to exercise the lookup.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Stub the server-only guard so the module can be imported under vitest.
vi.mock("server-only", () => ({}));

// Mock the Drizzle client wrapper so we don't need a real DB.
const mockSelect = vi.fn();
const mockWithPlatformAdmin = vi.fn(async (fn: any) => fn({ select: mockSelect }));
vi.mock("@/db/client", () => ({
  withPlatformAdmin: (fn: any) => mockWithPlatformAdmin(fn),
}));

// Mock the auth() function. The default mock returns null (no session).
const authMock = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: () => authMock(),
}));

// Mock cookies() so we don't read a real cookie store.
const cookieStoreGet = vi.fn();
vi.mock("next/headers", () => ({
  cookies: () =>
    Promise.resolve({
      get: (name: string) => cookieStoreGet(name),
    }),
}));

import { getAdminUser, buildDevAdmin, permissionsForRole } from "@/lib/admin-permissions";

beforeEach(() => {
  mockSelect.mockReset();
  authMock.mockReset();
  cookieStoreGet.mockReset();
});

describe("getAdminUser()", () => {
  it("returns null when there is no Auth.js session", async () => {
    authMock.mockResolvedValue(null);
    cookieStoreGet.mockReturnValue(undefined);
    const u = await getAdminUser();
    expect(u).toBeNull();
  });

  it("returns null when the session has no email", async () => {
    authMock.mockResolvedValue({ user: { name: "no-email" } });
    const u = await getAdminUser();
    expect(u).toBeNull();
  });

  it("returns null when the email is not in the users table", async () => {
    authMock.mockResolvedValue({ user: { email: "unknown@example.com" } });
    // First select: users. Returns empty.
    mockSelect.mockReturnValueOnce({
      from: () => ({
        where: () => ({
          limit: async () => [],
        }),
      }),
    });
    const u = await getAdminUser();
    expect(u).toBeNull();
  });

  it("returns null when the user exists but has no tenant_users row", async () => {
    authMock.mockResolvedValue({ user: { email: "no-tenant@example.com" } });
    // First select: users — returns the user
    mockSelect
      .mockReturnValueOnce({
        from: () => ({
          where: () => ({
            limit: async () => [
              {
                id: "user-1",
                email: "no-tenant@example.com",
                name: "No Tenant",
                authProvider: "google",
                authSubject: "google-sub",
              },
            ],
          }),
        }),
      })
      // Second select: tenantUsers — returns empty
      .mockReturnValueOnce({
        from: () => ({
          innerJoin: () => ({
            where: () => ({
              limit: async () => [],
            }),
          }),
        }),
      });
    const u = await getAdminUser();
    expect(u).toBeNull();
  });

  it("returns a fully-populated AdminUser for a provisioned brand_admin", async () => {
    authMock.mockResolvedValue({ user: { email: "admin@tuxedo.example" } });
    mockSelect
      .mockReturnValueOnce({
        from: () => ({
          where: () => ({
            limit: async () => [
              {
                id: "user-tux",
                email: "admin@tuxedo.example",
                name: "Tux Admin",
                authProvider: "google",
                authSubject: "google-tux",
              },
            ],
          }),
        }),
      })
      .mockReturnValueOnce({
        from: () => ({
          innerJoin: () => ({
            where: () => ({
              limit: async () => [
                {
                  tenantId: "tenant-tux",
                  tenantName: "Tuxedo Citrus",
                  tenantSlug: "tuxedo",
                  tenantStatus: "active",
                  role: "brand_admin",
                },
              ],
            }),
          }),
        }),
      });

    const u = await getAdminUser();
    expect(u).not.toBeNull();
    expect(u?.email).toBe("admin@tuxedo.example");
    expect(u?.tenant_id).toBe("tenant-tux");
    expect(u?.tenant_slug).toBe("tuxedo");
    expect(u?.role).toBe("brand_admin");
    expect(u?.can_manage_products).toBe(true);
    expect(u?.can_manage_team).toBe(true);
  });
});

describe("buildDevAdmin()", () => {
  it("returns a platform_admin with no tenant", () => {
    const u = buildDevAdmin("platform_admin");
    expect(u.role).toBe("platform_admin");
    expect(u.tenant_id).toBeNull();
    expect(u.tenant_slug).toBeNull();
    expect(u.can_manage_billing).toBe(true);
  });

  it("returns a brand_admin tied to the tuxedo tenant", () => {
    const u = buildDevAdmin("brand_admin");
    expect(u.role).toBe("brand_admin");
    expect(u.tenant_slug).toBe("tuxedo");
    expect(u.can_manage_users).toBe(false);
  });

  it("returns a store_employee with limited permissions", () => {
    const u = buildDevAdmin("store_employee");
    expect(u.role).toBe("store_employee");
    expect(u.can_manage_products).toBe(false);
    expect(u.can_manage_orders).toBe(true);
    expect(u.can_manage_billing).toBe(false);
  });
});

describe("permissionsForRole()", () => {
  it("platform_admin can do everything", () => {
    const p = permissionsForRole("platform_admin");
    expect(Object.values(p).every((v) => v === true)).toBe(true);
  });
  it("brand_admin can manage most things but not users", () => {
    const p = permissionsForRole("brand_admin");
    expect(p.can_manage_users).toBe(false);
    expect(p.can_manage_billing).toBe(true);
  });
  it("store_employee is restricted to orders + pickup", () => {
    const p = permissionsForRole("store_employee");
    expect(p.can_manage_orders).toBe(true);
    expect(p.can_manage_pickup).toBe(true);
    expect(p.can_manage_products).toBe(false);
    expect(p.can_manage_billing).toBe(false);
  });
});
