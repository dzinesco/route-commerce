import { NextResponse } from "next/server";

const DEV_ADMIN_UID = "dev-user-00000000-0000-0000-0000-000000000001";
const DEV_ROLES = ["platform_admin", "brand_admin", "store_employee"];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const role = url.searchParams.get("role") ?? "platform_admin";
  const safeRole = DEV_ROLES.includes(role) ? role : "platform_admin";

  const origin = url.origin;

  const response = NextResponse.redirect(new URL("/admin", origin));

  const cookieOptions = {
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    sameSite: "lax" as const,
  };

  response.cookies.set("dev_session", safeRole, {
    ...cookieOptions,
    httpOnly: false,
  });
  response.cookies.set("rc_auth_uid", DEV_ADMIN_UID, {
    ...cookieOptions,
    httpOnly: false,
  });

  return response;
}