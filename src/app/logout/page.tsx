// Server-side logout. Signs the user out of the Auth.js v5 session and
// redirects to /login. The previous client-side implementation (which
// called Supabase auth.signOut) was replaced with this so logout goes
// through the same auth path the rest of the app uses.
import { signOut } from "@/lib/auth";

export default async function LogoutPage() {
  await signOut({ redirectTo: "/login" });
}
