import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  const { email, password } = await request.json().catch(() => ({}));

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: "Server misconfiguration." }, { status: 500 });
  }

  const authRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: supabaseAnonKey },
    body: JSON.stringify({ email, password }),
  });

  const authData = await authRes.json().catch(() => null);

  if (!authRes.ok || !authData?.access_token) {
    const msg = authData?.error_description ?? authData?.error ?? "Invalid credentials.";
    return NextResponse.json({ ok: false, error: msg }, { status: 401 });
  }

  const userId = authData.user?.id ?? authData.user_id;
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Auth succeeded but user ID missing." }, { status: 500 });
  }

  // Set cookie + return JSON — client reads this and navigates
  const isProd = process.env.NODE_ENV === "production";
  const response = NextResponse.json({ ok: true });
  response.cookies.set("rc_auth_uid", userId, {
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
  });

  return response;
}