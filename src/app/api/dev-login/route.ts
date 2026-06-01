import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.redirect(new URL("/admin", "http://localhost:3000"));
  response.cookies.set("dev_session", "platform_admin", {
    path: "/",
    sameSite: "lax",
    httpOnly: false,
  });
  return response;
}

export async function GET() {
  const response = NextResponse.redirect(new URL("/admin", "http://localhost:3000"));
  response.cookies.set("dev_session", "platform_admin", {
    path: "/",
    sameSite: "lax",
    httpOnly: false,
  });
  return response;
}