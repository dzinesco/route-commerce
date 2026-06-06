import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Mirrors `tsconfig.json` paths: { "@/*": ["./src/*"] }
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/unit/**/*.test.tsx"],
    exclude: ["node_modules", ".next", "tests/e2e/**", "tests/login/**", "tests/smoke.spec.ts"],
    // Supabase REST, Auth.js v5, and Next.js `cookies()` / `headers()` are
    // stubbed in each test — keep the timeout generous.
    testTimeout: 15_000,
  },
});
