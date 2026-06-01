"use client";

import { useState, useCallback } from "react";
import UpgradePlanModal from "@/components/admin/UpgradePlanModal";

interface DashboardUpgradeButtonProps {
  brandId: string | null;
  currentTier: string;
}

export default function DashboardUpgradeButton({ brandId, currentTier }: DashboardUpgradeButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const openModal = useCallback(() => setIsOpen(true), []);
  const closeModal = useCallback(() => setIsOpen(false), []);

  if (!brandId) return null;

  return (
    <>
      <button
        onClick={openModal}
        className="rounded-full bg-emerald-600 hover:bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white transition-all shadow-sm"
      >
        Upgrade Plan
      </button>

      <UpgradePlanModal
        isOpen={isOpen}
        onClose={closeModal}
        brandId={brandId}
        currentTier={currentTier}
      />
    </>
  );
}