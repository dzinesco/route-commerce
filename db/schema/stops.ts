/**
 * Stops. Source of truth: `db/migrations/0001_init.sql`.
 */
import {
  pgTable,
  uuid,
  text,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { stopStatusEnum } from "./enums";
import { tenants } from "./tenants";

export const stops = pgTable(
  "stops",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    address: text("address").notNull(),
    schedule: jsonb("schedule").notNull().default([]),
    status: text("status", { enum: stopStatusEnum }).notNull().default("active"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    tenantIdx: index("stops_tenant_idx").on(t.tenantId),
    statusIdx: index("stops_status_idx").on(t.tenantId, t.status),
  }),
);

export type Stop = typeof stops.$inferSelect;
export type NewStop = typeof stops.$inferInsert;
