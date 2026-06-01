"use client";

import { useState } from "react";

type BillingCycle = "monthly" | "annual";

type Props = {
  onCycleChange: (cycle: BillingCycle) => void;
};

export default function BillingCycleToggle({ onCycleChange }: Props) {
  const [cycle, setCycle] = useState<BillingCycle>("annual");

  function handleCycle(c: BillingCycle) {
    setCycle(c);
    onCycleChange(c);
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => handleCycle("monthly")}
        className={`rounded-lg border px-4 py-1.5 text-sm font-medium transition-colors ${
          cycle === "monthly"
            ? "border-zinc-600 bg-zinc-900 text-zinc-100"
            : "border-zinc-800 bg-slate-50 text-slate-400"
        }`}
      >
        Monthly
      </button>
      <button
        onClick={() => handleCycle("annual")}
        className={`rounded-lg border px-4 py-1.5 text-sm font-medium transition-colors flex items-center gap-1.5 ${
          cycle === "annual"
            ? "border-2 border-green-600 bg-green-900/30 text-green-400"
            : "border border-zinc-800 bg-slate-50 text-slate-400"
        }`}
      >
        Annual
        <span className="rounded-full bg-green-900/40 text-green-400 text-xs px-1.5 py-0.5 font-bold">Save 25%</span>
      </button>
    </div>
  );
}