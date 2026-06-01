"use client";

import { useState } from "react";
import { searchHarvestLots, HarvestLot } from "@/actions/route-trace/lots";
import StatusBadge from "./StatusBadge";
import Link from "next/link";

export default function AdminLookupPage({ brandId }: { brandId: string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<HarvestLot[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scanMode, setScanMode] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setScanMode(false);
    const res = await searchHarvestLots(brandId, query.trim());
    setResults(res.success ? res.lots : []);
    setSearched(true);
    setLoading(false);
  }

  function handleScanResult(lotNumber: string) {
    setQuery(lotNumber);
    setScanMode(false);
    // Trigger search immediately
    setLoading(true);
    searchHarvestLots(brandId, lotNumber).then((res) => {
      setResults(res.success ? res.lots : []);
      setSearched(true);
      setLoading(false);
    });
  }

  return (
    <div className="space-y-5">
      {/* Search card */}
      <div className="rounded-2xl border border-stone-200 bg-white shadow-sm">
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
            className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {loading ? "Searching..." : "🔍 Search"}
          </button>
        </form>
        {scanMode && (
          <div className="px-6 pb-6">
            <div className="rounded-xl border-2 border-dashed border-stone-300 bg-stone-50 p-8 text-center">
              <div className="text-4xl mb-3">📷</div>
              <p className="text-sm font-semibold text-stone-700">Camera scan ready</p>
              <p className="text-xs text-stone-400 mt-1">Point camera at a Route Trace QR code to look up a lot</p>
              <div className="mt-4 flex justify-center gap-3">
                <button
                  onClick={() => setScanMode(false)}
                  className="rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    // Simulate scan with manual entry fallback
                    const input = prompt("Enter lot number from QR scan:");
                    if (input) handleScanResult(input.trim());
                  }}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  Enter Manually
                </button>
              </div>
            </div>
          </div>
        )}
        {!scanMode && (
          <div className="px-6 pb-6">
            <button
              onClick={() => setScanMode(true)}
              className="rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-600 hover:bg-stone-50 transition-colors flex items-center gap-2"
            >
              📷 Scan QR Code
            </button>
          </div>
        )}
      </div>

      {/* Results */}
      {searched && (
        <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden shadow-sm">
          {results.length === 0 ? (
            <div className="p-10 text-center">
              <div className="text-3xl mb-3">🔍</div>
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