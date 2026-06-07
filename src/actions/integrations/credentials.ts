"use server";

import { getAdminUser } from "@/lib/admin-permissions";
import { pool } from "@/lib/db";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ResendCredentials = {
  api_key: string | null;
  from_email: string | null;
  from_name: string | null;
};

export type TwilioCredentials = {
  account_sid: string | null;
  auth_token: string | null;
  phone_number: string | null;
};

export type SaveCredentialsResult =
  | { success: true }
  | { success: false; error: string };

// ── Resend Credentials ─────────────────────────────────────────────────────────

export async function getResendCredentials(brandId: string): Promise<ResendCredentials> {
  try {
    const res = await pool.query<{
      api_key: string | null;
      from_email: string | null;
      from_name: string | null;
    }>(
      "SELECT * FROM get_resend_credentials($1)",
      [brandId]
    );
    const data = res.rows[0];
    if (!data) return { api_key: null, from_email: null, from_name: null };
    return {
      api_key: data.api_key ?? null,
      from_email: data.from_email ?? null,
      from_name: data.from_name ?? null,
    };
  } catch {
    return { api_key: null, from_email: null, from_name: null };
  }
}

export async function saveResendCredentials(
  brandId: string,
  credentials: Partial<{
    api_key: string | null;
    from_email: string | null;
    from_name: string | null;
  }>
): Promise<SaveCredentialsResult> {
  const adminUser = await getAdminUser();
  if (!adminUser) {
    return { success: false, error: "Not authenticated" };
  }

  // Brand scoping: brand_admin can only modify their own brand's settings
  if (adminUser.role === "brand_admin" && adminUser.brand_id !== brandId) {
    return { success: false, error: "Not authorized" };
  }

  // Get current credentials to merge
  const current = await getResendCredentials(brandId);
  const merged = {
    api_key: credentials.api_key !== undefined ? credentials.api_key : current.api_key,
    from_email: credentials.from_email !== undefined ? credentials.from_email : current.from_email,
    from_name: credentials.from_name !== undefined ? credentials.from_name : current.from_name,
  };

  try {
    await pool.query(
      "SELECT set_resend_credentials($1, $2::jsonb)",
      [brandId, JSON.stringify(merged)]
    );
    return { success: true };
  } catch {
    return { success: false, error: "Failed to save Resend credentials" };
  }
}

// ── Twilio Credentials ─────────────────────────────────────────────────────────

export async function getTwilioCredentials(brandId: string): Promise<TwilioCredentials> {
  try {
    const res = await pool.query<{
      account_sid: string | null;
      auth_token: string | null;
      phone_number: string | null;
    }>(
      "SELECT * FROM get_twilio_credentials($1)",
      [brandId]
    );
    const data = res.rows[0];
    if (!data) return { account_sid: null, auth_token: null, phone_number: null };
    return {
      account_sid: data.account_sid ?? null,
      auth_token: data.auth_token ?? null,
      phone_number: data.phone_number ?? null,
    };
  } catch {
    return { account_sid: null, auth_token: null, phone_number: null };
  }
}

export async function saveTwilioCredentials(
  brandId: string,
  credentials: Partial<{
    account_sid: string | null;
    auth_token: string | null;
    phone_number: string | null;
  }>
): Promise<SaveCredentialsResult> {
  const adminUser = await getAdminUser();
  if (!adminUser) {
    return { success: false, error: "Not authenticated" };
  }

  // Brand scoping: brand_admin can only modify their own brand's settings
  if (adminUser.role === "brand_admin" && adminUser.brand_id !== brandId) {
    return { success: false, error: "Not authorized" };
  }

  // Get current credentials to merge
  const current = await getTwilioCredentials(brandId);
  const merged = {
    account_sid: credentials.account_sid !== undefined ? credentials.account_sid : current.account_sid,
    auth_token: credentials.auth_token !== undefined ? credentials.auth_token : current.auth_token,
    phone_number: credentials.phone_number !== undefined ? credentials.phone_number : current.phone_number,
  };

  try {
    await pool.query(
      "SELECT set_twilio_credentials($1, $2::jsonb)",
      [brandId, JSON.stringify(merged)]
    );
    return { success: true };
  } catch {
    return { success: false, error: "Failed to save Twilio credentials" };
  }
}

// ── Test Connection Functions ─────────────────────────────────────────────────

export async function testResendConnection(apiKey: string): Promise<{
  ok: boolean;
  message: string;
}> {
  if (!apiKey?.trim()) {
    return { ok: false, message: "API key is required" };
  }

  try {
    const response = await fetch("https://api.resend.com/domains", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      return { ok: true, message: "Successfully connected to Resend" };
    } else {
      const error = await response.json().catch(() => ({ message: "Invalid API key" }));
      return { ok: false, message: error.message ?? "Connection failed" };
    }
  } catch (err) {
    return { ok: false, message: "Network error - please check your connection" };
  }
}

export async function testTwilioConnection(
  accountSid: string,
  authToken: string
): Promise<{ ok: boolean; message: string }> {
  if (!accountSid?.trim() || !authToken?.trim()) {
    return { ok: false, message: "Account SID and Auth Token are required" };
  }

  try {
    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`,
      {
        method: "GET",
        headers: {
          Authorization: `Basic ${credentials}`,
        },
      }
    );

    if (response.ok) {
      return { ok: true, message: "Successfully connected to Twilio" };
    } else {
      return { ok: false, message: "Invalid Account SID or Auth Token" };
    }
  } catch (err) {
    return { ok: false, message: "Network error - please check your connection" };
  }
}
