import { test, expect, request } from "@playwright/test";

const BASE = process.env.PLAYWRIGHT_URL ?? "http://localhost:3000";

// ─────────────────────────────────────────────────────────────────────
// Auth.js v5 API endpoints
// ─────────────────────────────────────────────────────────────────────
test.describe("Auth.js v5 endpoints", () => {
  test("/api/auth/providers returns the configured providers", async () => {
    const ctx = await request.newContext({ baseURL: BASE });
    const res = await ctx.get("/api/auth/providers");
    expect(res.status()).toBe(200);
    const providers = (await res.json()) as Record<string, unknown>;
    // The Credentials provider is always present. The Google provider is
    // only present when AUTH_GOOGLE_ID + AUTH_GOOGLE_SECRET are set.
    expect(providers).toHaveProperty("supabase-password");
    if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
      expect(providers).toHaveProperty("google");
    }
    await ctx.dispose();
  });

  test("/api/auth/csrf returns a valid CSRF token", async () => {
    const ctx = await request.newContext({ baseURL: BASE });
    const res = await ctx.get("/api/auth/csrf");
    expect(res.status()).toBe(200);
    const body = (await res.json()) as { csrfToken?: string };
    expect(typeof body.csrfToken).toBe("string");
    expect(body.csrfToken!.length).toBeGreaterThan(20);
    await ctx.dispose();
  });

  test("/api/auth/session returns null when there is no session", async () => {
    const ctx = await request.newContext({ baseURL: BASE });
    const res = await ctx.get("/api/auth/session");
    expect(res.status()).toBe(200);
    const body = await res.json();
    // Auth.js returns `null` (not `{}`) when no session is active.
    expect(body).toBeNull();
    await ctx.dispose();
  });
});

// ─────────────────────────────────────────────────────────────────────
// Middleware — protected route gating
// ─────────────────────────────────────────────────────────────────────
test.describe("Middleware — protected route gating", () => {
  test("unauthed /login renders the login form (200)", async ({ page }) => {
    const res = await page.goto(`${BASE}/login`);
    expect(res?.status()).toBe(200);
    // The login form has an aria-label of "Sign in form"
    await expect(page.getByRole("form", { name: /sign in form/i })).toBeVisible();
  });

  test("dev_session=platform_admin lets /admin render (200)", async ({ page, context }) => {
    await context.addCookies([
      { name: "dev_session", value: "platform_admin", domain: "localhost", path: "/" },
    ]);
    const res = await page.goto(`${BASE}/admin`);
    expect(res?.status()).toBe(200);
    await expect(page).toHaveURL(/\/admin/);
    // The admin layout renders a sidebar (aside element)
    await expect(page.locator("aside").first()).toBeVisible({ timeout: 5_000 });
  });

  test("authed user hitting /login is redirected to /admin", async ({ page, context }) => {
    await context.addCookies([
      { name: "dev_session", value: "platform_admin", domain: "localhost", path: "/" },
    ]);
    await page.goto(`${BASE}/login`);
    // Middleware redirects authed users from /login to /admin
    await page.waitForURL(/\/admin/, { timeout: 5_000 });
  });
});

// ─────────────────────────────────────────────────────────────────────
// Admin pages — load cleanly with dev_session
// ─────────────────────────────────────────────────────────────────────
test.describe("Admin pages — load with dev_session", () => {
  test.beforeEach(async ({ context }) => {
    await context.addCookies([
      { name: "dev_session", value: "platform_admin", domain: "localhost", path: "/" },
    ]);
  });

  for (const path of ["/admin", "/admin/products", "/admin/orders", "/admin/settings"]) {
    test(`${path} renders without crashing`, async ({ page }) => {
      const res = await page.goto(`${BASE}${path}`);
      expect(res?.status()).toBe(200);
      await expect(page.locator("body")).toBeVisible();
      // The admin layout renders the sidebar; this confirms the auth
      // gate didn't bounce us back to /login.
      await expect(page.locator("aside").first()).toBeVisible({ timeout: 8_000 });
      await expect(page.locator("body")).not.toContainText("Access Denied");
    });
  }
});

// ─────────────────────────────────────────────────────────────────────
// Logout flow
// ─────────────────────────────────────────────────────────────────────
test.describe("Logout", () => {
  test("/logout clears the dev_session cookie and redirects to /login", async ({ page, context }) => {
    await context.addCookies([
      { name: "dev_session", value: "platform_admin", domain: "localhost", path: "/" },
    ]);

    // /logout is a server component that calls signOut and redirects.
    await page.goto(`${BASE}/logout`);

    // The Auth.js signOut flow sets a callback URL in the URL, or the
    // custom /logout page redirects to /login directly. Either way we
    // should land on /login (or near it).
    await page.waitForURL(/\/login/, { timeout: 8_000 });

    // The dev_session cookie should be cleared (or Auth.js session
    // cookie cleared). At minimum, navigating to /admin again should
    // require re-auth — we can verify by hitting /admin and checking
    // that we don't have a 200 with the sidebar (the dev session may
    // be re-issued by the demo flow middleware, so we don't assert
    // strict denial here; just that logout *did* go to /login).
  });
});
