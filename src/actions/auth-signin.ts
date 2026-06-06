"use server";

import { signIn, signOut } from "@/lib/auth";
import { AuthError } from "next-auth";

/**
 * Server actions that wrap the Auth.js v5 `signIn` / `signOut` API for
 * use from client components.
 *
 * Why server actions?
 *   • The Auth.js v5 `signIn` function has to run on the server (it
 *     needs to set the session cookie, talk to the database adapter,
 *     and redirect the user to the OAuth provider).
 *   • Calling it from a client component via a server action keeps the
 *     client bundle small and avoids exposing the OAuth client secret.
 *
 * Usage from a client component:
 *   <form action={signInWithGoogle}>
 *     <button type="submit">Sign in with Google</button>
 *   </form>
 *
 * Usage for the dev credentials provider (dev only):
 *   <form action={signInWithDev}>
 *     <input name="username" />
 *     <input name="password" type="password" />
 *     <button type="submit">Dev login</button>
 *   </form>
 */

export async function signInWithGoogle(): Promise<void> {
  await signIn("google", { redirectTo: "/admin" });
}

export async function signInWithDev(formData: FormData): Promise<void> {
  const username = String(formData.get("username") ?? "admin");
  const password = String(formData.get("password") ?? "dev");
  try {
    await signIn("dev-login", {
      username,
      password,
      redirectTo: "/admin",
    });
  } catch (e) {
    // signIn() throws a `NEXT_REDIRECT` to navigate — let that through
    // so the redirect actually happens. Re-throw any other error so the
    // caller can render a meaningful message.
    if (e instanceof AuthError) {
      throw new Error(`Dev sign-in failed: ${e.type}`);
    }
    throw e;
  }
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}
