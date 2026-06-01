"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = { brandId: string };

export default function WaterAdminPinClient({ brandId }: Props) {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pin.length !== 4) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/water-admin-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandId, pin }),
      });
      const data = await res.json();
      if (data.success) {
        router.push("/water/admin");
      } else {
        setError(data.error ?? "Invalid PIN");
        setPin("");
      }
    } catch {
      setError("Connection error");
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="password"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={4}
        value={pin}
        onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
        placeholder="••••"
        className="w-full rounded-xl border-2 border-slate-300 px-6 py-6 text-center text-4xl font-bold tracking-widest outline-none focus:border-slate-900"
        style={{ letterSpacing: "0.4em" }}
        autoFocus
      />
      {error && (
        <p className="text-center text-red-600 text-sm">{error}</p>
      )}
      <button
        type="submit"
        disabled={pin.length !== 4 || loading}
        className="w-full rounded-xl bg-slate-900 px-6 py-4 text-lg font-bold text-white disabled:opacity-50"
      >
        {loading ? "Verifying..." : "Unlock"}
      </button>
    </form>
  );
}