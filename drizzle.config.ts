/**
 * Drizzle Kit config. Used by `drizzle-kit generate` / `drizzle-kit push`
 * for future migrations. The schema in `db/migrations/0001_init.sql` is
 * the source of truth for v1; subsequent migrations can be generated
 * from changes to `db/schema/*.ts` and committed alongside the SQL.
 */
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./db/schema/index.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/route_commerce",
  },
  strict: true,
  verbose: true,
});
