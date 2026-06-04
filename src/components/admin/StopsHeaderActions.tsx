"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminButton } from "@/components/admin/design-system";
import ScheduleImportModal from "@/components/admin/ScheduleImportModal";
import AddStopModal from "@/components/admin/AddStopModal";

type Props = {
  brandId: string;
};

export default function StopsHeaderActions({ brandId }: Props) {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const refresh = () => router.refresh();

  return (
    <>
      <AdminButton
        variant="secondary"
        size="sm"
        onClick={() => setShowImport(true)}
        icon={
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
            />
          </svg>
        }
      >
        Upload Schedule
      </AdminButton>
      <AdminButton
        variant="primary"
        size="sm"
        onClick={() => setShowAdd(true)}
        icon={
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4v16m8-8H4"
            />
          </svg>
        }
      >
        Add Stop
      </AdminButton>

      {showImport && (
        <ScheduleImportModal
          brandId={brandId}
          onClose={() => setShowImport(false)}
          onComplete={refresh}
        />
      )}

      <AddStopModal
        isOpen={showAdd}
        onClose={() => setShowAdd(false)}
        brandId={brandId}
        onSuccess={refresh}
      />
    </>
  );
}
