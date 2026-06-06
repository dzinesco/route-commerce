import { test, expect } from "@playwright/test";

const BASE = process.env.PLAYWRIGHT_URL ?? "http://localhost:3000";

// ─────────────────────────────────────────────────────────────────────
// Login form renders the right affordances
// ─────────────────────────────────────────────────────────────────────
test.describe("Login form rendering", () => {
  test("renders Google button, email + password fields, and Sign in button", async ({ page }) => {
    await page.goto(`${BASE}/login`);

    // The Google button is the primary CTA at the top of the form.
    await expect(page.getByRole("button", { name: /continue with google/i })).toBeVisible();

    // Email + password inputs
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();

    // The "Sign in" submit button is on the email/password form (not on the
    // Google one). Use the form's aria-label to scope the lookup.
    const signInForm = page.getByRole("form", { name: /sign in form/i });
    await expect(signInForm.getByRole("button", { name: /^sign in$/i })).toBeVisible();
  });

  test("missing email surfaces browser required validation", async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.locator("#password").fill("something");
    // Don't fill email
    const signInForm = page.getByRole("form", { name: /sign in form/i });
    await signInForm.getByRole("button", { name: /^sign in$/i }).click();
    // The email input has `required` — the browser should block submission
    // and the email field remains focused. We don't assert on URL change.
    await expect(page.locator("#email")).toHaveAttribute("required", "");
  });
});

// ─────────────────────────────────────────────────────────────────────
// Demo mode (?demo=1) — the path that works without a Supabase backend
// ─────────────────────────────────────────────────────────────────────
test.describe("Demo mode (?demo=1)", () => {
  test("Platform Admin button sets dev_session and lands on /admin", async ({ page, context }) => {
    await page.goto(`${BASE}/login?demo=1`);
    await page.getByRole("button", { name: /platform admin/i }).click();

    // The click sets the cookie client-side and navigates. We should land
    // on the admin dashboard.
    await page.waitForURL(/\/admin/, { timeout: 10_000 });
    const cookies = await context.cookies();
    expect(cookies.find((c) => c.name === "dev_session")?.value).toBe("platform_admin");
  });

  test("Brand Admin button sets dev_session=brand_admin", async ({ page, context }) => {
    await page.goto(`${BASE}/login?demo=1`);
    await page.getByRole("button", { name: /brand admin/i }).click();
    await page.waitForURL(/\/admin/, { timeout: 10_000 });
    const cookies = await context.cookies();
    expect(cookies.find((c) => c.name === "dev_session")?.value).toBe("brand_admin");
  });

  test("Store Employee button sets dev_session=store_employee", async ({ page, context }) => {
    await page.goto(`${BASE}/login?demo=1`);
    await page.getByRole("button", { name: /store employee/i }).click();
    await page.waitForURL(/\/admin/, { timeout: 10_000 });
    const cookies = await context.cookies();
    expect(cookies.find((c) => c.name === "dev_session")?.value).toBe("store_employee");
  });
});

// ─────────────────────────────────────────────────────────────────────
// Credentials sign-in (skipped if env vars aren't set — needs a real
// Supabase auth user to actually succeed)
// ─────────────────────────────────────────────────────────────────────
test.describe("Credentials sign-in", () => {
  test.skip(
    !process.env.TEST_ADMIN_EMAIL || !process.env.TEST_ADMIN_PASSWORD,
    "Set TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD to run the credentials flow against a real Supabase backend.",
  );

  test("valid credentials redirect to /admin", async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.locator("#email").fill(process.env.TEST_ADMIN_EMAIL!);
    await page.locator("#password").fill(process.env.TEST_ADMIN_PASSWORD!);

    const signInForm = page.getByRole("form", { name: /sign in form/i });
    await signInForm.getByRole("button", { name: /^sign in$/i }).click();

    await page.waitForURL(/\/admin/, { timeout: 15_000 });
    await expect(page.locator("body")).not.toContainText("Access Denied");
  });

  test("wrong password shows an error and stays on /login", async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.locator("#email").fill(process.env.TEST_ADMIN_EMAIL!);
    await page.locator("#password").fill("definitely-wrong-password");

    const signInForm = page.getByRole("form", { name: /sign in form/i });
    await signInForm.getByRole("button", { name: /^sign in$/i }).click();

    // The error banner uses role="alert"
    await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 8_000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test("session persists across reload", async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.locator("#email").fill(process.env.TEST_ADMIN_EMAIL!);
    await page.locator("#password").fill(process.env.TEST_ADMIN_PASSWORD!);

    const signInForm = page.getByRole("form", { name: /sign in form/i });
    await signInForm.getByRole("button", { name: /^sign in$/i }).click();
    await page.waitForURL(/\/admin/, { timeout: 15_000 });

    await page.reload();
    await expect(page).toHaveURL(/\/admin/);
    await expect(page.locator("body")).not.toContainText("Access Denied");
  });
});
