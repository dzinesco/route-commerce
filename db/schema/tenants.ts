/**
 * Tenancy + auth tables. Source of truth: `db/migrations/0001_init.sql`.
 */
import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
  uniqueIndex,
  primaryKey,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import {
  tenantStatusEnum,
  authProviderEnum,
  roleEnum,
} from "./enums";

export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  status: text("status", { enum: tenantStatusEnum }).notNull().default("trial"),
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
  stripeCustomerId: text("stripe_customer_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").unique(),
    name: text("name"),
    image: text("image"),
    /**
     * Bcrypt / scrypt / argon2 hash, or null for OAuth-only users.
     * Format is self-describing (algorithm$N$salt$hash) so we can
     * migrate to a stronger KDF later without losing existing hashes.
     * See `src/lib/passwords.ts` for the encoder/decoder.
     */
    passwordHash: text("password_hash"),
    authProvider: text("auth_provider", { enum: authProviderEnum })
      .notNull()
      .default("dev"),
    authSubject: text("auth_subject"),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    authSubjectIdx: uniqueIndex("users_auth_subject_idx")
      .on(t.authProvider, t.authSubject)
      .where(sql`${t.authSubject} IS NOT NULL`),
  }),
);

export const tenantUsers = pgTable(
  "tenant_users",
  {
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role", { enum: roleEnum }).notNull().default("brand_admin"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.tenantId, t.userId] }),
    userIdx: index("tenant_users_user_idx").on(t.userId),
  }),
);

export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type TenantUser = typeof tenantUsers.$inferSelect;
export type NewTenantUser = typeof tenantUsers.$inferInsert;
