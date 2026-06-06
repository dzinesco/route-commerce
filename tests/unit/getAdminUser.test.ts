/**
 * @vitest-environment node
 *
 * Unit tests for `getAdminUser()` in src/lib/admin-permissions.ts.
 *
 * Exercises the three auth sources and the two lookup paths:
 *   - dev_session cookie → buildDevAdmin shim
 *   - NEXT_PUBLIC_USE_MOCK_DATA → buildDevAdmin shim
 *   - Auth.js session → REST RPC (preferred) or REST query (fallback)
 *     + upsert_admin_user auto-provisioning for first-time sign-ins.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Module mocks ────────────────────────────────────────────────────
//
// vi.mock is hoisted, so all factory bodies must avoid closure over
// outer-scope imports. The actual implementations are stubbed and
// re-configured in `beforeEach`.

const cookiesMock = vi.fn();
vi.mock("next/headers", () => ({ cookies: cookiesMock }));

const authMock = vi.fn();
vi.mock("@/lib/auth", () => ({ auth: authMock }));

// `server-only` is a runtime guard that throws if imported outside a
// server context. Vitest is a Node env, so the guard fires and breaks
// the test setup — stub it.
vi.mock("server-only", () => ({}));

// Import AFTER the mocks.
const { getAdminUser, buildDevAdmin } = await import("@/lib/admin-permissions");

// ── Test helpers ───────────────────────────────────────────────────

const UUID = "00000000-0000-0000-0000-000000000001";
const NON_UUID = "google-sub-1234567890";

function mockCookies(value: string | undefined) {
  cookiesMock.mockResolvedValue({
    get: (name: string) =>
      name === "dev_session" && value ? { name, value } : undefined,
  });
}

function mockAuthSession(session: { user?: { id?: string; email?: string } } | null) {
  authMock.mockResolvedValue(session);
}

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

function adminRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "row-1",
    user_id: UUID,
    brand_id: null,
    role: "platform_admin",
    active: true,
    must_change_password: false,
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────────

describe("getAdminUser — dev_session bypass", () => {
  beforeEach(() => {
    cookiesMock.mockReset();
    authMock.mockReset();
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns platform_admin shim for dev_session=platform_admin", async () => {
    mockCookies("platform_admin");
    const u = await getAdminUser();
    expect(u).not.toBeNull();
    expect(u?.role).toBe("platform_admin");
    expect(u?.can_manage_users).toBe(true);
    expect(authMock).not.toHaveBeenCalled();
  });

  it("returns brand_admin shim for dev_session=brand_admin", async () => {
    mockCookies("brand_admin");
    const u = await getAdminUser();
    expect(u?.role).toBe("brand_admin");
    expect(u?.can_manage_users).toBe(true);
  });

  it("returns store_employee shim for dev_session=store_employee", async () => {
    mockCookies("store_employee");
    const u = await getAdminUser();
    expect(u?.role).toBe("store_employee");
    expect(u?.can_manage_users).toBe(false);
    expect(u?.can_manage_orders).toBe(true);
    expect(u?.can_manage_pickup).toBe(true);
  });

  it("falls through to auth() for an unrecognized dev_session value", async () => {
    mockCookies("hacker");
    mockAuthSession(null);
    const u = await getAdminUser();
    expect(u).toBeNull();
    expect(authMock).toHaveBeenCalledTimes(1);
  });
});

describe("getAdminUser — mock data mode", () => {
  beforeEach(() => {
    cookiesMock.mockReset();
    authMock.mockReset();
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.NEXT_PUBLIC_USE_MOCK_DATA;
  });

  it("returns platform_admin shim when NEXT_PUBLIC_USE_MOCK_DATA=true", async () => {
    process.env.NEXT_PUBLIC_USE_MOCK_DATA = "true";
    mockCookies(undefined);
    const u = await getAdminUser();
    expect(u?.role).toBe("platform_admin");
    expect(authMock).not.toHaveBeenCalled();
  });
});

describe("getAdminUser — Auth.js v5 session", () => {
  const SUPABASE_URL = "https://example.supabase.co";
  const SERVICE_KEY = "service-role-key";

  beforeEach(() => {
    cookiesMock.mockReset();
    authMock.mockReset();
    process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE_URL;
    process.env.SUPABASE_SERVICE_ROLE_KEY = SERVICE_KEY;
    delete process.env.NEXT_PUBLIC_USE_MOCK_DATA;
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it("returns null when auth() returns no session", async () => {
    mockCookies(undefined);
    mockAuthSession(null);
    const u = await getAdminUser();
    expect(u).toBeNull();
  });

  it("returns null when env vars are missing", async () => {
    mockCookies(undefined);
    mockAuthSession({ user: { id: UUID, email: "a@b.com" } });
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const u = await getAdminUser();
    expect(u).toBeNull();
  });

  it("calls the new get_admin_user_for_session RPC first and returns the row", async () => {
    mockCookies(undefined);
    mockAuthSession({ user: { id: UUID, email: "admin@brand.test" } });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(adminRow()));
    vi.stubGlobal("fetch", fetchMock);

    const u = await getAdminUser();

    expect(u?.role).toBe("platform_admin");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(
      `${SUPABASE_URL}/rest/v1/rpc/get_admin_user_for_session`,
    );
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      p_session_id: UUID,
    });
  });

  it("falls back to the legacy user_id REST query when the RPC is missing (404)", async () => {
    mockCookies(undefined);
    mockAuthSession({ user: { id: UUID, email: "admin@brand.test" } });
    const fetchMock = vi.fn()
      // RPC returns 404 (migration 204 not applied yet)
      .mockResolvedValueOnce(new Response("not found", { status: 404 }))
      // Legacy query succeeds
      .mockResolvedValueOnce(jsonResponse([adminRow()]));
    vi.stubGlobal("fetch", fetchMock);

    const u = await getAdminUser();

    expect(u?.role).toBe("platform_admin");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const secondUrl = fetchMock.mock.calls[1][0] as string;
    expect(secondUrl).toContain("/rest/v1/admin_users?");
    expect(secondUrl).toContain(`user_id=eq.${UUID}`);
  });

  it("falls back to the email REST query for a non-UUID Google subject when the RPC is missing", async () => {
    mockCookies(undefined);
    mockAuthSession({ user: { id: NON_UUID, email: "Admin@Brand.Test" } });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response("not found", { status: 404 }))
      .mockResolvedValueOnce(jsonResponse([adminRow({ user_id: NON_UUID })]));
    vi.stubGlobal("fetch", fetchMock);

    const u = await getAdminUser();

    expect(u).not.toBeNull();
    const secondUrl = fetchMock.mock.calls[1][0] as string;
    expect(secondUrl).toContain("email=ilike.admin%40brand.test");
  });

  it("returns null when the admin_users row is inactive", async () => {
    mockCookies(undefined);
    mockAuthSession({ user: { id: UUID, email: "a@b.com" } });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(jsonResponse([adminRow({ active: false })])),
    );

    const u = await getAdminUser();
    expect(u).toBeNull();
  });

  it("returns null when no row exists and auto-provisioning is unavailable", async () => {
    mockCookies(undefined);
    mockAuthSession({ user: { id: UUID, email: "a@b.com" } });
    const fetchMock = vi.fn()
      // 1. RPC returns []
      .mockResolvedValueOnce(jsonResponse([]))
      // 2. legacy REST also returns []
      .mockResolvedValueOnce(jsonResponse([]))
      // 3. upsert_admin_user also returns []
      .mockResolvedValueOnce(jsonResponse([]));
    vi.stubGlobal("fetch", fetchMock);

    const u = await getAdminUser();
    expect(u).toBeNull();
  });

  it("auto-provisions a first-time sign-in via upsert_admin_user", async () => {
    mockCookies(undefined);
    mockAuthSession({ user: { id: UUID, email: "new@brand.test" } });
    const fetchMock = vi.fn()
      // 1. RPC returns []
      .mockResolvedValueOnce(jsonResponse([]))
      // 2. legacy REST also returns []
      .mockResolvedValueOnce(jsonResponse([]))
      // 3. upsert returns the freshly-minted platform_admin row
      .mockResolvedValueOnce(
        jsonResponse([adminRow({ email: "new@brand.test" })]),
      );
    vi.stubGlobal("fetch", fetchMock);

    const u = await getAdminUser();

    expect(u).not.toBeNull();
    expect(u?.role).toBe("platform_admin");
    const upsertCall = fetchMock.mock.calls[2];
    expect(upsertCall[0]).toBe(`${SUPABASE_URL}/rest/v1/rpc/upsert_admin_user`);
    expect(JSON.parse(upsertCall[1].body)).toEqual({
      p_user_id: UUID,
      p_email: "new@brand.test",
      p_auth_provider: "supabase",
      p_auth_subject: null,
    });
  });

  it("auto-provisions a Google sign-in with p_auth_provider=google and no p_user_id", async () => {
    mockCookies(undefined);
    mockAuthSession({ user: { id: NON_UUID, email: "new@brand.test" } });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse([]))        // RPC miss
      .mockResolvedValueOnce(jsonResponse([]))        // legacy miss
      .mockResolvedValueOnce(jsonResponse([adminRow({ user_id: null, auth_subject: NON_UUID })]));
    vi.stubGlobal("fetch", fetchMock);

    const u = await getAdminUser();
    expect(u).not.toBeNull();
    const upsertCall = fetchMock.mock.calls[2];
    expect(JSON.parse(upsertCall[1].body)).toEqual({
      p_user_id: null,
      p_email: "new@brand.test",
      p_auth_provider: "google",
      p_auth_subject: NON_UUID,
    });
  });

  it("returns null when cookies() throws (defensive)", async () => {
    cookiesMock.mockRejectedValue(new Error("cookies unavailable"));
    const u = await getAdminUser();
    expect(u).toBeNull();
  });

  it("returns null when auth() throws (defensive)", async () => {
    mockCookies(undefined);
    authMock.mockRejectedValue(new Error("auth blew up"));
    const u = await getAdminUser();
    expect(u).toBeNull();
  });
});

describe("buildDevAdmin", () => {
  it("platform_admin has all permissions", () => {
    const u = buildDevAdmin("platform_admin");
    expect(u.role).toBe("platform_admin");
    expect(u.can_manage_users).toBe(true);
    expect(u.can_manage_settings).toBe(true);
    expect(u.can_manage_products).toBe(true);
  });

  it("store_employee is restricted to orders + pickup", () => {
    const u = buildDevAdmin("store_employee");
    expect(u.role).toBe("store_employee");
    expect(u.can_manage_orders).toBe(true);
    expect(u.can_manage_pickup).toBe(true);
    expect(u.can_manage_users).toBe(false);
    expect(u.can_manage_settings).toBe(false);
    expect(u.can_manage_products).toBe(false);
  });

  it("returns shim with brand_id=null", () => {
    const u = buildDevAdmin("platform_admin");
    expect(u.brand_id).toBeNull();
    expect(u.must_change_password).toBe(false);
    expect(u.active).toBe(true);
  });
});
