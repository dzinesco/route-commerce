import { NextResponse } from "next/server";
import { svcHeaders } from "@/lib/svc-headers";

// Server-side proxy for Supabase REST calls from Client Components.
// Client components cannot import "use server" modules, so they route
// all Supabase calls through here to avoid Bearer JWT header issues
// on Vercel Edge Runtime.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

export async function POST(request: Request) {
  try {
    const { table, method = "GET", body, params, headers: extraHeaders } = await request.json();

    if (!table) {
      return NextResponse.json({ error: "table is required" }, { status: 400 });
    }

    // Build URL — params are query string key=value pairs
    let url = `${SUPABASE_URL}/rest/v1/${table}`;
    if (params) {
      const qs = Object.entries(params as Record<string, string>)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join("&");
      if (qs) url += `?${qs}`;
    }

    // Determine which key to use — prefer ANON_KEY for client-facing reads
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const fetchOptions: RequestInit = {
      method: method.toUpperCase(),
      headers: {
        ...svcHeaders(supabaseKey),
        "Content-Type": "application/json",
        ...extraHeaders,
      },
    };

    if (body && !["GET", "HEAD"].includes(method.toUpperCase())) {
      fetchOptions.body = JSON.stringify(body);
    }

    const res = await fetch(url, fetchOptions);
    const data = await res.json().catch(() => null);

    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Proxy error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}