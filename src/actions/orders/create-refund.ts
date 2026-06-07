"use server";

import { getAdminUser } from "@/lib/admin-permissions";
import { pool } from "@/lib/db";
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

  let inserted: { id: string } | null = null;
  try {
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO refunds (order_id, amount, reason, processor, processor_refund_id, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')
       RETURNING id`,
      [
        orderId,
        data.amount,
        data.reason ?? null,
        data.processor ?? null,
        data.processor_refund_id ?? null,
      ],
    );
    inserted = rows[0] ?? null;
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed",
    };
  }
  if (!inserted) {
    return { success: false, error: "Insert returned no row" };
  }

  logAuditEvent({
    table_name: "refunds",
    record_id: inserted.id,
    action: "INSERT",
    old_data: {},
    new_data: { order_id: orderId, amount: data.amount },
    brand_id: brandId,
  });

  return { success: true, id: inserted.id };
}
