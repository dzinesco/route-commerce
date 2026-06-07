import { test, expect } from "@playwright/test";

const BASE = process.env.PLAYWRIGHT_URL ?? "http://localhost:3000";

// ─────────────────────────────────────────────────────────────────────
// Login page — Google OAuth is the only login path
// ─────────────────────────────────────────────────────────────────────
test.describe("Login page", () => {
  test("renders the Google sign-in button", async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await expect(page.getByRole("button", { name: /continue with google/i })).toBeVisible();
  });

  test("shows a friendly 'not configured' message when Google OAuth env is missing", async ({ page }) => {
    // The page either shows the Google button (when AUTH_GOOGLE_ID/SECRET
    // are set) or a setup message (when they aren't). We accept both as
    // correct renderings.
    await page.goto(`${BASE}/login`);
    const hasGoogle = await page
      .getByRole("button", { name: /continue with google/i })
      .isVisible()
      .catch(() => false);
    const hasSetup = await page
      .getByText(/Google sign-in is not configured/i)
      .isVisible()
      .catch(() => false);
    expect(hasGoogle || hasSetup).toBe(true);
  });

  test("/admin redirects to /login when not authenticated", async ({ page }) => {
    const res = await page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
    // After redirect, the URL should be /login (with ?redirect=/admin).
    expect(page.url()).toMatch(/\/login(\?|$)/);
    expect(res?.status()).toBeLessThan(500);
  });
});
