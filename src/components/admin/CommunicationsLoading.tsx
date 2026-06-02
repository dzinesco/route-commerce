"use client";

import { useState } from "react";

// Loading skeleton components for Communications page
function SkeletonBlock({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-stone-200 rounded ${className}`} />
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-[var(--admin-border)] bg-white p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <SkeletonBlock className="h-10 w-10 rounded-xl" />
          <div className="space-y-2">
            <SkeletonBlock className="h-5 w-32" />
            <SkeletonBlock className="h-3 w-24" />
          </div>
        </div>
        <SkeletonBlock className="h-9 w-28 rounded-lg" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-stone-50 rounded-xl border border-[var(--admin-border)] p-4 sm:p-5">
            <SkeletonBlock className="h-3 w-16 mb-2" />
            <SkeletonBlock className="h-6 w-20" />
          </div>
        ))}
      </div>
      <SkeletonBlock className="h-64 w-full rounded-xl" />
    </div>
  );
}

function SkeletonTableRow() {
  return (
    <tr className="border-b border-[var(--admin-border)]">
      <td className="px-4 sm:px-6 py-3.5">
        <SkeletonBlock className="h-4 w-32" />
      </td>
      <td className="px-4 sm:px-6 py-3.5">
        <SkeletonBlock className="h-4 w-16" />
      </td>
      <td className="px-4 sm:px-6 py-3.5">
        <SkeletonBlock className="h-4 w-20" />
      </td>
      <td className="px-4 sm:px-6 py-3.5">
        <SkeletonBlock className="h-4 w-16" />
      </td>
      <td className="px-4 sm:px-6 py-3.5">
        <SkeletonBlock className="h-4 w-16" />
      </td>
    </tr>
  );
}

function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-stone-50 border-b border-[var(--admin-border)]">
          <tr>
            <th className="text-left px-4 sm:px-6 py-3 font-semibold text-[var(--admin-text-muted)] text-xs">
              <SkeletonBlock className="h-3 w-16" />
            </th>
            <th className="text-right px-4 sm:px-6 py-3 font-semibold text-[var(--admin-text-muted)] text-xs">
              <SkeletonBlock className="h-3 w-12" />
            </th>
            <th className="text-right px-4 sm:px-6 py-3 font-semibold text-[var(--admin-text-muted)] text-xs">
              <SkeletonBlock className="h-3 w-16" />
            </th>
            <th className="text-right px-4 sm:px-6 py-3 font-semibold text-[var(--admin-text-muted)] text-xs">
              <SkeletonBlock className="h-3 w-12" />
            </th>
            <th className="text-right px-4 sm:px-6 py-3 font-semibold text-[var(--admin-text-muted)] text-xs">
              <SkeletonBlock className="h-3 w-12" />
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--admin-border)]">
          {Array.from({ length: rows }).map((_, i) => (
            <SkeletonTableRow key={i} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SkeletonComposer() {
  return (
    <div className="flex flex-col gap-6">
      {/* Step indicator skeleton */}
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center">
            <SkeletonBlock className={`h-10 rounded-full ${i === 1 ? "w-24" : "w-20"}`} />
            {i < 4 && <SkeletonBlock className="h-0.5 w-6 mx-1" />}
          </div>
        ))}
      </div>

      {/* Main card skeleton */}
      <div className="rounded-xl border border-[var(--admin-border)] bg-white p-6">
        <div className="space-y-4">
          <SkeletonBlock className="h-6 w-40" />
          <SkeletonBlock className="h-4 w-64" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
            {[1, 2, 3, 4].map((i) => (
              <SkeletonBlock key={i} className="h-28 rounded-xl" />
            ))}
          </div>
        </div>
      </div>

      {/* Recent campaigns skeleton */}
      <div className="rounded-xl border border-[var(--admin-border)] bg-white overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--admin-border)]">
          <SkeletonBlock className="h-5 w-36" />
        </div>
        <SkeletonTable rows={3} />
      </div>
    </div>
  );
}

function SkeletonSegmentBuilder() {
  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <SkeletonBlock className="h-10 w-10 rounded-xl" />
        <div className="space-y-2">
          <SkeletonBlock className="h-5 w-32" />
          <SkeletonBlock className="h-4 w-48" />
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Sidebar skeleton */}
        <div className="lg:w-72 flex-shrink-0">
          <div className="rounded-xl border border-[var(--admin-border)] bg-white p-4 space-y-4">
            <div className="flex items-center justify-between">
              <SkeletonBlock className="h-4 w-24" />
              <SkeletonBlock className="h-8 w-8 rounded-lg" />
            </div>
            <SkeletonBlock className="h-10 w-full" />
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <SkeletonBlock key={i} className="h-12 w-full rounded-xl" />
              ))}
            </div>
          </div>
        </div>

        {/* Builder + Preview skeleton */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl border border-[var(--admin-border)] bg-white p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between">
              <SkeletonBlock className="h-4 w-20" />
              <SkeletonBlock className="h-8 w-16 rounded-lg" />
            </div>
            <SkeletonBlock className="h-24 w-full rounded-xl" />
            <div className="flex gap-2 flex-wrap">
              {[1, 2, 3].map((i) => (
                <SkeletonBlock key={i} className="h-7 w-24 rounded-full" />
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-[var(--admin-border)] bg-white p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between">
              <SkeletonBlock className="h-4 w-32" />
              <SkeletonBlock className="h-6 w-16 rounded-full" />
            </div>
            <SkeletonBlock className="h-48 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

function SkeletonContacts() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[var(--admin-border)] bg-white overflow-hidden p-4 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <SkeletonBlock className="h-10 w-10 rounded-xl" />
            <div className="space-y-2">
              <SkeletonBlock className="h-5 w-24" />
              <SkeletonBlock className="h-4 w-32" />
            </div>
          </div>
          <div className="flex gap-2">
            <SkeletonBlock className="h-9 w-24 rounded-lg" />
            <SkeletonBlock className="h-9 w-32 rounded-lg" />
          </div>
        </div>
        <SkeletonBlock className="h-10 w-full mb-4" />
        <SkeletonTable rows={5} />
      </div>

      <div className="rounded-xl border border-[var(--admin-border)] bg-white p-4 sm:p-6">
        <SkeletonBlock className="h-5 w-28 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <SkeletonBlock key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

function SkeletonLogs() {
  return (
    <div className="rounded-xl border border-[var(--admin-border)] bg-white overflow-hidden p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <SkeletonBlock className="h-10 w-10 rounded-xl" />
          <div className="space-y-2">
            <SkeletonBlock className="h-5 w-20" />
            <SkeletonBlock className="h-4 w-32" />
          </div>
        </div>
        <div className="flex gap-2">
          <SkeletonBlock className="h-9 w-28 rounded-lg" />
          <SkeletonBlock className="h-9 w-20 rounded-lg" />
        </div>
      </div>
      <SkeletonBlock className="h-10 w-full mb-4" />
      <SkeletonTable rows={6} />
    </div>
  );
}

// Main loading component that shows skeleton based on current tab
export default function CommunicationsLoading({
  activeTab = "campaigns"
}: {
  activeTab?: string
}) {
  const [currentTab] = useState(activeTab);

  switch (currentTab) {
    case "campaigns":
      return <SkeletonCard />;
    case "templates":
      return <SkeletonCard />;
    case "contacts":
      return <SkeletonContacts />;
    case "segments":
      return <SkeletonSegmentBuilder />;
    case "logs":
      return <SkeletonLogs />;
    case "analytics":
      return <SkeletonCard />;
    default:
      return <SkeletonCard />;
  }
}

// Named exports for specific loading states
export {
  SkeletonCard,
  SkeletonComposer,
  SkeletonSegmentBuilder,
  SkeletonContacts,
  SkeletonLogs,
  SkeletonTable,
  SkeletonBlock,
};