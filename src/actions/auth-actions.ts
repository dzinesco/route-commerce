"use server";

import { signIn, signOut } from "@/lib/auth";
import { AuthError } from "next-auth";

export type SignInResult = { ok: true } | { ok: false; error: string };

/**
 * Sign in with the email/password (Supabase-backed) Credentials provider
 * configured in src/lib/auth.ts.
 */
export async function signInWithPassword(
  _prev: SignInResult | null,
  formData: FormData
): Promise<SignInResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email) return { ok: false, error: "Please enter your email address." };
  if (!password) return { ok: false, error: "Please enter your password." };

  try {
    await signIn("supabase-password", {
      email,
      password,
      redirect: false,
    });
    return { ok: true };
  } catch (err) {
    if (err instanceof AuthError) {
      return { ok: false, error: "Invalid email or password." };
    }
    throw err;
  }
}

/**
 * Kick off the Google OAuth flow. Auth.js will redirect to Google's consent
 * screen and then back to /api/auth/callback/google, which sets the session
 * cookie and redirects to the configured callback URL.
 */
export async function signInWithGoogle(): Promise<void> {
  await signIn("google", { redirectTo: "/admin" });
}

/**
 * Sign out and clear the Auth.js session cookie.
 */
export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}
