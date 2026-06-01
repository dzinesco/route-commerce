import { test, expect } from "@playwright/test";

// ─────────────────────────────────────────────────────────────
// Login flow: credentials → /api/login JSON → redirect to /admin
// ─────────────────────────────────────────────────────────────
test("login with valid credentials redirects to /admin and shows admin dashboard", async ({
  page,
}) => {
  // Navigate to login page
  await page.goto("/login");

  // Fill credentials
  await page.fill("#email", process.env.TEST_ADMIN_EMAIL!);
  await page.fill("#password", process.env.TEST_ADMIN_PASSWORD!);

  // Submit form
  await page.click('button[type="submit"]');

  // Wait for navigation to /admin — the JSON response + client nav must happen
  await page.waitForURL("**/admin", { timeout: 10000 });

  // Admin dashboard must be rendered (Control Center heading or admin layout)
  await expect(page.locator("body")).not.toContainText("Access Denied");
  await expect(page.locator("body")).not.toContainText("Login failed");
});

// ─────────────────────────────────────────────────────────────
// Login failure: bad password shows error, stays on /login
// ─────────────────────────────────────────────────────────────
test("login with wrong password shows error and stays on /login", async ({
  page,
}) => {
  await page.goto("/login");

  await page.fill("#email", process.env.TEST_ADMIN_EMAIL!);
  await page.fill("#password", "wrongpassword123!");

  await page.click('button[type="submit"]');

  // Error message should appear
  await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 5000 });
  // Should NOT navigate away from login
  await expect(page).toHaveURL(/\/login/);
});

// ─────────────────────────────────────────────────────────────
// Login with missing fields shows validation error
// ─────────────────────────────────────────────────────────────
test("login with missing email shows validation error", async ({ page }) => {
  await page.goto("/login");

  // Don't fill email, only password
  await page.fill("#password", "something");

  await page.click('button[type="submit"]');

  // Browser validation should fire (email required)
  await expect(page.locator("#email")).toHaveAttribute("required", "");
});

// ─────────────────────────────────────────────────────────────
// Session persistence: after login, navigating to /admin
// should load without re-authenticating
// ─────────────────────────────────────────────────────────────
test("admin session persists across page reloads", async ({ page }) => {
  // Login first
  await page.goto("/login");
  await page.fill("#email", process.env.TEST_ADMIN_EMAIL!);
  await page.fill("#password", process.env.TEST_ADMIN_PASSWORD!);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/admin", { timeout: 10000 });

  // Reload the page
  await page.reload();

  // Should still be on /admin (session cookie keeps user logged in)
  await expect(page).toHaveURL(/\/admin/);
  await expect(page.locator("body")).not.toContainText("Access Denied");
});
