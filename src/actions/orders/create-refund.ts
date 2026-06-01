"use server";

import { getAdminUser } from "@/lib/admin-permissions";
import { svcHeaders } from "@/lib/svc-headers";
import { logAuditEvent } from "@/actions/audit";

export type CreateRefundResult =
  | { success: true; id: string }
  | { success: false; error: string };

export async function createRefund(
  orderId: string,
  brandId: string | null,
  data: {
    amount: number;
    reason?: string | null;
    processor?: string | null;
    processor_refund_id?: string | null;
  }
): Promise<CreateRefundResult> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (!adminUser.can_manage_orders) return { success: false, error: "Not authorized" };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const res = await fetch(`${supabaseUrl}/rest/v1/refunds`, {
    method: "POST",
    headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({
      order_id: orderId,
      amount: data.amount,
      reason: data.reason ?? null,
      processor: data.processor ?? null,
      processor_refund_id: data.processor_refund_id ?? null,
      status: "pending",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return { success: false, error: `Failed: ${err}` };
  }

  const inserted = await res.json();

  logAuditEvent({
    table_name: "refunds",
    record_id: inserted[0]?.id ?? "",
    action: "INSERT",
    old_data: {},
    new_data: { order_id: orderId, amount: data.amount },
    brand_id: brandId,
  });

  return { success: true, id: inserted[0]?.id ?? "" };
}
