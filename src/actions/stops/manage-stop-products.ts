"use server";

/**
 * Assign / unassign a product to a stop.
 *
 * TODO(migration): the `assign_product_to_stop` and
 * `unassign_product_from_stop` SECURITY DEFINER RPCs live in
 * supabase/migrations/030. The RPCs still exist in the database and
 * are called via `pool.query` rather than the Supabase REST gateway.
 * When stops/products are re-platformed on the SaaS rebuild, replace
 * these with direct inserts/deletes on the new `db/schema/stops.ts`
 * `stopProducts` table.
 */

import { getAdminUser } from "@/lib/admin-permissions";
import { pool } from "@/lib/db";

export type AssignProductResult =
  | { success: true; id: string }
  | { success: false; error: string };

export type UnassignProductResult =
  | { success: true }
  | { success: false; error: string };

export async function assignProductToStop(params: {
  stopId: string;
  productId: string;
}): Promise<AssignProductResult> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (!adminUser.can_manage_products && !adminUser.can_manage_orders) {
    return { success: false, error: "Not authorized" };
  }

  try {
    const { rows } = await pool.query<{ id: string; success?: boolean; error?: string }>(
      "SELECT * FROM assign_product_to_stop($1::uuid, $2::uuid, $3::text)",
      [params.stopId, params.productId, adminUser.user_id]
    );
    const data = rows[0];
    if (!data?.id) {
      return { success: false, error: data?.error ?? "Failed to assign product to stop" };
    }
    return { success: true, id: data.id };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to assign product to stop",
    };
  }
}

export async function unassignProductFromStop(params: {
  stopId: string;
  productId: string;
}): Promise<UnassignProductResult> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (!adminUser.can_manage_products && !adminUser.can_manage_orders) {
    return { success: false, error: "Not authorized" };
  }

  try {
    await pool.query(
      "SELECT * FROM unassign_product_from_stop($1::uuid, $2::uuid, $3::text)",
      [params.stopId, params.productId, adminUser.user_id]
    );
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to unassign product from stop",
    };
  }
}
