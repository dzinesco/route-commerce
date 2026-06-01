"use server";

import { cookies } from "next/headers";
import { svcHeaders } from "@/lib/svc-headers";

type VerifyPinResult = {
  success: true;
  user_id: string;
  name: string;
  role: string;
  session_id: string;
  lang: string;
} | {
  success: false;
  error: string;
};

type SubmitEntryResult = {
  success: true;
  entry_id: string;
} | {
  success: false;
  error: string;
};

type Headgate = {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
};

type HeadgatesResult = {
  headgates: Headgate[];
};

export async function getWaterHeadgates(brandId: string, activeOnly = false): Promise<Headgate[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/get_water_headgates`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({ p_brand_id: brandId, p_active_only: activeOnly }),
    }
  );

  if (!response.ok) return [];
  const data = await response.json();
  return data?.headgates ?? [];
}

export async function verifyWaterPin(brandId: string, pin: string): Promise<VerifyPinResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/verify_water_pin`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({ p_brand_id: brandId, p_pin: pin }),
    }
  );

  const data = await response.json();

  if (!response.ok || !data?.success) {
    return { success: false, error: data?.error ?? "Invalid PIN" };
  }

  // Get user's language preference via SECURITY DEFINER RPC (avoids direct table access)
  const userResponse = await fetch(
    `${supabaseUrl}/rest/v1/rpc/get_water_user_by_id`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({ p_user_id: data.user_id }),
    }
  );
  const userData = await userResponse.json();
  const lang = userData?.language_preference ?? "en";

  // Use the session already created by verify_water_pin RPC
  const sessionId = data.session_id;

  if (!sessionId) {
    return { success: false, error: "Failed to create session" };
  }

  // Set HTTP-only session cookie
  const cookieStore = await cookies();
  cookieStore.set("wl_session", sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 4 * 60 * 60, // 4 hours
    path: "/",
  });
  cookieStore.set("wl_lang", lang, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  });

  return {
    success: true,
    user_id: data.user_id,
    name: data.name,
    role: data.role,
    session_id: sessionId,
    lang,
  };
}

export async function submitWaterEntry(
  headgateId: string,
  measurement: number,
  unit: string,
  notes: string,
  photoUrl?: string,
  latitude?: number,
  longitude?: number,
  headgateLocked?: boolean
): Promise<SubmitEntryResult> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("wl_session")?.value;

  if (!sessionId) {
    return { success: false, error: "Not logged in" };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/submit_water_entry`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({
        p_session_id: sessionId,
        p_headgate_id: headgateId,
        p_measurement: measurement,
        p_unit: unit,
        p_notes: notes,
        p_submitted_via: "field",
        p_photo_url: photoUrl ?? null,
        p_latitude: latitude ?? null,
        p_longitude: longitude ?? null,
        p_headgate_locked: headgateLocked ?? false,
      }),
    }
  );

  const data = await response.json();

  if (!data?.success) {
    return { success: false, error: data?.error ?? "Failed to submit entry" };
  }

  const entryId = data.entry_id as string;

  // ── Alert check (fire-and-forget, non-blocking) ─────────────────
  try {
    const alertRes = await fetch(
      `${supabaseUrl}/rest/v1/rpc/trigger_water_alert`,
      {
        method: "POST",
        headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
        body: JSON.stringify({
          p_entry_id: entryId,
          p_alert_type: "high",
          p_threshold_value: measurement,
          p_reading_value: measurement,
        }),
      }
    );
    const highData = await alertRes.json();
    // If not triggered as high, try low
    if (!highData?.triggered) {
      await fetch(
        `${supabaseUrl}/rest/v1/rpc/trigger_water_alert`,
        {
          method: "POST",
          headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
          body: JSON.stringify({
            p_entry_id: entryId,
            p_alert_type: "low",
            p_threshold_value: measurement,
            p_reading_value: measurement,
          }),
        }
      );
    }
  } catch {
    // Alert failures should not affect entry submission success
  }

  return { success: true, entry_id: entryId };
}

export async function logoutWater(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete("wl_session");
}

export async function logoutWaterAdmin(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete("wl_admin_session");
}

export async function getWaterSession(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get("wl_session")?.value ?? null;
}

export async function setWaterLang(lang: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set("wl_lang", lang, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
}

export async function getWaterAdminSession(): Promise<{ user_id: string; name: string; role: string } | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("wl_admin_session")?.value;

  if (!sessionId) return null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // Use get_water_admin_session RPC (SECURITY DEFINER) to avoid direct water_sessions + water_users JOIN
  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/get_water_admin_session`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({ p_session_id: sessionId }),
    }
  );

  if (!response.ok) return null;
  const data = await response.json();
  return data;
};