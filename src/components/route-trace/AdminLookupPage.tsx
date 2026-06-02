"use client";

import { useState } from "react";
import { searchHarvestLots, HarvestLot } from "@/actions/route-trace/lots";
import StatusBadge from "./StatusBadge";
import Link from "next/link";
import QRScanModal from "./QRScanModal";

function getAgeStatus(harvestDate: string): { label: string; className: string } | null {
  const harvested = new Date(harvestDate + "T00:00:00");
  const now = new Date();
  const days = Math.floor((now.getTime() - harvested.getTime()) / (1000 * 60 * 60 * 24));
  if (days < 0) return null;
  if (days <= 3) return { label: `${days}d`, className: "bg-green-100 text-green-700" };
  if (days <= 7) return { label: `${days}d`, className: "bg-amber-100 text-amber-700" };
  if (days <= 14) return { label: `${days}d`, className: "bg-orange-100 text-orange-700" };
  return { label: `${days}d`, className: "bg-red-100 text-red-700" };
}

// One-color outline icons
const Icons = {
  camera: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  ),
  search: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/>
      <path d="m21 21-4.3-4.3"/>
    </svg>
  ),
  plus: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5v14"/>
    </svg>
  ),
};

export default function AdminLookupPage({ brandId }: { brandId: string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<HarvestLot[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    const res = await searchHarvestLots(brandId, query.trim());
    setResults(res.success ? res.lots : []);
    setSearched(true);
    setLoading(false);
  }

  function handleScanResult(lotNumber: string) {
    setQuery(lotNumber);
    setLoading(true);
    searchHarvestLots(brandId, lotNumber).then((res) => {
      setResults(res.success ? res.lots : []);
      setSearched(true);
      setLoading(false);
    });
  }

  return (
    <div className="space-y-5">
      {/* Scan button */}
      <button
        onClick={() => setShowScanModal(true)}
        className="w-full rounded-xl bg-emerald-600 px-5 py-4 text-sm font-bold text-white hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 shadow-sm"
      >
        <span className="text-white">{Icons.camera("h-5 w-5")}</span>
        Scan QR Code
      </button>

      {/* QRScanModal */}
      {showScanModal && (
        <QRScanModal
          onClose={() => setShowScanModal(false)}
          onScanResult={handleScanResult}
        />
      )}

      {/* Search card */}
      <div className="rounded-2xl border border-stone-200 bg-white">
        <div className="border-b border-stone-100 px-6 py-5">
          <h2 className="text-lg font-semibold text-stone-900">Trace Lookup</h2>
          <p className="mt-1 text-sm text-stone-500">Search by lot number or crop type to find a harvest lot.</p>
        </div>
        <form onSubmit={handleSearch} className="flex gap-3 p-6">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. TC-20260519-001 or Sweet Corn"
            className="flex-1 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-base outline-none focus:border-emerald-600 focus:bg-white transition-colors"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? "Searching..." : <>{Icons.search("h-4 w-4")} Search</>}
          </button>
        </form>
      </div>

      {/* Results */}
      {searched && (
        <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden">
          {results.length === 0 ? (
            <div className="p-10 text-center">
              <div className="text-stone-300 mb-3">{Icons.search("h-10 w-10")}</div>
              <p className="text-sm text-stone-500">No lots found for "{query}"</p>
            </div>
          ) : (
            <>
              <div className="px-5 py-3 bg-stone-50 border-b border-stone-100">
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                  {results.length} result{results.length !== 1 ? "s" : ""}
                </p>
              </div>
              <table className="w-full">
                <tbody>
                  {results.map((lot) => (
                    <tr key={lot.id} className="border-b border-stone-50 last:border-0 hover:bg-stone-50/50 transition-colors">
                      <td className="px-5 py-4">
                        <Link href={`/admin/route-trace/lots/${lot.id}`} className="font-mono text-sm font-bold text-stone-900 hover:text-blue-600">
                          {lot.lot_number}
                        </Link>
                      </td>
                      <td className="px-5 py-4 text-sm text-stone-700">{lot.crop_type}</td>
                      <td className="px-5 py-4 text-xs text-stone-400">{lot.harvest_date}</td>
                      <td className="px-5 py-4"><StatusBadge status={lot.status} /></td>
                      <td className="px-5 py-4 text-right">
                        <Link href={`/admin/route-trace/lots/${lot.id}`} className="text-sm font-semibold text-blue-600 hover:text-blue-800">
                          View →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}
    </div>
  );
}