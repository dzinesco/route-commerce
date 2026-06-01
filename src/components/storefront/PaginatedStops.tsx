"use client";

import { useState, useMemo } from "react";
import StopCard from "./StopCard";

type Stop = {
  id: string;
  city: string;
  state: string;
  date: string;
  time: string;
  location: string;
  slug: string;
  brand_id: string;
};

type Props = {
  stops: Stop[];
  brandSlug: string;
  brandAccent?: "green" | "orange" | "blue";
};

const THIS_WEEK_LIMIT = 10;
const TWO_WEEKS_LIMIT = 10;
const FULL_SEASON_PAGE_SIZE = 20;

type Tab = "this_week" | "next_two_weeks" | "full_season";

function getDateRange(tab: Tab): { start: Date; end: Date } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const addDays = (d: Date, n: number) => {
    const copy = new Date(d);
    copy.setDate(copy.getDate() + n);
    return copy;
  };
  if (tab === "this_week") return { start: today, end: addDays(new Date(today), 7) };
  if (tab === "next_two_weeks") return { start: today, end: addDays(new Date(today), 14) };
  return { start: new Date(0), end: new Date("2100-01-01") };
}

export default function PaginatedStops({ stops, brandSlug, brandAccent = "green" }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("this_week");
  const [fullSeasonPage, setFullSeasonPage] = useState(0);
  const [fullSeasonSearch, setFullSeasonSearch] = useState("");

  const { start, end } = getDateRange(activeTab);

  const filtered = useMemo(() => {
    if (activeTab === "full_season") {
      if (!fullSeasonSearch.trim()) return stops;
      const q = fullSeasonSearch.toLowerCase();
      return stops.filter(
        (s) =>
          s.city.toLowerCase().includes(q) ||
          s.location.toLowerCase().includes(q) ||
          s.state.toLowerCase().includes(q)
      );
    }
    return stops.filter((s) => {
      const d = new Date(s.date);
      return d >= start && d <= end;
    });
  }, [activeTab, stops, start, end, fullSeasonSearch]);

  const paginatedStops = useMemo(() => {
    if (activeTab === "this_week") return filtered.slice(0, THIS_WEEK_LIMIT);
    if (activeTab === "next_two_weeks") return filtered.slice(0, TWO_WEEKS_LIMIT);
    const offset = fullSeasonPage * FULL_SEASON_PAGE_SIZE;
    return filtered.slice(offset, offset + FULL_SEASON_PAGE_SIZE);
  }, [activeTab, filtered, fullSeasonPage]);

  const totalCount = filtered.length;
  const totalStops = stops.length;
  const totalPages = Math.ceil(totalCount / FULL_SEASON_PAGE_SIZE);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setFullSeasonPage(0);
    setFullSeasonSearch("");
  };

  return (
    <div>
      {/* Header row */}
      <div className="mb-8 flex items-center justify-between">
        <p className="text-sm text-stone-400 font-medium">
          {totalStops} stop{totalStops !== 1 ? "s" : ""} this season
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-10 flex gap-2 flex-wrap">
        {(["this_week", "next_two_weeks", "full_season"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            className={`rounded-2xl px-5 py-3 text-sm font-semibold transition-colors ${
              activeTab === tab
                ? "bg-stone-950 text-white"
                : "bg-white text-stone-500 ring-1 ring-stone-200 hover:bg-stone-50"
            }`}
          >
            {tab === "this_week"
              ? "This Week"
              : tab === "next_two_weeks"
              ? "Next 2 Weeks"
              : "Full Season"}
          </button>
        ))}
      </div>

      {/* Search — full season */}
      {activeTab === "full_season" && (
        <div className="mb-10 flex items-center gap-4 flex-col sm:flex-row">
          <input
            type="text"
            placeholder="Search by city, location, or state..."
            value={fullSeasonSearch}
            onChange={(e) => {
              setFullSeasonSearch(e.target.value);
              setFullSeasonPage(0);
            }}
            className="flex-1 rounded-2xl border border-stone-200 bg-white px-5 py-3.5 text-sm text-stone-900 placeholder-stone-400 outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900 transition-colors"
          />
          <span className="text-sm text-stone-500 whitespace-nowrap">
            {totalCount > 0
              ? `${paginatedStops.length} of ${totalCount} stops`
              : `${totalCount} stops`}
          </span>
        </div>
      )}

      {/* Empty state */}
      {filtered.length === 0 ? (
        <div className="rounded-3xl bg-white p-14 text-center ring-1 ring-stone-200/60">
          <p className="text-stone-500">No stops found for this period.</p>
        </div>
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-3">
            {paginatedStops.map((stop) => (
              <StopCard
                key={stop.id}
                {...stop}
                brandSlug={brandSlug}
                brandAccent={brandAccent}
              />
            ))}
          </div>

          {/* Pagination */}
          {activeTab === "full_season" && totalPages > 1 && (
            <div className="mt-10 flex items-center justify-between flex-col sm:flex-row gap-6">
              <span className="text-sm text-stone-500">
                Page {fullSeasonPage + 1} of {totalPages}
              </span>
              <div className="flex gap-3">
                <button
                  onClick={() => setFullSeasonPage((p) => Math.max(0, p - 1))}
                  disabled={fullSeasonPage === 0}
                  className="rounded-2xl border border-stone-300 px-5 py-2.5 text-sm font-semibold text-stone-600 disabled:opacity-40 hover:bg-stone-50 transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => setFullSeasonPage((p) => p + 1)}
                  disabled={fullSeasonPage >= totalPages - 1}
                  className="rounded-2xl border border-stone-300 px-5 py-2.5 text-sm font-semibold text-stone-600 disabled:opacity-40 hover:bg-stone-50 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}