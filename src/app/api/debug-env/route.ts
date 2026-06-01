import { NextResponse } from "next/server";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const nodeEnv = process.env.NODE_ENV;

  const result = {
    NODE_ENV: nodeEnv,
    NEXT_PUBLIC_SUPABASE_URL: url ? `${url.substring(0, 40)}... (SET)` : "MISSING",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: key ? `${key.substring(0, 20)}... (SET)` : "MISSING",
    SUPABASE_SERVICE_ROLE_KEY: serviceKey ? `${serviceKey.substring(0, 20)}... (SET)` : "MISSING",
    supabaseClientCanCreate: false as boolean,
    error: null as string | null,
  };

  if (url && key) {
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const client = createClient(url, key);
      result.supabaseClientCanCreate = true;
    } catch (e: any) {
      result.error = e?.message ?? String(e);
    }
  } else {
    result.error = "Missing env vars";
  }

  return NextResponse.json(result, { status: 200 });
}