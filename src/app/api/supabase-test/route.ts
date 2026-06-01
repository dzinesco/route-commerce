import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export async function GET() {
  // Try creating supabase client — if it throws, capture the exact error
  let status: string;
  let canCreate = false;
  let errMessage = "";

  if (!url || !key) {
    status = "MISSING_ENV_VARS";
    errMessage = `url=${url ? "SET" : "MISSING"}, key=${key ? "SET" : "MISSING"}`;
  } else {
    try {
      createClient(url, key);
      canCreate = true;
      status = "OK";
    } catch (e: any) {
      errMessage = e?.message ?? String(e);
      status = "CREATE_CLIENT_FAILED";
    }
  }

  const body = JSON.stringify({
    status,
    canCreate,
    errMessage,
    envVars: {
      NODE_ENV: process.env.NODE_ENV,
      urlSet: !!url,
      urlPrefix: url ? url.substring(0, 30) : null,
      keySet: !!key,
      keyPrefix: key ? key.substring(0, 10) : null,
    },
  }, null, 2);

  return new Response(body, {
    status: status === "OK" ? 200 : 500,
    headers: { "Content-Type": "application/json" },
  });
}