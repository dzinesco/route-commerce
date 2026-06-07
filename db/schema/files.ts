/**
 * Files. Source of truth: `db/migrations/0001_init.sql`.
 */
import {
  pgTable,
  uuid,
  text,
  bigint,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { users } from "./tenants";

export const files = pgTable(
  "files",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").references(() => tenants.id, {
      onDelete: "cascade",
    }),
    storageKey: text("storage_key").notNull().unique(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
    purpose: text("purpose"),
    uploadedBy: uuid("uploaded_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    tenantIdx: index("files_tenant_idx").on(t.tenantId),
  }),
);

export type File = typeof files.$inferSelect;
export type NewFile = typeof files.$inferInsert;
