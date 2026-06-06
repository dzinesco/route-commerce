import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import ChangePasswordForm from "./ChangePasswordForm";

export const dynamic = "force-dynamic";

/**
 * Forced password-change page.
 *
 * Linked from `src/app/admin/layout.tsx:64` when the admin user's row
 * has `must_change_password = true`. Verifies the Auth.js session
 * server-side, then renders the form with the user id passed as a prop.
 *
 * Previously this page fetched `/api/auth/uid` from a `useEffect` to
 * resolve the current user. That endpoint (and the underlying
 * `rc_auth_uid` cookie) has been removed — the Auth.js JWT is the
 * single source of truth for identity now.
 */
export default async function ChangePasswordPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    redirect("/login");
  }

  return <ChangePasswordForm userId={userId} />;
}
