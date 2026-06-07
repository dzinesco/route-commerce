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
    // The Google provider is only present when AUTH_GOOGLE_ID +
    // AUTH_GOOGLE_SECRET are set.
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
    await expect(page.locator("body")).toBeVisible();
  });

  test("unauthed /admin redirects to /login", async ({ page }) => {
    await page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
    expect(page.url()).toMatch(/\/login/);
  });

  test("unauthed /wholesale redirects to /login", async ({ page }) => {
    await page.goto(`${BASE}/wholesale`, { waitUntil: "domcontentloaded" });
    expect(page.url()).toMatch(/\/login/);
  });
});
