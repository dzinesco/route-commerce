"use server";

import { cookies, headers } from "next/headers";
import { auth } from "@/lib/auth";

export type WholesaleLoginResult =
  | { success: true; token: string; userId: string; customerId: string }
  | { success: false; error: string };

export async function wholesaleLoginAction(formData: FormData): Promise<WholesaleLoginResult> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  try {
    const hdrs = await headers();
    const result = await auth.api.signInEmail({
      body: { email, password },
      headers: hdrs,
      asResponse: false,
    });

    if (!result?.user) {
      return { success: false, error: "Invalid credentials" };
    }

    const cookieStore = await cookies();
    // Better Auth sets its own session cookie (rc_session_token).
    // Mark wholesale session for portal routing.
    cookieStore.set("wholesale_session", JSON.stringify({
      user_id: result.user.id,
    }), {
      path: "/",
      maxAge: 3600 * 24 * 7,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      httpOnly: false,
    });

    return {
      success: true,
      token: "better-auth-session", // session lives in cookie
      userId: result.user.id,
      customerId: "pending", // resolved by portal page on load
    };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Invalid credentials";
    return { success: false, error: message };
  }
}

export async function wholesaleLogoutAction() {
  try {
    const hdrs = await headers();
    await auth.api.signOut({ headers: hdrs });
  } catch {
    // best-effort
  }

  const cookieStore = await cookies();
  cookieStore.delete("wholesale_session");

  return { success: true };
}
