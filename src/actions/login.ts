"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export type LoginWithPasswordResult =
  | { success: true; redirect: true }
  | { success: false; error: string };

export async function loginWithPassword(
  email: string,
  password: string
): Promise<LoginWithPasswordResult> {
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

    return { success: true, redirect: true };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Invalid credentials";
    return { success: false, error: message };
  }
}
