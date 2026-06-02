# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: login/login-flow.spec.ts >> login with valid credentials redirects to /admin and shows admin dashboard
- Location: tests/login/login-flow.spec.ts:6:5

# Error details

```
Error: page.fill: value: expected string, got undefined
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - banner [ref=e2]:
    - generic [ref=e3]:
      - link "Route Commerce" [ref=e4] [cursor=pointer]:
        - /url: /
      - navigation [ref=e5]:
        - link "Tuxedo" [ref=e6] [cursor=pointer]:
          - /url: /tuxedo
        - link "IRD" [ref=e7] [cursor=pointer]:
          - /url: /indian-river-direct
        - link "Admin" [ref=e8] [cursor=pointer]:
          - /url: /admin
        - button "Switch to dark mode" [ref=e9]:
          - img [ref=e10]
        - link "Cart (0)" [ref=e12] [cursor=pointer]:
          - /url: /cart
  - main [ref=e13]:
    - generic [ref=e14]:
      - generic [ref=e15]:
        - heading "Admin Login" [level=1] [ref=e16]
        - paragraph [ref=e17]: Sign in with your account.
        - generic [ref=e18]:
          - generic [ref=e19]:
            - generic [ref=e20]: Email
            - textbox "Email" [ref=e21]:
              - /placeholder: admin@example.com
          - generic [ref=e22]:
            - generic [ref=e23]: Password
            - textbox "Password" [ref=e24]:
              - /placeholder: ••••••••
          - button "Sign In" [ref=e25]
          - button "Forgot password?" [ref=e26]
      - link "← Back to storefront" [ref=e27] [cursor=pointer]:
        - /url: /
  - contentinfo [ref=e28]:
    - generic [ref=e30]:
      - paragraph [ref=e31]: © 2026 Route Commerce. All rights reserved.
      - navigation [ref=e32]:
        - link "Privacy Policy" [ref=e33] [cursor=pointer]:
          - /url: /privacy-policy
        - link "Terms & Conditions" [ref=e34] [cursor=pointer]:
          - /url: /terms-and-conditions
        - link "Powered by Route Commerce" [ref=e35] [cursor=pointer]:
          - /url: https://cielohermosa.com
  - alert [ref=e36]
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | // ─────────────────────────────────────────────────────────────
  4  | // Login flow: credentials → /api/login JSON → redirect to /admin
  5  | // ─────────────────────────────────────────────────────────────
  6  | test("login with valid credentials redirects to /admin and shows admin dashboard", async ({
  7  |   page,
  8  | }) => {
  9  |   // Navigate to login page
  10 |   await page.goto("/login");
  11 | 
  12 |   // Fill credentials
> 13 |   await page.fill("#email", process.env.TEST_ADMIN_EMAIL!);
     |              ^ Error: page.fill: value: expected string, got undefined
  14 |   await page.fill("#password", process.env.TEST_ADMIN_PASSWORD!);
  15 | 
  16 |   // Submit form
  17 |   await page.click('button[type="submit"]');
  18 | 
  19 |   // Wait for navigation to /admin — the JSON response + client nav must happen
  20 |   await page.waitForURL("**/admin", { timeout: 10000 });
  21 | 
  22 |   // Admin dashboard must be rendered (Control Center heading or admin layout)
  23 |   await expect(page.locator("body")).not.toContainText("Access Denied");
  24 |   await expect(page.locator("body")).not.toContainText("Login failed");
  25 | });
  26 | 
  27 | // ─────────────────────────────────────────────────────────────
  28 | // Login failure: bad password shows error, stays on /login
  29 | // ─────────────────────────────────────────────────────────────
  30 | test("login with wrong password shows error and stays on /login", async ({
  31 |   page,
  32 | }) => {
  33 |   await page.goto("/login");
  34 | 
  35 |   await page.fill("#email", process.env.TEST_ADMIN_EMAIL!);
  36 |   await page.fill("#password", "wrongpassword123!");
  37 | 
  38 |   await page.click('button[type="submit"]');
  39 | 
  40 |   // Error message should appear
  41 |   await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 5000 });
  42 |   // Should NOT navigate away from login
  43 |   await expect(page).toHaveURL(/\/login/);
  44 | });
  45 | 
  46 | // ─────────────────────────────────────────────────────────────
  47 | // Login with missing fields shows validation error
  48 | // ─────────────────────────────────────────────────────────────
  49 | test("login with missing email shows validation error", async ({ page }) => {
  50 |   await page.goto("/login");
  51 | 
  52 |   // Don't fill email, only password
  53 |   await page.fill("#password", "something");
  54 | 
  55 |   await page.click('button[type="submit"]');
  56 | 
  57 |   // Browser validation should fire (email required)
  58 |   await expect(page.locator("#email")).toHaveAttribute("required", "");
  59 | });
  60 | 
  61 | // ─────────────────────────────────────────────────────────────
  62 | // Session persistence: after login, navigating to /admin
  63 | // should load without re-authenticating
  64 | // ─────────────────────────────────────────────────────────────
  65 | test("admin session persists across page reloads", async ({ page }) => {
  66 |   // Login first
  67 |   await page.goto("/login");
  68 |   await page.fill("#email", process.env.TEST_ADMIN_EMAIL!);
  69 |   await page.fill("#password", process.env.TEST_ADMIN_PASSWORD!);
  70 |   await page.click('button[type="submit"]');
  71 |   await page.waitForURL("**/admin", { timeout: 10000 });
  72 | 
  73 |   // Reload the page
  74 |   await page.reload();
  75 | 
  76 |   // Should still be on /admin (session cookie keeps user logged in)
  77 |   await expect(page).toHaveURL(/\/admin/);
  78 |   await expect(page.locator("body")).not.toContainText("Access Denied");
  79 | });
  80 | 
```