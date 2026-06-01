import { NextResponse } from "next/server";

export async function GET() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

  if (!serviceKey || !supabaseUrl) {
    return NextResponse.json({ error: "Missing env vars", serviceKey: !!serviceKey, supabaseUrl: !!supabaseUrl }, { status: 500 });
  }

  // Test 1: just a simple health endpoint that doesn't require the key
  let healthResult = null;
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: { apikey: serviceKey },
    });
    healthResult = { status: res.status, ok: res.ok };
  } catch (e: any) {
    healthResult = { error: e?.message };
  }

  // Test 2: try admin_users with POST (bypasses RLS select policies)
  let adminResult = null;
  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/admin_users?select=id,user_id,role,email,display_name&limit=5`,
      {
        method: "GET",
        headers: {
          apikey: serviceKey,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
      }
    );
    const body = await res.text();
    let parsed = null;
    try { parsed = JSON.parse(body); } catch { parsed = body; }
    adminResult = { status: res.status, body: parsed };
  } catch (e: any) {
    adminResult = { error: e?.message };
  }

  return NextResponse.json({ healthResult, adminResult, serviceKeyLen: serviceKey.length });
}