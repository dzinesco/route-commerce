import { NextResponse } from "next/server";
import { syncProductsToSquare } from "@/actions/square-products";
import { getAdminUser } from "@/lib/admin-permissions";
import { pool } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const adminUser = await getAdminUser();
  if (!adminUser || !adminUser.can_manage_settings) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const brandId = searchParams.get("brand_id");

  if (!brandId) {
    return NextResponse.json({ error: "brand_id required" }, { status: 400 });
  }

  // Claim a pending sync entry from the queue via SECURITY DEFINER RPC
  let entries: Array<{ id: string; brand_id: string }> = [];
  try {
    const { rows } = await pool.query<{ id: string; brand_id: string }>(
      "SELECT * FROM claim_square_sync_queue($1)",
      [brandId]
    );
    entries = rows;
  } catch (e: unknown) {
    const errText = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `Failed to claim queue: ${errText}` }, { status: 500 });
  }

  if (!entries || entries.length === 0 || entries[0] === null) {
    return NextResponse.json({ processed: 0, message: "No pending entries" });
  }

  const entry = entries[0];
  const result = await syncProductsToSquare(entry.brand_id);

  const newStatus = result.success ? "done" : "failed";
  const lastError = result.errors.length > 0 ? result.errors[0] : null;

  await pool.query(
    "SELECT update_square_sync_timestamp($1, $2)",
    [entry.brand_id, lastError]
  );

  await pool.query(
    "UPDATE square_sync_queue SET status = $1, processed_at = $2, last_error = $3 WHERE id = $4",
    [newStatus, new Date().toISOString(), lastError, entry.id]
  );

  return NextResponse.json({
    entry_id: entry.id,
    status: newStatus,
    synced: result.synced,
    errors: result.errors,
  });
}