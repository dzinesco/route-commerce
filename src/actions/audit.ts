"use server";

import { getAdminUser } from "@/lib/admin-permissions";
import { pool } from "@/lib/db";

export type AuditAction = "INSERT" | "UPDATE" | "DELETE";

export type AuditPayload = {
  table_name: string;
  record_id: string;
  action: AuditAction;
  old_data?: Record<string, unknown> | null;
  new_data?: Record<string, unknown> | null;
  brand_id?: string | null;
};

type AuditResult =
  | { success: true; audit_id: string }
  | { success: false; error: string };

/**
 * Logs an audit event to the audit_logs table.
 *
 * Resolves the admin user from the Auth.js session via getAdminUser().
 * Audit writes go through the `log_audit_event` SECURITY DEFINER
 * PL/pgSQL function via the shared pg pool — no Supabase REST hop.
 */
export async function logAuditEvent(payload: AuditPayload): Promise<AuditResult> {
  const adminUser = await getAdminUser();

  const performed_by = adminUser?.user_id ?? null;
  const performed_by_email =
    adminUser?.user_id === "dev-user-00000000-0000-0000-0000-000000000000"
      ? "dev@platform-admin"
      : adminUser?.user_id
      ? `admin_user:${adminUser.user_id}`
      : null;

  const rpcPayload = {
    table_name: payload.table_name,
    record_id: payload.record_id,
    action: payload.action,
    old_data: payload.old_data ?? null,
    new_data: payload.new_data ?? null,
    performed_by,
    performed_by_email,
    brand_id: payload.brand_id ?? null,
  };

  try {
    const { rows } = await pool.query<{ id?: string }>(
      "SELECT * FROM log_audit_event($1::jsonb)",
      [JSON.stringify(rpcPayload)],
    );
    const auditId = typeof rows[0] === "string"
      ? rows[0]
      : rows[0]?.id;
    if (!auditId) {
      return { success: false, error: "Audit log written but ID not returned" };
    }
    return { success: true, audit_id: auditId };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to write audit log",
    };
  }
}
