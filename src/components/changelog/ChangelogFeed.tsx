// Changelog System - Display updates and track read status

"use client";

import { useState, useEffect } from "react";
import { formatDate } from "@/lib/format-date";

interface ChangelogEntry {
  id: string;
  version: string;
  title: string;
  description: string;
  content: ChangelogItem[];
  released_at: string;
  is_published: boolean;
  feature_type: "major" | "feature" | "improvement" | "bugfix";
}

interface ChangelogItem {
  type: "feature" | "improvement" | "bugfix";
  title: string;
  description: string;
}

interface ChangelogProps {
  brandId: string;
  userId: string;
}

const TYPE_COLORS = {
  feature: "bg-blue-100 text-blue-700",
  improvement: "bg-green-100 text-green-700",
  bugfix: "bg-red-100 text-red-700",
};

const TYPE_LABELS = {
  feature: "New Feature",
  improvement: "Improvement",
  bugfix: "Bug Fix",
};

export function ChangelogFeed({ brandId, userId }: ChangelogProps) {
  const [changelogs, setChangelogs] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "feature" | "improvement" | "bugfix">("all");
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadChangelogs();
  }, [brandId]);

  const loadChangelogs = async () => {
    try {
      const res = await fetch(`/api/changelogs?brand_id=${brandId}`);
      if (res.ok) {
        const data = await res.json();
        setChangelogs(data.data || []);
      }
    } catch (error) {
      console.error("Failed to load changelogs:", error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (changelogId: string) => {
    try {
      await fetch("/api/changelogs/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ changelog_id: changelogId, user_id: userId }),
      });
      setChangelogs(prev =>
        prev.map(c => c.id === changelogId ? { ...c, is_read: true } : c)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  const filteredChangelogs = changelogs.filter(c => {
    if (!c.is_published) return false;
    if (filter === "all") return true;
    return c.feature_type === filter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">What's New</h2>
          <p className="text-gray-500">Stay updated with the latest features and improvements</p>
        </div>
        {unreadCount > 0 && (
          <span className="px-3 py-1 bg-primary text-white text-sm rounded-full">
            {unreadCount} new
          </span>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {["all", "feature", "improvement", "bugfix"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f as typeof filter)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? "bg-primary text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {f === "all" ? "All" : TYPE_LABELS[f as keyof typeof TYPE_LABELS]}
          </button>
        ))}
      </div>

      {/* Changelog List */}
      <div className="space-y-4">
        {filteredChangelogs.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No updates yet. Check back soon!
          </div>
        ) : (
          filteredChangelogs.map((changelog) => (
            <div
              key={changelog.id}
              className={`bg-white rounded-xl shadow-sm overflow-hidden transition-all ${
                !changelog.is_read ? "ring-2 ring-primary/20" : ""
              }`}
            >
              {/* Header - always visible */}
              <div
                className="p-6 cursor-pointer hover:bg-gray-50"
                onClick={() => {
                  setExpandedId(expandedId === changelog.id ? null : changelog.id);
                  if (!changelog.is_read) {
                    markAsRead(changelog.id);
                  }
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${TYPE_COLORS[changelog.feature_type]}`}>
                      v{changelog.version}
                    </span>
                    <div>
                      <h3 className="font-semibold text-gray-900">{changelog.title}</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Released {formatDate(new Date(changelog.released_at))}
                      </p>
                    </div>
                  </div>
                  {!changelog.is_read && (
                    <span className="w-2 h-2 bg-primary rounded-full" />
                  )}
                </div>
              </div>

              {/* Expanded content */}
              {expandedId === changelog.id && changelog.content && (
                <div className="border-t border-gray-100 p-6 bg-gray-50">
                  <div className="space-y-4">
                    {changelog.content.map((item, i) => (
                      <div key={i} className="flex gap-4">
                        <div className={`w-2 h-2 mt-2 rounded-full ${
                          item.type === "feature" ? "bg-blue-500" :
                          item.type === "improvement" ? "bg-green-500" : "bg-red-500"
                        }`} />
                        <div>
                          <div className="font-medium text-gray-900">{item.title}</div>
                          <div className="text-sm text-gray-600 mt-1">{item.description}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// In-app notification component
export function ChangelogNotification({ changelog }: { changelog: ChangelogEntry }) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="fixed bottom-4 right-4 max-w-sm bg-white rounded-xl shadow-lg p-4 z-50 animate-slide-up">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
          <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-gray-900">New Update</span>
            <button
              onClick={() => setDismissed(true)}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            <span className="font-medium">v{changelog.version}</span> - {changelog.title}
          </p>
          <button className="mt-3 text-sm text-primary font-medium hover:underline">
            View Details →
          </button>
        </div>
      </div>
    </div>
  );
}