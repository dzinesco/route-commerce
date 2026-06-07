/**
 * Customers. Source of truth: `db/migrations/0001_init.sql`.
 */
import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { tenants } from "./tenants";

export const customers = pgTable(
  "customers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    smsOptIn: boolean("sms_opt_in").notNull().default(false),
    emailOptIn: boolean("email_opt_in").notNull().default(true),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    tenantIdx: index("customers_tenant_idx").on(t.tenantId),
    emailIdx: uniqueIndex("customers_tenant_email_idx")
      .on(t.tenantId, t.email)
      .where(sql`${t.email} IS NOT NULL`),
  }),
);

export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;
