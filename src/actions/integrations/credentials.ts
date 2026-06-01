"use server";

import { getAdminUser } from "@/lib/admin-permissions";
import { svcHeaders } from "@/lib/svc-headers";

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
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/get_resend_credentials`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({ p_brand_id: brandId }),
    }
  );

  if (!response.ok) {
    return { api_key: null, from_email: null, from_name: null };
  }

  const data = await response.json();
  return {
    api_key: data?.api_key ?? null,
    from_email: data?.from_email ?? null,
    from_name: data?.from_name ?? null,
  };
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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  // Get current credentials to merge
  const current = await getResendCredentials(brandId);
  const merged = {
    api_key: credentials.api_key !== undefined ? credentials.api_key : current.api_key,
    from_email: credentials.from_email !== undefined ? credentials.from_email : current.from_email,
    from_name: credentials.from_name !== undefined ? credentials.from_name : current.from_name,
  };

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/set_resend_credentials`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({
        p_brand_id: brandId,
        p_credentials: merged,
      }),
    }
  );

  if (!response.ok) {
    return { success: false, error: "Failed to save Resend credentials" };
  }

  return { success: true };
}

// ── Twilio Credentials ─────────────────────────────────────────────────────────

export async function getTwilioCredentials(brandId: string): Promise<TwilioCredentials> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/get_twilio_credentials`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({ p_brand_id: brandId }),
    }
  );

  if (!response.ok) {
    return { account_sid: null, auth_token: null, phone_number: null };
  }

  const data = await response.json();
  return {
    account_sid: data?.account_sid ?? null,
    auth_token: data?.auth_token ?? null,
    phone_number: data?.phone_number ?? null,
  };
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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  // Get current credentials to merge
  const current = await getTwilioCredentials(brandId);
  const merged = {
    account_sid: credentials.account_sid !== undefined ? credentials.account_sid : current.account_sid,
    auth_token: credentials.auth_token !== undefined ? credentials.auth_token : current.auth_token,
    phone_number: credentials.phone_number !== undefined ? credentials.phone_number : current.phone_number,
  };

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/set_twilio_credentials`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({
        p_brand_id: brandId,
        p_credentials: merged,
      }),
    }
  );

  if (!response.ok) {
    return { success: false, error: "Failed to save Twilio credentials" };
  }

  return { success: true };
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