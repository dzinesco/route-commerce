"use client";

import { useState } from "react";
import Link from "next/link";
import RouteTraceDashboard from "./RouteTraceDashboard";
import AdminLookupPage from "./AdminLookupPage";
import LotListTable from "./LotListTable";
import RouteTraceSettings from "./RouteTraceSettings";
import {
  RouteTraceStats,
  HaulingLot,
  FieldYieldSummary,
  InventoryByCrop,
  RecentLotEvent,
} from "@/actions/route-trace/lots";

type Tab = "dashboard" | "lots" | "lookup" | "settings";

const TABS: { id: Tab; label: string; description: string }[] = [
  { id: "dashboard", label: "Dashboard", description: "Overview & stats" },
  { id: "lots", label: "Lots", description: "All lot records" },
  { id: "lookup", label: "Lookup", description: "Trace by lot number" },
  { id: "settings", label: "Settings", description: "Configuration" },
];

// Icon components
const Icons = {
  dashboard: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/>
      <rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  ),
  clipboard: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
      <path d="M12 11h4M12 16h4M8 11h.01M8 16h.01"/>
    </svg>
  ),
  
  settings: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  search: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/>
      <path d="m21 21-4.3-4.3"/>
    </svg>
  ),
  plus: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  ),
  arrowRight: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14"/>
      <path d="m12 5 7 7-7 7"/>
    </svg>
  ),
  leaf: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/>
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
    </svg>
  ),
};

type Props = {
  stats: RouteTraceStats;
  recentLots: HaulingLot[];
  haulingLots: HaulingLot[];
  fieldYield: FieldYieldSummary[];
  inventoryByCrop: InventoryByCrop[];
  recentActivity: RecentLotEvent[];
  brandId: string;
  lots: HaulingLot[];
};

export default function RouteTracePage({
  stats,
  recentLots,
  haulingLots,
  fieldYield,
  inventoryByCrop,
  recentActivity,
  brandId,
  lots,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");

  return (
    <div className="min-h-screen bg-[var(--admin-bg)]">
      {/* Tab navigation */}
      <div className="px-4 sm:px-6 md:px-8 pt-4 sm:pt-6">
        <nav className="grid grid-cols-4 gap-1 p-1.5 rounded-xl bg-white border border-stone-200">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 rounded-lg px-2 sm:px-4 py-2.5 sm:py-3 text-[10px] sm:text-sm font-semibold transition-colors ${
                activeTab === tab.id
                  ? "bg-emerald-600 text-white"
                  : "text-stone-500 hover:text-stone-700 hover:bg-stone-50"
              }`}
            >
              {tab.id === "dashboard" && Icons.dashboard("h-4 w-4")}
              {tab.id === "lots" && Icons.clipboard("h-4 w-4")}
              {tab.id === "lookup" && Icons.search("h-4 w-4")}
              {tab.id === "settings" && Icons.settings("h-4 w-4")}
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.label.substring(0, 3)}</span>
              {activeTab === tab.id && (
                <div className="absolute bottom-1 sm:bottom-1.5 left-1/2 -translate-x-1/2 h-0.5 w-6 sm:w-12 bg-white rounded-full" />
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div className="px-4 sm:px-6 md:px-8 py-4 sm:py-6">
        {activeTab === "dashboard" && (
          <RouteTraceDashboard
            stats={stats}
            recentLots={recentLots}
            haulingLots={haulingLots}
            fieldYield={fieldYield}
            inventoryByCrop={inventoryByCrop}
            recentActivity={recentActivity}
            brandId={brandId}
          />
        )}

        {activeTab === "lots" && (
          <div>
            <div className="rounded-2xl border border-[var(--admin-border)] bg-white overflow-hidden">
              <LotListTable initialLots={lots} brandId={brandId} />
            </div>
          </div>
        )}

        {activeTab === "lookup" && (
          <div>
            <div className="rounded-2xl border border-[var(--admin-border)] bg-white">
              <AdminLookupPage brandId={brandId} />
            </div>
          </div>
        )}

        {activeTab === "settings" && (
          <div>
            <div className="rounded-2xl border border-[var(--admin-border)] bg-white p-4 sm:p-6">
              <div className="flex items-center gap-2 sm:gap-3 mb-6">
                <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl bg-[var(--admin-text-primary)]">
                  {Icons.settings("w-4 h-4 sm:w-5 sm:h-5 text-[var(--admin-bg)]")}
                </div>
                <div>
                  <h2 className="text-sm sm:text-lg font-bold text-[var(--admin-text-primary)]">Route Trace Settings</h2>
                  <p className="text-[10px] sm:text-xs text-[var(--admin-text-muted)]">Configure your traceability workflow</p>
                </div>
              </div>
              <RouteTraceSettings />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
