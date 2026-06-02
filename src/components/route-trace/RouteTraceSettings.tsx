"use client";

import { useState } from "react";

const Icons = {
  settings: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  tag: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"/>
      <path d="M7 7h.01"/>
    </svg>
  ),
  calendar: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" x2="16" y1="2" y2="6"/>
      <line x1="8" x2="8" y1="2" y2="6"/>
      <line x1="3" x2="21" y1="10" y2="10"/>
    </svg>
  ),
  link: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
    </svg>
  ),
  save: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
      <polyline points="17 21 17 13 7 13 7 21"/>
      <polyline points="7 3 7 8 15 8"/>
    </svg>
  ),
};

export default function RouteTraceSettings() {
  const [lotPrefix, setLotPrefix] = useState("TC");
  const [defaultHarvestDays, setDefaultHarvestDays] = useState("0");
  const [saved, setSaved] = useState(false);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    // TODO: Save to backend
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Lot Number Format */}
      <div className="rounded-xl border border-stone-200 bg-white p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
            {Icons.tag("h-5 w-5 text-emerald-600")}
          </div>
          <div>
            <h3 className="text-base font-semibold text-stone-900">Lot Number Format</h3>
            <p className="text-sm text-stone-500">Configure how lot numbers are generated</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">Prefix</label>
            <input
              type="text"
              value={lotPrefix}
              onChange={(e) => setLotPrefix(e.target.value.toUpperCase())}
              placeholder="TC"
              className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:bg-white transition-colors"
            />
            <p className="text-xs text-stone-400 mt-1.5">Example: TC-20260520-001</p>
          </div>
        </div>
      </div>

      {/* Harvest Defaults */}
      <div className="rounded-xl border border-stone-200 bg-white p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
            {Icons.calendar("h-5 w-5 text-amber-600")}
          </div>
          <div>
            <h3 className="text-base font-semibold text-stone-900">Harvest Defaults</h3>
            <p className="text-sm text-stone-500">Default values for new lots</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">Default Harvest Days Ago</label>
            <input
              type="number"
              value={defaultHarvestDays}
              onChange={(e) => setDefaultHarvestDays(e.target.value)}
              min="0"
              max="30"
              className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:bg-white transition-colors"
            />
            <p className="text-xs text-stone-400 mt-1.5">0 = today, 1 = yesterday</p>
          </div>
        </div>
      </div>

      {/* QR Code Base URL */}
      <div className="rounded-xl border border-stone-200 bg-white p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
            {Icons.link("h-5 w-5 text-blue-600")}
          </div>
          <div>
            <h3 className="text-base font-semibold text-stone-900">Trace URL</h3>
            <p className="text-sm text-stone-500">Public trace page URL prefix</p>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">Base URL</label>
          <input
            type="text"
            defaultValue={typeof window !== "undefined" ? window.location.origin : ""}
            placeholder="https://yourdomain.com"
            className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:bg-white transition-colors"
          />
          <p className="text-xs text-stone-400 mt-1.5">QR codes will link to: baseurl/trace/LOTNUMBER</p>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          type="submit"
          className={`inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold transition-colors ${
            saved
              ? "bg-green-600 text-white"
              : "bg-emerald-600 text-white hover:bg-emerald-700"
          }`}
        >
          {Icons.save("h-4 w-4")}
          {saved ? "Saved!" : "Save Settings"}
        </button>
      </div>
    </form>
  );
}