"use server";

import { signIn, signOut } from "@/lib/auth";

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
 * Note: dev/demo authentication is no longer a button on the login page.
 * `src/middleware.ts` auto-issues the `dev_session` cookie for /admin/*
 * when ALLOW_DEV_LOGIN is enabled. See CLAUDE.md.
 */

export async function signInWithGoogle(): Promise<void> {
  await signIn("google", { redirectTo: "/admin" });
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}
