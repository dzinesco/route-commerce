"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/format-date";

type ZipCodeSearchProps = {
  allStops?: Array<{
    id: string;
    city: string;
    state: string;
    date: string;
    time: string;
    location: string;
    slug: string;
  }>;
  brandAccent?: "green" | "orange" | "blue";
};

export default function ZipCodeSearch({ allStops = [], brandAccent = "blue" }: ZipCodeSearchProps) {
  const router = useRouter();
  const [zipCode, setZipCode] = useState("");
  const [filteredStops, setFilteredStops] = useState<typeof allStops>([]);
  const [searched, setSearched] = useState(false);
  const isBlue = brandAccent === "blue";

  return (
    <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-stone-200/60">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${isBlue ? "bg-blue-50" : "bg-stone-100"}`}>
          <svg className={`h-5 w-5 ${isBlue ? "text-blue-500" : "text-stone-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-stone-950">Find Stops Near You</h2>
          <p className="text-sm text-stone-500 mt-0.5">Search by ZIP code or city name</p>
        </div>
      </div>

      {/* Search row */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
            <svg className="h-4 w-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="ZIP code or city..."
            value={zipCode}
            onChange={(e) => setZipCode(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { if (!zipCode.trim()) return; const normalized = zipCode.trim().replace(/\D/g, ""); setFilteredStops(allStops.filter((s) => s.city.toLowerCase().includes(normalized) || s.location.toLowerCase().includes(normalized) || s.state.toLowerCase().includes(normalized.toUpperCase()))); setSearched(true); } }}
            className="w-full rounded-xl border border-stone-200 pl-11 pr-4 py-3.5 text-sm text-stone-900 placeholder-stone-400 bg-white outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900 transition-colors shadow-sm"
          />
        </div>
        <button
          onClick={() => {
            if (!zipCode.trim()) return;
            const normalized = zipCode.trim().replace(/\D/g, "");
            setFilteredStops(allStops.filter((s) =>
              s.city.toLowerCase().includes(normalized) ||
              s.location.toLowerCase().includes(normalized) ||
              s.state.toLowerCase().includes(normalized.toUpperCase())
            ));
            setSearched(true);
          }}
          className="rounded-xl bg-stone-900 px-7 py-3.5 text-sm font-semibold text-white hover:bg-stone-800 active:bg-stone-950 transition-all hover:-translate-y-0.5 shadow-sm"
        >
          Search
        </button>
      </div>

      {/* Results */}
      {searched && (
        <div className="mt-6 pt-6 border-t border-stone-100">
          {filteredStops.length > 0 ? (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-stone-700">
                {filteredStops.length} stop{filteredStops.length !== 1 ? "s" : ""} found
              </p>
              {filteredStops.map((stop) => (
                <button
                  key={stop.id}
                  onClick={() => router.push(`#stops`)}
                  className="w-full rounded-xl border border-stone-200 bg-stone-50 px-5 py-4 text-left hover:bg-stone-100 group transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-base text-stone-950">{stop.city}, {stop.state}</p>
                      <p className="mt-1 text-sm text-stone-500">{formatDate(stop.date)} &middot; {stop.time} &middot; {stop.location}</p>
                    </div>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-200/60 mt-0.5">
                      <svg className="h-4 w-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-stone-100 mb-4">
                <svg className="h-6 w-6 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <p className="font-medium text-stone-600">No stops found for that location.</p>
              <p className="text-sm mt-1 text-stone-400">Try a nearby ZIP code or browse all stops below.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}