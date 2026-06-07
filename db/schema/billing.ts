/**
 * Billing tables: plans, add-ons, subscriptions, tenant_add_ons.
 * Source of truth: `db/migrations/0001_init.sql`.
 */
import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  jsonb,
  primaryKey,
} from "drizzle-orm/pg-core";
import {
  planCodeEnum,
  addOnCodeEnum,
  subscriptionStatusEnum,
  addOnStatusEnum,
} from "./enums";
import { tenants } from "./tenants";

export const plans = pgTable("plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code", { enum: planCodeEnum }).notNull().unique(),
  name: text("name").notNull(),
  monthlyPriceCents: integer("monthly_price_cents").notNull(),
  maxUsers: integer("max_users").notNull(),
  maxProducts: integer("max_products").notNull(),
  maxStopsMonthly: integer("max_stops_monthly").notNull(),
  features: jsonb("features").notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const addOns = pgTable("add_ons", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code", { enum: addOnCodeEnum }).notNull().unique(),
  name: text("name").notNull(),
  monthlyPriceCents: integer("monthly_price_cents").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const subscriptions = pgTable("subscriptions", {
  tenantId: uuid("tenant_id")
    .primaryKey()
    .references(() => tenants.id, { onDelete: "cascade" }),
  planId: uuid("plan_id")
    .notNull()
    .references(() => plans.id),
  status: text("status", { enum: subscriptionStatusEnum })
    .notNull()
    .default("trialing"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const tenantAddOns = pgTable(
  "tenant_add_ons",
  {
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    addOnId: uuid("add_on_id")
      .notNull()
      .references(() => addOns.id, { onDelete: "cascade" }),
    stripeSubscriptionId: text("stripe_subscription_id"),
    status: text("status", { enum: addOnStatusEnum })
      .notNull()
      .default("active"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.tenantId, t.addOnId] }),
  }),
);

export type Plan = typeof plans.$inferSelect;
export type NewPlan = typeof plans.$inferInsert;
export type AddOn = typeof addOns.$inferSelect;
export type NewAddOn = typeof addOns.$inferInsert;
export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
export type TenantAddOn = typeof tenantAddOns.$inferSelect;
export type NewTenantAddOn = typeof tenantAddOns.$inferInsert;
