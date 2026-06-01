"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const DEV_ADMIN_UID = "dev-user-00000000-0000-0000-0000-000000000001";

export async function forceAdminLogin(): Promise<{ success: boolean; uid?: string; error?: string }> {
  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = NextResponse.next();
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
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

  // Upsert dev platform_admin record
  const { data: existing } = await supabase
    .from("admin_users")
    .select("id, role")
    .eq("user_id", DEV_ADMIN_UID)
    .single();

  if (!existing) {
    const { error: insertError } = await supabase
      .from("admin_users")
      .insert({
        user_id: DEV_ADMIN_UID,
        brand_id: null,
        role: "platform_admin",
        active: true,
        can_manage_products: true,
        can_manage_stops: true,
        can_manage_orders: true,
        can_manage_pickup: true,
        can_manage_messages: true,
        can_manage_refunds: true,
        can_manage_users: true,
        can_manage_water_log: true,
        can_manage_reports: true,
        can_manage_settings: true,
        must_change_password: false,
      });

    if (insertError) {
      return { success: false, error: insertError.message };
    }
  }

  return { success: true, uid: DEV_ADMIN_UID };
}
