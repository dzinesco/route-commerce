import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin-permissions";

export async function GET(req: Request) {
  const adminUser = await getAdminUser();
  if (!adminUser || !adminUser.brand_id) {
    return NextResponse.redirect(new URL("/admin/settings/payments?error=unauthorized", req.url));
  }
  if (!adminUser.can_manage_settings) {
    return NextResponse.redirect(new URL("/admin/settings/payments?error=forbidden", req.url));
  }

  const clientId = process.env.STRIPE_CLIENT_ID;
  const clientSecret = process.env.STRIPE_CLIENT_SECRET;
  const env = process.env.STRIPE_ENVIRONMENT ?? "test";

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL("/admin/settings/payments?error=stripe_oauth_not_configured", req.url)
    );
  }

  const baseUrl = env === "production"
    ? "https://connect.stripe.com"
    : "https://connect.stripe.com/oauth/authorize";

  const origin = new URL(req.url).origin;
  const redirectUri = `${origin}/api/stripe/oauth/callback`;

  // Encode brand_id in state so callback knows which brand to associate
  const state = Buffer.from(JSON.stringify({ brandId: adminUser.brand_id })).toString("base64");

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: "read_only", // Use read_only for safety - can upgrade to full later
    redirect_uri: redirectUri,
    state,
  });

  return NextResponse.redirect(`${baseUrl}?${params}`);
}