"use server";

import "server-only";
import { signIn, signOut } from "@/lib/auth";

/**
 * Kick off the Google OAuth flow. Auth.js will redirect to Google's
 * consent screen and then back to /api/auth/callback/google, which sets
 * the session cookie and redirects to /admin.
 *
 * The historical Supabase-backed email/password sign-in action was
 * removed in the cleanup pass. Admin accounts are provisioned by an
 * existing platform admin via /admin/users.
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
