"use server";

import { getAdminUser } from "@/lib/admin-permissions";
import { getActiveBrandId } from "@/lib/brand-scope";
import { pool } from "@/lib/db";
import { logAuditEvent } from "@/actions/audit";

export async function deleteProduct(
  productId: string,
  brandId: string | null
): Promise<{ success: boolean; error?: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) {
    return { success: false, error: "Not authenticated" };
  }

  if (!adminUser.can_manage_products) {
    return { success: false, error: "Not authorized to manage products" };
  }

  const activeBrandId = await getActiveBrandId(adminUser, brandId);
  if (!activeBrandId && adminUser.role !== "platform_admin") {
    return { success: false, error: "Brand access required" };
  }
  const effectiveBrandId = activeBrandId;

  // `delete_product` is a SECURITY DEFINER RPC that soft-deletes the row
  // (sets `deleted_at`) and guards against products referenced by
  // existing order_items. It returns JSONB {success, error?}.
  let result: { success?: boolean; error?: string } = {};
  try {
    const { rows } = await pool.query<{ success: boolean; error?: string }>(
      "SELECT * FROM delete_product($1, $2)",
      [productId, effectiveBrandId],
    );
    result = rows[0] ?? {};
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Delete failed",
    };
  }

  if (!result.success) {
    return { success: false, error: result.error ?? "Delete failed" };
  }

  logAuditEvent({
    table_name: "products",
    record_id: productId,
    action: "DELETE",
    old_data: { deleted_at: null },
    new_data: { deleted_at: new Date().toISOString() },
    brand_id: effectiveBrandId,
  });

  return { success: true };
}
