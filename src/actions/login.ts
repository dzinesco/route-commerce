"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export type LoginWithPasswordResult =
  | { success: true; redirect: true }
  | { success: false; error: string };

export async function loginWithPassword(
  email: string,
  password: string
): Promise<LoginWithPasswordResult> {
  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return { success: false, error: "Server misconfiguration." };
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    return { success: false, error: error?.message || "Invalid credentials" };
  }

  // Set the rc_auth_uid cookie that getAdminUser() reads
  const isProd = process.env.NODE_ENV === "production";
  cookieStore.set("rc_auth_uid", data.user.id, {
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
  });

  return { success: true, redirect: true };
}
