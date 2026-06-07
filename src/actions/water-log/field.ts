"use server";

import { cookies } from "next/headers";

// TODO(migration): the water-log field UI used a chain of Supabase RPCs
// (`get_water_headgates`, `verify_water_pin`, `get_water_user_by_id`,
// `submit_water_entry`, `trigger_water_alert`,
// `get_water_admin_session`) and tables (`water_headgates`,
// `water_users`, `water_sessions`, `water_admin_sessions`,
// `water_entries`, `water_alert_log`) that are not in the SaaS
// rebuild's `db/schema/`. The actions below preserve the original
// signatures and return empty / no-op responses so the field UI
// degrades gracefully. See `actions/route-trace/lots.ts` for the
// same pattern.

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

const NOT_CONFIGURED = "Water log is not configured in the SaaS rebuild";

export async function getWaterHeadgates(
  _brandId: string,
  _activeOnly = false
): Promise<Headgate[]> {
  return [];
}

export async function verifyWaterPin(
  _brandId: string,
  _pin: string
): Promise<VerifyPinResult> {
  return { success: false, error: NOT_CONFIGURED };
}

export async function submitWaterEntry(
  _headgateId: string,
  _measurement: number,
  _unit: string,
  _notes: string,
  _photoUrl?: string,
  _latitude?: number,
  _longitude?: number,
  _headgateLocked?: boolean
): Promise<SubmitEntryResult> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("wl_session")?.value;

  if (!sessionId) {
    return { success: false, error: "Not logged in" };
  }

  return { success: false, error: NOT_CONFIGURED };
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

export async function getWaterAdminSession(): Promise<{
  user_id: string;
  name: string;
  role: string;
} | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("wl_admin_session")?.value;

  if (!sessionId) return null;

  return null;
}
