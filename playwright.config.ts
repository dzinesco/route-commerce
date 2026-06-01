import { defineConfig, devices } from "@playwright/test";
import path from "path";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "https://route-commerce-platform.vercel.app",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "production",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: "https://route-commerce-platform.vercel.app",
      },
    },
  ],
});
