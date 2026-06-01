import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { svcHeaders } from "@/lib/svc-headers";

export async function POST(request: Request) {
  try {
    const { brandId, pin } = await request.json();
    if (!brandId || !pin) {
      return NextResponse.json({ success: false, error: "Missing params" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    // Get admin settings
    const settingsRes = await fetch(
      `${supabaseUrl}/rest/v1/rpc/get_water_admin_settings`,
      {
        method: "POST",
        headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
        body: JSON.stringify({ p_brand_id: brandId }),
      }
    );
    const settings = await settingsRes.json();
    if (!settingsRes.ok || !settings?.enabled) {
      return NextResponse.json({ success: false, error: "Admin portal not enabled" }, { status: 403 });
    }

    // Verify PIN
    const verifyRes = await fetch(
      `${supabaseUrl}/rest/v1/rpc/verify_water_admin_pin`,
      {
        method: "POST",
        headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
        body: JSON.stringify({ p_brand_id: brandId, p_pin: pin }),
      }
    );
    const verifyData = await verifyRes.json();
    if (!verifyRes.ok || !verifyData?.success) {
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