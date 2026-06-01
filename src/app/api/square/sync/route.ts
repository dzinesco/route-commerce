import { NextResponse } from "next/server";
import { syncProductsToSquare } from "@/actions/square-products";
import { getAdminUser } from "@/lib/admin-permissions";
import { svcHeaders } from "@/lib/svc-headers";

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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const claimRes = await fetch(
    `${supabaseUrl}/rest/v1/rpc/claim_square_sync_queue`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json", "Prefer": "return=representation" },
      body: JSON.stringify({ p_brand_id: brandId }),
    }
  );

  if (!claimRes.ok) {
    const errText = await claimRes.text();
    return NextResponse.json({ error: `Failed to claim queue: ${errText}` }, { status: 500 });
  }

  const entries = await claimRes.json();
  if (!entries || entries.length === 0 || entries[0] === null) {
    return NextResponse.json({ processed: 0, message: "No pending entries" });
  }

  const entry = entries[0];
  const result = await syncProductsToSquare(entry.brand_id);

  const newStatus = result.success ? "done" : "failed";
  const lastError = result.errors.length > 0 ? result.errors[0] : null;

  await fetch(
    `${supabaseUrl}/rest/v1/rpc/update_square_sync_timestamp`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({
        p_brand_id: entry.brand_id,
        p_error: lastError,
      }),
    }
  );

  await fetch(
    `${supabaseUrl}/rest/v1/square_sync_queue?id=eq.${entry.id}`,
    {
      method: "PATCH",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({
        status: newStatus,
        processed_at: new Date().toISOString(),
        last_error: lastError,
      }),
    }
  );

  return NextResponse.json({
    entry_id: entry.id,
    status: newStatus,
    synced: result.synced,
    errors: result.errors,
  });
}