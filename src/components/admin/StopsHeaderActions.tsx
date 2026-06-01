"use client";

import { useState } from "react";
import ScheduleImportModal from "@/components/admin/ScheduleImportModal";
import { useRouter } from "next/navigation";

type Props = {
  brandId: string;
};

export default function StopsHeaderActions({ brandId }: Props) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  function handleComplete(count: number) {
    router.refresh();
  }

  return (
    <>
      <div className="flex gap-3">
        <button
          onClick={() => setOpen(true)}
          className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:border-zinc-600 transition-colors"
        >
          Upload Schedule
        </button>
        <a
          href="/admin/stops/new"
          className="rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition-colors shadow-lg shadow-emerald-900/30"
        >
          + Add Stop
        </a>
      </div>

      {open && (
        <ScheduleImportModal
          brandId={brandId}
          onClose={() => setOpen(false)}
          onComplete={handleComplete}
        />
      )}
    </>
  );
}