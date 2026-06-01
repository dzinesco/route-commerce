"use client";

import { useState } from "react";
import ScheduleImportModal from "@/components/admin/ScheduleImportModal";
import AddStopModal from "@/components/admin/AddStopModal";
import { useRouter } from "next/navigation";

type Props = {
  brandId: string;
};

export default function StopsHeaderActions({ brandId }: Props) {
  const [showImport, setShowImport] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const router = useRouter();

  function handleImportComplete(count: number) {
    router.refresh();
  }

  function handleAddSuccess(stopId: string) {
    router.refresh();
  }

  return (
    <>
      <div className="flex gap-3">
        <button
          onClick={() => setShowImport(true)}
          className="flex items-center gap-2 rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50 hover:border-stone-400 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Upload Schedule
        </button>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors shadow-sm shadow-emerald-200"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Stop
        </button>
      </div>

      <ScheduleImportModal
        brandId={brandId}
        onClose={() => setShowImport(false)}
        onComplete={handleImportComplete}
      />

      <AddStopModal
        isOpen={showAdd}
        onClose={() => setShowAdd(false)}
        brandId={brandId}
        onSuccess={handleAddSuccess}
      />
    </>
  );
}