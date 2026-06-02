"use client";

import { useState } from "react";

interface ChangelogEntry {
  id: string;
  version: string;
  date: string;
  title: string;
  description: string;
  category: "feature" | "improvement" | "bugfix" | "security";
}

interface ChangelogFeedProps {
  entries?: ChangelogEntry[];
}

const DEFAULT_ENTRIES: ChangelogEntry[] = [
  {
    id: "1",
    version: "2.4.0",
    date: "2025-01-15",
    title: "Harvest Reach Email Campaigns",
    description: "Send beautiful email campaigns to your customers with templates, scheduling, and analytics.",
    category: "feature",
  },
  {
    id: "2",
    version: "2.3.0",
    date: "2025-01-08",
    title: "Square Inventory Sync",
    description: "Two-way sync with Square POS for products and inventory.",
    category: "feature",
  },
  {
    id: "3",
    version: "2.2.0",
    date: "2024-12-10",
    title: "AI Intelligence Pack",
    description: "Campaign writer, pricing advisor, and demand forecasting powered by AI.",
    category: "feature",
  },
];

const categoryColors = {
  feature: "bg-emerald-100 text-emerald-700",
  improvement: "bg-blue-100 text-blue-700",
  bugfix: "bg-amber-100 text-amber-700",
  security: "bg-purple-100 text-purple-700",
};

const categoryLabels = {
  feature: "New Feature",
  improvement: "Improvement",
  bugfix: "Bug Fix",
  security: "Security",
};

export default function ChangelogFeed({ entries = DEFAULT_ENTRIES }: ChangelogFeedProps) {
  const [readItems, setReadItems] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);

  const displayedEntries = showAll ? entries : entries.slice(0, 5);

  const markAsRead = (id: string) => {
    setReadItems((prev) => new Set([...prev, id]));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <div className="space-y-4">
      {displayedEntries.map((entry) => {
        const isRead = readItems.has(entry.id);
        return (
          <div
            key={entry.id}
            className={`bg-white rounded-xl p-5 border transition-all hover:shadow-md ${
              isRead ? "border-gray-200 opacity-70" : "border-emerald-200 shadow-sm"
            }`}
            onClick={() => markAsRead(entry.id)}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className={`px-2 py-1 rounded-md text-xs font-semibold ${categoryColors[entry.category]}`}>
                  {categoryLabels[entry.category]}
                </span>
                <span className="text-xs font-mono text-gray-400">v{entry.version}</span>
              </div>
              <time className="text-xs text-gray-400">{formatDate(entry.date)}</time>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{entry.title}</h3>
            <p className="text-sm text-gray-600">{entry.description}</p>
          </div>
        );
      })}

      {entries.length > 5 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full py-3 text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
        >
          {showAll ? "Show less" : `Show ${entries.length - 5} more updates`}
        </button>
      )}
    </div>
  );
}