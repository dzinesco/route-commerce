import { defineConfig, devices } from "@playwright/test";
import path from "path";

const LOCAL_BASE = process.env.PLAYWRIGHT_URL ?? "http://localhost:3000";
const PROD_BASE = "https://route-commerce-platform.vercel.app";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  // Playwright should only run E2E specs — vitest owns everything under
  // tests/unit/. The glob below matches *.spec.ts at the top of tests/ and
  // tests/e2e/ and tests/login/ but skips the .test.ts files (vitest).
  testMatch: /(tests\/(smoke|e2e|login)\/.*|\/[^/]+\.spec\.ts$)/,
  reporter: "list",
  use: {
    baseURL: LOCAL_BASE,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "local",
      use: { ...devices["Desktop Chrome"], baseURL: LOCAL_BASE },
    },
    {
      name: "production",
      // `PLAYWRIGHT_PROD=1 npx playwright test` to run against the live site.
      testMatch: /.*\.prod\.spec\.ts$/,
      use: { ...devices["Desktop Chrome"], baseURL: PROD_BASE },
    },
  ],
});
