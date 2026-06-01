import { NextResponse } from "next/server";
import { headers } from "next/headers";

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = formData.get("email") as string;

  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: "Server misconfiguration." }, { status: 500 });
  }

  const origin = (await headers()).get("origin") ?? "http://localhost:3000";

  const res = await fetch(`${supabaseUrl}/auth/v1/recover`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: supabaseAnonKey,
    },
    body: JSON.stringify({ email, redirectTo: `${origin}/auth/callback` }),
  });

  // Always return 200 to avoid email enumeration — Supabase may still send or not
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    return NextResponse.json({ error: data?.message ?? "Failed to send reset link." }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
