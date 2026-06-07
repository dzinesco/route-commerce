"use server";

import { pool } from "@/lib/db";

type AdminActionPayload = {
  action_type: "create" | "update" | "delete";
  admin_id?: string;
  admin_email?: string;
  affected_user_id?: string;
  brand_id?: string;
  details?: Record<string, unknown>;
};

type UserActivityPayload = {
  user_id: string;
  activity_type: "login" | "logout" | "password_change" | "profile_update" | "email_change";
  details?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
};

export async function logAdminAction(payload: AdminActionPayload): Promise<void> {
  try {
    await pool.query("SELECT log_admin_action($1::jsonb)", [
      JSON.stringify({
        action_type: payload.action_type,
        admin_id: payload.admin_id ?? null,
        admin_email: payload.admin_email ?? null,
        affected_user_id: payload.affected_user_id ?? null,
        brand_id: payload.brand_id ?? null,
        details: payload.details ?? {},
      }),
    ]);
  } catch {
    // logging failed silently
  }
}

export async function logUserActivity(payload: UserActivityPayload): Promise<void> {
  try {
    await pool.query("SELECT log_user_activity($1::jsonb)", [
      JSON.stringify({
        user_id: payload.user_id,
        activity_type: payload.activity_type,
        details: payload.details ?? {},
        ip_address: payload.ip_address ?? null,
        user_agent: payload.user_agent ?? null,
      }),
    ]);
  } catch {
    // logging failed silently
  }
}
