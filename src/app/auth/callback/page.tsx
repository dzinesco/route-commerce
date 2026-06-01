"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const url = new URL(window.location.href);
    // Supabase sends token via query params (not hash) on redirect
    const accessToken = url.searchParams.get("token") || url.searchParams.get("access_token");
    const type = url.searchParams.get("type");
    const error = url.searchParams.get("error");

    if (error) {
      router.replace(`/login?error=${error}`);
      return;
    }

    if (!accessToken) {
      router.replace("/login?error=no_token");
      return;
    }

    // Validate token by fetching user info from Supabase
    fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user`, {
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${accessToken}`,
      },
    })
      .then(r => r.json())
      .then(data => {
        if (data?.id) {
          // Set rc_auth_uid cookie via API route
          return fetch("/api/set-auth-cookie", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: data.id }),
          });
        }
        throw new Error("No user ID in response");
      })
      .then(() => router.replace("/admin"))
      .catch(() => router.replace("/login?error=token_invalid"));
  }, [router]);

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="text-zinc-400">Verifying reset link...</div>
    </div>
  );
}