import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();
  const rcAuthUid = cookieStore.get("rc_auth_uid")?.value;
  const rcUid = cookieStore.get("rc_uid")?.value;

  return NextResponse.json({
    received_cookies: allCookies.map(c => ({ name: c.name, value_len: c.value.length })),
    rc_auth_uid: rcAuthUid ? `${rcAuthUid.slice(0, 8)}...` : "MISSING",
    rc_uid: rcUid ? `${rcUid.slice(0, 8)}...` : "MISSING",
    raw_rc_auth_uid: rcAuthUid ?? null,
  });
}
