/**
 * Shared enums for the SaaS schema. Mirrored in SQL as TEXT + CHECK.
 *
 * Usage:
 *   import { tenantStatusEnum, type TenantStatus } from "@/db/schema/enums";
 *   import { pgEnum } from "drizzle-orm/pg-core";
 *
 *   export const tenantStatus = pgEnum("tenant_status", tenantStatusEnum);
 */

export const tenantStatusEnum = [
  "trial",
  "active",
  "past_due",
  "suspended",
  "churned",
] as const;
export type TenantStatus = (typeof tenantStatusEnum)[number];

export const authProviderEnum = ["dev", "google", "email"] as const;
export type AuthProvider = (typeof authProviderEnum)[number];

export const roleEnum = ["platform_admin", "brand_admin", "store_employee"] as const;
export type Role = (typeof roleEnum)[number];

export const planCodeEnum = ["starter", "farm", "enterprise"] as const;
export type PlanCode = (typeof planCodeEnum)[number];

export const addOnCodeEnum = [
  "wholesale_portal",
  "harvest_reach",
  "ai_tools",
  "water_log",
  "square_sync",
  "sms_campaigns",
] as const;
export type AddOnCode = (typeof addOnCodeEnum)[number];

export const subscriptionStatusEnum = [
  "trialing",
  "active",
  "past_due",
  "canceled",
  "incomplete",
] as const;
export type SubscriptionStatus = (typeof subscriptionStatusEnum)[number];

export const addOnStatusEnum = ["active", "canceled"] as const;
export type AddOnStatus = (typeof addOnStatusEnum)[number];

export const stopStatusEnum = ["active", "paused", "closed"] as const;
export type StopStatus = (typeof stopStatusEnum)[number];

export const orderStatusEnum = [
  "pending",
  "confirmed",
  "fulfilled",
  "canceled",
] as const;
export type OrderStatus = (typeof orderStatusEnum)[number];

export const fulfillmentEnum = ["pickup", "ship", "mixed"] as const;
export type Fulfillment = (typeof fulfillmentEnum)[number];

export const itemFulfillmentEnum = ["pickup", "ship"] as const;
export type ItemFulfillment = (typeof itemFulfillmentEnum)[number];

export const campaignStatusEnum = [
  "draft",
  "scheduled",
  "sending",
  "sent",
  "canceled",
] as const;
export type CampaignStatus = (typeof campaignStatusEnum)[number];
