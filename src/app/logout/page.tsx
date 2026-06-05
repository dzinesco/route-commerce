"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    // Clear all auth cookies — dev_session, rc_session_token
    document.cookie = "dev_session=;path=/;max-age=0";
    document.cookie = "rc_session_token=;path=/;max-age=0";
    document.cookie = "wholesale_session=;path=/;max-age=0";
    // Clear shopping cart on logout
    localStorage.removeItem("route_commerce_cart");
    localStorage.removeItem("route_commerce_stop");

    // Sign out from Better Auth
    authClient.signOut().then(() => {
      router.push("/login");
      router.refresh();
    });
  }, [router]);

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-12">
      <div className="mx-auto max-w-md">
        <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200 text-center">
          <p className="text-slate-500">Signing out...</p>
        </div>
      </div>
    </main>
  );
}
