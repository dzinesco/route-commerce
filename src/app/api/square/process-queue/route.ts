import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin-permissions";
import { syncProductsToSquare, syncProductsFromSquare } from "@/actions/square-products";
import { syncOrdersFromSquare } from "@/actions/square-orders";
import { getPaymentSettings } from "@/actions/payments";
import { pool } from "@/lib/db";

export async function POST(request: Request) {
  const adminUser = await getAdminUser();
  if (!adminUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { brandId?: string; type?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const brandId = body.brandId;
  if (!brandId) {
    return NextResponse.json({ error: "brandId required" }, { status: 400 });
  }

  if (adminUser.role === "brand_admin" && adminUser.brand_id !== brandId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const type = body.type ?? "all";
  const results: Record<string, { synced: number; errors: string[] }> = {};

  // Load settings once for reuse
  const settingsResult = await getPaymentSettings(brandId);
  const settings = settingsResult.success ? settingsResult.settings : null;

  if (!settings?.square_access_token) {
    return NextResponse.json({ error: "Square not connected" }, { status: 400 });
  }

  const syncErrors: string[] = [];

  if (type === "products" || type === "all") {
    // Sync both directions: RC → Square and Square → RC
    const [toResult, fromResult] = await Promise.all([
      syncProductsToSquare(brandId),
      syncProductsFromSquare(brandId),
    ]);
    results.products_to_square = { synced: toResult.synced, errors: toResult.errors };
    results.products_from_square = { synced: fromResult.synced, errors: fromResult.errors };
    syncErrors.push(...toResult.errors, ...fromResult.errors);
  }

  if (type === "orders" || type === "all") {
    const orderResult = await syncOrdersFromSquare(brandId);
    results.orders = { synced: orderResult.synced, errors: orderResult.errors };
    syncErrors.push(...orderResult.errors);
  }

  // Update square_last_sync_at and square_last_sync_error
  const lastError = syncErrors.length > 0 ? syncErrors.slice(0, 5).join("; ") : null;

  await pool.query(
    "SELECT upsert_payment_settings($1, $2, $3, $4, $5, $6, $7, $8, $9)",
    [
      brandId,
      null, // provider (not changed)
      null, // stripe_publishable_key
      null, // stripe_secret_key
      null, // stripe_user_id
      null, // square_access_token
      null, // square_location_id
      true, // square_sync_enabled
      settings?.square_inventory_mode ?? "none",
    ]
  );

  return NextResponse.json({
    success: syncErrors.length === 0,
    results,
    error: syncErrors.length > 0 ? syncErrors[0] : null,
  });
}