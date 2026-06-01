"use server";

import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { svcHeaders } from "@/lib/svc-headers";

export type WholesaleLoginResult =
  | { success: true; token: string; userId: string; customerId: string }
  | { success: false; error: string };

export async function wholesaleLoginAction(formData: FormData): Promise<WholesaleLoginResult> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const cookieStore = await cookies();
  const request = new NextRequest("http://localhost/wholesale/login", {
    headers: new Headers(),
  });
  const response = NextResponse.next({ request });

  const { createServerClient } = await import("@supabase/ssr");
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
        Object.entries(headers).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
      },
    },
  });

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    return { success: false, error: error?.message ?? "Invalid credentials" };
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;

  if (!token) {
    return { success: false, error: "No session returned from auth" };
  }

  // Find the wholesale customer record for this user
  const customerRes = await fetch(
    `${supabaseUrl}/rest/v1/rpc/get_wholesale_customer_by_user`,
    {
      method: "POST",
      headers: {
        ...svcHeaders(supabaseAnonKey),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        p_brand_id: "placeholder", // will use any-brand lookup below
        p_user_id: data.user.id,
      }),
    }
  );

  // If no brand_id known, try all brands — just use first active one found
  // For now, set the cookie with user_id and a placeholder; portal will resolve proper customer
  response.cookies.set("wholesale_session", JSON.stringify({
    user_id: data.user.id,
    access_token: token,
  }), {
    path: "/",
    maxAge: 3600 * 24 * 7,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    httpOnly: false,
  });

  // Also set the standard auth token for RPC calls
  response.cookies.set("sb-wnzkhezyhnfzhkhiflrp-auth-token", token, {
    path: "/",
    maxAge: 3600 * 24 * 7,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    httpOnly: false,
  });

  return {
    success: true,
    token,
    userId: data.user.id,
    customerId: "pending", // resolved by portal page on load
  };
}

export async function wholesaleLogoutAction() {
  const cookieStore = await cookies();
  const request = new NextRequest("http://localhost/wholesale/portal", {
    headers: new Headers(),
  });
  const response = NextResponse.next({ request });

  response.cookies.delete("wholesale_session");

  const { createServerClient } = await import("@supabase/ssr");
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  await supabase.auth.signOut();

  return { success: true };
}