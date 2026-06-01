"use client";

import { useState } from "react";

type Props = {
  brandId: string;
};

export default function FsmaReportModal({ brandId }: Props) {
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    setLoading(true);
    try {
      const url = `/api/route-trace/fsma-report?brandId=${brandId}&startDate=${startDate}&endDate=${endDate}&format=csv`;
      window.location.href = url;
    } finally {
      setLoading(false);
      setOpen(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-xl border border-stone-200 bg-white px-5 py-3 text-sm font-semibold text-stone-600 hover:bg-stone-50 transition-colors"
      >
        📋 FSMA Report
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setOpen(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-stone-100 px-6 py-4">
              <h3 className="text-base font-bold text-stone-900">📋 FSMA Compliance Report</h3>
              <p className="text-xs text-stone-400 mt-0.5">One-up / one-down traceability for a date range</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1.5">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-3 text-sm outline-none focus:border-stone-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1.5">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-3 text-sm outline-none focus:border-stone-900"
                  />
                </div>
              </div>
              <div className="rounded-xl bg-stone-50 border border-stone-200 px-4 py-3">
                <p className="text-xs text-stone-500">Includes all lots harvested between the selected dates with full trace events.</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-stone-100 px-6 py-4">
              <button
                onClick={() => setOpen(false)}
                className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-600 hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDownload}
                disabled={loading}
                className="rounded-xl bg-stone-900 px-5 py-2 text-sm font-bold text-white hover:bg-stone-800 disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? "Preparing..." : "📥 Download CSV"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}