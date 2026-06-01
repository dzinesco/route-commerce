"use server";

import { getAdminUser } from "@/lib/admin-permissions";
import { svcHeaders } from "@/lib/svc-headers";

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
 * In dev mode (dev_session cookie), uses the dev user identity.
 * In production (Supabase auth), resolves the admin user from admin_users.
 *
 * Audit writes bypass RLS via the SECURITY DEFINER log_audit_event RPC function.
 */
export async function logAuditEvent(payload: AuditPayload): Promise<AuditResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

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

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/log_audit_event`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify({ p_payload: rpcPayload }),
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({ message: "Unknown error" }));
    return { success: false, error: err.message ?? "Failed to write audit log" };
  }

  const data = await response.json();
  const auditId = typeof data === "string" ? data : data?.[0]?.id ?? data?.id;

  if (!auditId) {
    return { success: false, error: "Audit log written but ID not returned" };
  }

  return { success: true, audit_id: auditId };
}