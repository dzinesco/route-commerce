import { NextResponse } from "next/server";
import { svcHeaders } from "@/lib/svc-headers";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const origin = new URL(request.url).origin;

  if (error) {
    return NextResponse.redirect(
      new URL(`/admin/settings/payments?error=square_oauth_denied&reason=${encodeURIComponent(error)}`, request.url)
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL("/admin/settings/payments?error=square_oauth_missing_params", request.url)
    );
  }

  // Decode brand_id from state
  let brandId: string | null = null;
  try {
    const decoded = JSON.parse(Buffer.from(state, "base64").toString("utf-8"));
    brandId = decoded?.brandId ?? null;
  } catch {
    return NextResponse.redirect(
      new URL("/admin/settings/payments?error=square_oauth_invalid_state", request.url)
    );
  }

  if (!brandId) {
    return NextResponse.redirect(
      new URL("/admin/settings/payments?error=square_oauth_missing_state", request.url)
    );
  }

  // Exchange code for access token
  const appId = process.env.NEXT_PUBLIC_SQUARE_APP_ID;
  const appSecret = process.env.SQUARE_APP_SECRET;
  const env = process.env.SQUARE_ENVIRONMENT ?? "sandbox";

  if (!appId || !appSecret) {
    return NextResponse.redirect(
      new URL("/admin/settings/payments?error=square_credentials_not_configured", request.url)
    );
  }

  const tokenUrl = env === "production"
    ? "https://connect.squareup.com/v2/oauth2/token"
    : "https://connect.squareupsandbox.com/v2/oauth2/token";

  const redirectUri = `${origin}/api/square/oauth/callback`;

  let accessToken: string | null = null;
  let locationId: string | null = null;

  try {
    const tokenResponse = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Square-Version": "2025-01-16",
      },
      body: JSON.stringify({
        client_id: appId,
        client_secret: appSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || tokenData.access_token) {
      accessToken = tokenData.access_token ?? null;
      locationId = tokenData.location_id ?? null;
    } else {
      return NextResponse.redirect(
        new URL(`/admin/settings/payments?error=square_token_exchange_failed`, request.url)
      );
    }
  } catch (err) {
    return NextResponse.redirect(
      new URL("/admin/settings/payments?error=square_token_exchange_error", request.url)
    );
  }

  if (!accessToken) {
    return NextResponse.redirect(
      new URL("/admin/settings/payments?error=square_no_access_token", request.url)
    );
  }

  // Store token + location_id in payment_settings via upsert
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  try {
    const upsertResponse = await fetch(
      `${supabaseUrl}/rest/v1/rpc/upsert_payment_settings`,
      {
        method: "POST",
        headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json", Prefer: "return=representation" },
        body: JSON.stringify({
          p_brand_id: brandId,
          p_provider: "square",
          p_square_access_token: accessToken,
          p_square_location_id: locationId,
        }),
      }
    );

    if (!upsertResponse.ok) {
      return NextResponse.redirect(
        new URL("/admin/settings/payments?error=square_token_save_failed", request.url)
      );
    }
  } catch (err) {
    return NextResponse.redirect(
      new URL("/admin/settings/payments?error=square_token_save_error", request.url)
    );
  }

  return NextResponse.redirect(
    new URL("/admin/settings/payments?square_connected=true", request.url)
  );
}
