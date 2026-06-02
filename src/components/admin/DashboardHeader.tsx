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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600">
            <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16.5 9.4 7.55 4.24"/>
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
              <line x1="12" y1="22.08" x2="12" y2="12"/>
            </svg>
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--admin-text-primary)] tracking-tight">Admin Dashboard</h1>
            <p className="text-xs sm:text-sm text-[var(--admin-text-muted)]">{brandName} Control Center</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <a href="/admin/settings/billing" className="text-sm font-medium text-[var(--admin-text-muted)] hover:text-[var(--admin-text-secondary)] transition-colors">
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