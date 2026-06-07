/**
 * Brand settings. One row per tenant. Source of truth:
 * `db/migrations/0001_init.sql`.
 */
import { pgTable, uuid, text, jsonb, timestamp } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";

export const brandSettings = pgTable("brand_settings", {
  tenantId: uuid("tenant_id")
    .primaryKey()
    .references(() => tenants.id, { onDelete: "cascade" }),
  brandName: text("brand_name").notNull(),
  tagline: text("tagline"),
  aboutHtml: text("about_html"),
  primaryColor: text("primary_color").default("#0F766E"),
  logoStorageKey: text("logo_storage_key"),
  heroStorageKey: text("hero_storage_key"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  customFooterText: text("custom_footer_text"),
  featureFlags: jsonb("feature_flags").notNull().default({}),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type BrandSettings = typeof brandSettings.$inferSelect;
export type NewBrandSettings = typeof brandSettings.$inferInsert;
