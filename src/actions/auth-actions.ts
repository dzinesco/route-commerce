"use server";

import "server-only";
import { signIn, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";

/**
 * Kick off the Google OAuth flow. Auth.js will redirect to Google's
 * consent screen and then back to /api/auth/callback/google, which sets
 * the session cookie and redirects to /admin.
 */
export async function signInWithGoogle(): Promise<void> {
  await signIn("google", { redirectTo: "/admin" });
}

/**
 * Sign in with email + password. The `credentials` provider is enabled
 * in dev (see `isDevLoginEnabled()` in `src/auth.config.ts`); in
 * production it is omitted entirely and this action returns an
 * `AuthError` (Auth.js surfaces `?error=Configuration` on /login).
 *
 * On a failed credential check Auth.js redirects back to
 * /login?error=CredentialsSignin, which the LoginClient renders as
 * "Invalid email or password."
 */
export async function signInWithCredentials(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) {
    redirect("/login?error=MissingCredentials");
  }
  await signIn("credentials", {
    email,
    password,
    redirectTo: "/admin",
  });
}

/**
 * Sign out and clear the Auth.js session cookie.
 */
export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}
