import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { pool } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const { brandId, pin } = await request.json();
    if (!brandId || !pin) {
      return NextResponse.json({ success: false, error: "Missing params" }, { status: 400 });
    }

    // Get admin settings
    const settingsRes = await pool.query<{
      get_water_admin_settings: { enabled: boolean; session_duration_hours?: number } | null;
    }>(
      `SELECT get_water_admin_settings($1) AS "get_water_admin_settings"`,
      [brandId],
    );
    const settings = settingsRes.rows[0]?.get_water_admin_settings;
    if (!settings?.enabled) {
      return NextResponse.json({ success: false, error: "Admin portal not enabled" }, { status: 403 });
    }

    // Verify PIN
    const verifyRes = await pool.query<{
      verify_water_admin_pin: { success: boolean; session_id?: string } | null;
    }>(
      `SELECT verify_water_admin_pin($1, $2) AS "verify_water_admin_pin"`,
      [brandId, pin],
    );
    const verifyData = verifyRes.rows[0]?.verify_water_admin_pin;
    if (!verifyData?.success || !verifyData.session_id) {
      return NextResponse.json({ success: false, error: "Invalid PIN" }, { status: 401 });
    }

    // Create session cookie
    const sessionId = verifyData.session_id;
    const cookieStore = await cookies();
    const durationHours = settings.session_duration_hours ?? 4;
    cookieStore.set("wl_admin_session", sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: durationHours * 3600,
      path: "/",
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
