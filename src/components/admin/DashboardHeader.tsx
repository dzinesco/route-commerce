"use client";

import { useState, useCallback } from "react";
import UpgradePlanModal from "@/components/admin/UpgradePlanModal";

interface DashboardHeaderProps {
  brandId: string | null;
  brandName: string;
  planTier: string;
}

export default function DashboardHeader({ brandId, brandName, planTier }: DashboardHeaderProps) {
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);

  const openUpgrade = useCallback(() => setIsUpgradeOpen(true), []);
  const closeUpgrade = useCallback(() => setIsUpgradeOpen(false), []);

  return (
    <>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600 mb-2">Control Center</p>
          <h1 className="text-4xl font-semibold tracking-tight text-stone-950">{brandName}</h1>
        </div>
        <div className="flex items-center gap-4">
          <a href="/admin/settings/billing" className="text-sm font-medium text-stone-500 hover:text-stone-700 transition-colors">
            Billing →
          </a>
          {planTier === "starter" && brandId && (
            <button
              onClick={openUpgrade}
              className="rounded-full bg-emerald-600 hover:bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white transition-all shadow-sm"
            >
              Upgrade Plan
            </button>
          )}
        </div>
      </div>

      {planTier === "starter" && brandId && (
        <UpgradePlanModal
          isOpen={isUpgradeOpen}
          onClose={closeUpgrade}
          brandId={brandId}
          currentTier={planTier}
        />
      )}
    </>
  );
}