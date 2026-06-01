import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  const cookieStore = await cookies();
  // Clear all auth cookies (new + legacy)
  cookieStore.delete("rc_access_token");
  cookieStore.delete("rc_uid");
  cookieStore.delete("rc_auth_uid");
  cookieStore.delete("rc_auth_token");
  return NextResponse.json({ success: true });
}
