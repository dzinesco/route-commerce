import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminUser } from "@/lib/admin-permissions";

export async function GET(req: Request) {
  const adminUser = await getAdminUser();
  if (!adminUser || !adminUser.brand_id) {
    return NextResponse.redirect(new URL("/admin/settings/payments?error=unauthorized", req.url));
  }
  if (!adminUser.can_manage_settings) {
    return NextResponse.redirect(new URL("/admin/settings/payments?error=forbidden", req.url));
  }

  const appId = process.env.NEXT_PUBLIC_SQUARE_APP_ID;
  const env = process.env.SQUARE_ENVIRONMENT ?? "sandbox";

  if (!appId) {
    return NextResponse.redirect(
      new URL("/admin/settings/payments?error=square_app_id_not_configured", req.url)
    );
  }

  const baseUrl = env === "production"
    ? "https://connect.squareup.com"
    : "https://connect.squareupsandbox.com";

  const origin = new URL(req.url).origin;
  const redirectUri = `${origin}/api/square/oauth/callback`;

  // Encode brand_id in state so callback knows which brand to associate
  const state = Buffer.from(JSON.stringify({ brandId: adminUser.brand_id })).toString("base64");

  const params = new URLSearchParams({
    client_id: appId,
    scope: [
      "ITEMS_READ",
      "ITEMS_WRITE",
      "ORDERS_READ",
      "ORDERS_WRITE",
      "INVENTORY_READ",
      "INVENTORY_WRITE",
      "PAYMENTS_READ",
      "PAYMENTS_WRITE",
    ].join(" "),
    response_type: "code",
    redirect_uri: redirectUri,
    state,
  });

  return NextResponse.redirect(`${baseUrl}/oauth2/authorize?${params}`);
}
