import { NextResponse } from "next/server";
import { svcHeaders } from "@/lib/svc-headers";

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "Missing configuration" }, { status: 500 });
  }

  const response = await fetch(
    `${supabaseUrl}/functions/v1/send-scheduled-campaigns`,
    { headers: { ...svcHeaders(supabaseKey!), "Content-Type": "application/json" } }
  );

  const text = await response.text();

  if (!response.ok) {
    return NextResponse.json({ error: "Failed to send campaigns", detail: text }, { status: 500 });
  }

  let results: unknown[] = [];
  try {
    const data = JSON.parse(text);
    if (data && typeof data === "object") {
      const d = data as Record<string, unknown>;
      if (Array.isArray(d.results)) results = d.results as unknown[];
      else if (Array.isArray(d.send_scheduled_campaigns)) results = d.send_scheduled_campaigns as unknown[];
      else if (Array.isArray(data)) results = data as unknown[];
    }
  } catch { /* ignore */ }

  return NextResponse.json({ success: true, timestamp: new Date().toISOString(), results });
}