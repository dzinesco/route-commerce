import { betterAuth } from "better-auth/minimal";
import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";
import { nextCookies } from "better-auth/next-js";
import { admin as adminPlugin } from "better-auth/plugins";
import { randomUUID } from "crypto";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Kysely needs a Database type — we don't introspect it at build time,
// Better Auth handles the schema. Use a permissive type.
const db = new Kysely<unknown>({
  dialect: new PostgresDialect({ pool }),
});

export const auth = betterAuth({
  database: {
    db,
    type: "postgres",
  },

  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 8,
  },

  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET,
  appName: "Route Commerce",

  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // refresh once per day
  },

  advanced: {
    generateId: () => randomUUID(),
    cookiePrefix: "rc",
  },

  plugins: [nextCookies(), adminPlugin()],
});

export type Session = typeof auth.$Infer.Session;
