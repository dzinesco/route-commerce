import { test, expect } from "@playwright/test";

const BASE = process.env.PLAYWRIGHT_URL ?? "http://localhost:3000";

test.describe("Smoke Tests", () => {
  test("Login — dev_session platform_admin lands on admin dashboard", async ({ page }) => {
    await page.context().addCookies([
      { name: "dev_session", value: "platform_admin", domain: "localhost", path: "/" },
    ]);

    await page.goto(`${BASE}/admin`);
    await expect(page).toHaveURL(/\/admin/, { timeout: 5000 });

    // Admin sidebar nav should be loaded (sidebar is rendered by layout)
    await expect(page.locator("aside").first()).toBeVisible({ timeout: 5000 });
  });

  test("Admin Settings — page loads", async ({ page }) => {
    await page.context().addCookies([
      { name: "dev_session", value: "platform_admin", domain: "localhost", path: "/" },
    ]);

    await page.goto(`${BASE}/admin/settings`);

    // Wait for redirect to complete (may go to /login first)
    await page.waitForURL(/\/admin\/settings/, { timeout: 10000 });

    // Page renders without crash — main content area should exist
    await expect(page.locator("main").first()).toBeVisible({ timeout: 8000 });
  });

  test("Time Tracking — page loads", async ({ page }) => {
    await page.context().addCookies([
      { name: "dev_session", value: "platform_admin", domain: "localhost", path: "/" },
    ]);

    await page.goto(`${BASE}/admin/time-tracking`);
    await expect(page).toHaveURL(/\/admin\/time-tracking/, { timeout: 5000 });
    await expect(page.locator("body")).toBeVisible();
  });

  test("Tuxedo storefront — homepage loads without console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await page.goto(`${BASE}/tuxedo`);

    // Hero brand name — use a more stable anchor
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 10000 });

    // "Why Choose" section heading is a strong signal the page rendered correctly
    await expect(page.getByRole("heading", { name: /why choose/i })).toBeVisible({ timeout: 5000 });

    // No console errors (filter known non-critical)
    const criticalErrors = errors.filter(
      (e) => !e.includes("favicon") && !e.includes("Warning:")
    );
    expect(criticalErrors).toHaveLength(0);
  });
});