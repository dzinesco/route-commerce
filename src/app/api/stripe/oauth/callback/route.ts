import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin-permissions";
import { savePaymentSettings } from "@/actions/payments";

export async function GET(req: Request) {
  const adminUser = await getAdminUser();
  if (!adminUser || !adminUser.brand_id) {
    return NextResponse.redirect(new URL("/admin/settings/payments?error=unauthorized", req.url));
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const state = url.searchParams.get("state");

  // Handle error from Stripe
  if (error) {
    return NextResponse.redirect(
      new URL(`/admin/settings/payments?stripe_error=${encodeURIComponent(error)}`, req.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/admin/settings/payments?stripe_error=no_code", req.url)
    );
  }

  // Decode state to get brandId
  let brandId = adminUser.brand_id;
  if (state) {
    try {
      const decoded = JSON.parse(Buffer.from(state, "base64").toString());
      if (decoded.brandId) {
        brandId = decoded.brandId;
      }
    } catch {}
  }

  // Exchange code for access token
  const clientId = process.env.STRIPE_CLIENT_ID;
  const clientSecret = process.env.STRIPE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL("/admin/settings/payments?stripe_error=oauth_not_configured", req.url)
    );
  }

  try {
    // Exchange authorization code for access token
    const tokenResponse = await fetch("https://connect.stripe.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      return NextResponse.redirect(
        new URL(`/admin/settings/payments?stripe_error=${encodeURIComponent(tokenData.error_description || tokenData.error)}`, req.url)
      );
    }

    // Save the Stripe credentials
    const stripeUserId = tokenData.stripe_user_id; // This is the connected account ID
    const accessToken = tokenData.access_token;
    const publishableKey = tokenData.stripe_publishable_key;

    // Save to database via server action
    const result = await savePaymentSettings({
      brandId,
      provider: "stripe",
      stripePublishableKey: publishableKey || undefined,
      stripeSecretKey: accessToken, // Store access token as secret key
      stripeUserId, // Store the connected account ID
    });

    if (result.success) {
      return NextResponse.redirect(
        new URL("/admin/settings/payments?stripe_connected=true", req.url)
      );
    } else {
      return NextResponse.redirect(
        new URL(`/admin/settings/payments?stripe_error=${encodeURIComponent(result.error || "Failed to save")}`, req.url)
      );
    }
  } catch (err) {
    return NextResponse.redirect(
      new URL(`/admin/settings/payments?stripe_error=${encodeURIComponent("Failed to complete OAuth")}`, req.url)
    );
  }
}