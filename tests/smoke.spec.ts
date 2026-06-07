import { test, expect } from "@playwright/test";

const BASE = process.env.PLAYWRIGHT_URL ?? "http://localhost:3000";

test.describe("Smoke Tests", () => {
  test("Homepage loads", async ({ page }) => {
    const res = await page.goto(`${BASE}/`);
    expect(res?.status()).toBeLessThan(500);
    await expect(page.locator("body")).toBeVisible();
  });

  test("Tuxedo storefront — homepage loads without console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await page.goto(`${BASE}/tuxedo`);
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 10_000 });
    const criticalErrors = errors.filter(
      (e) => !e.includes("favicon") && !e.includes("Warning:"),
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test("Indian River Direct storefront — homepage loads", async ({ page }) => {
    const res = await page.goto(`${BASE}/indian-river-direct`);
    expect(res?.status()).toBeLessThan(500);
    await expect(page.locator("body")).toBeVisible();
  });

  test("/admin redirects to /login when unauthenticated", async ({ page }) => {
    await page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
    expect(page.url()).toMatch(/\/login(\?|$)/);
  });

  test("Login page renders the Google CTA (or 'not configured' notice)", async ({ page }) => {
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
});
