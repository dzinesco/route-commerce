"use client";

import { useState } from "react";
import RouteTraceDashboard from "./RouteTraceDashboard";
import AdminLookupPage from "./AdminLookupPage";
import LotListTable from "./LotListTable";
import Link from "next/link";
import {
  RouteTraceStats,
  HaulingLot,
  FieldYieldSummary,
  InventoryByCrop,
  RecentLotEvent,
} from "@/actions/route-trace/lots";

type Tab = "dashboard" | "lots" | "lookup" | "settings";

const TABS: { id: Tab; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "lots", label: "Lots" },
  { id: "lookup", label: "Lookup" },
  { id: "settings", label: "Settings" },
];

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
    <div className="min-h-screen bg-stone-50 px-6 py-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-2xl font-semibold text-stone-950 tracking-tight">Route Trace</h1>
              <p className="mt-1 text-sm text-stone-500">Track lots from field to delivery</p>
            </div>
            {activeTab === "lots" && (
              <Link
                href="/admin/route-trace/lots/new"
                className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors shadow-sm shadow-emerald-200"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                New Lot
              </Link>
            )}
          </div>

          {/* Tab nav */}
          <div className="border-b border-stone-200 mt-4">
            <nav className="flex gap-1 -mb-px">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors rounded-t-lg ${
                    activeTab === tab.id
                      ? "border-emerald-500 text-emerald-700 bg-white"
                      : "border-transparent text-stone-500 hover:text-stone-700 hover:bg-stone-50"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab content */}
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
          <div className="rounded-2xl bg-white border border-stone-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-100 bg-stone-50">
              <p className="text-sm font-medium text-stone-700">{lots.length} lot{lots.length !== 1 ? "s" : ""} total</p>
            </div>
            <LotListTable initialLots={lots} brandId={brandId} />
          </div>
        )}

        {activeTab === "lookup" && (
          <div className="rounded-2xl bg-white border border-stone-200 shadow-sm p-6">
            <AdminLookupPage brandId={brandId} />
          </div>
        )}

        {activeTab === "settings" && (
          <div className="rounded-2xl bg-white border border-stone-200 shadow-sm p-6">
            <div className="text-center py-12">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-stone-100 mx-auto mb-4">
                <svg className="h-8 w-8 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2c3.95 0 6.2 3.25 6.2 6.2 0 1.06-.34 2.06-.95 2.83l2.86 2.86c.77.77 1.2 1.82 1.2 2.93 0 2.11-1.71 3.82-3.82 3.82-1.11 0-2.17-.45-2.93-1.21l-2.86-2.86A3.8 3.8 0 0011.91 18c-.76-.61-1.25-1.5-1.25-2.5 0-1.22.55-2.32 1.41-3.07l.54-.54c.43-.43 1.12-.43 1.55 0 .43.43.43 1.12 0 1.55l-.54.54c.76.86 1.22 1.95 1.22 3.18 0 2.1-1.71 3.82-3.82 3.82-1.23 0-2.32-.56-3.18-1.22l-.54-.54c-.43-.43-1.12-.43-1.55 0-.43.43-.43 1.12 0 1.55l.54.54c.86.76 1.95 1.22 3.18 1.22 2.1 0 3.82-1.71 3.82-3.82 0-1.23-.45-2.32-1.22-3.18l-.54-.54c-.43-.43-.43-1.12 0-1.55.43-.43 1.12-.43 1.55 0l.54.54c.61.76.95 1.76.95 2.83 0 1-.49 1.89-1.25 2.5-.65.42-1.44.68-2.28.68-1.93 0-3.5-1.57-3.5-3.5 0-.78.26-1.52.72-2.09l2.86-2.86c.39-.39.6-.91.6-1.46 0-.55-.21-1.07-.6-1.46-.39-.39-.91-.6-1.46-.6-.55 0-1.07.21-1.46.6l-2.86 2.86c-.58.46-1.31.72-2.09.72-.78 0-1.52-.26-2.09-.72l-.54-.54c-.39-.39-.6-.91-.6-1.46s.21-1.07.6-1.46c.39-.39.91-.6 1.46-.6.55 0 1.07.21 1.46.6l.54.54c.46.58.72 1.31.72 2.09 0 .78-.26 1.52-.72 2.09l-2.86 2.86c-.39.39-.6.91-.6 1.46 0 .55.21 1.07.6 1.46.39.39.91.6 1.46.6.55 0 1.07-.21 1.46-.6l2.86-2.86c.58-.46 1.31-.72 2.09-.72.78 0 1.52.26 2.09.72l.54.54c.39.39.6.91.6 1.46 0 .55-.21 1.07-.6 1.46-.39.39-.91.6-1.46.6-.55 0-1.07-.21-1.46-.6l-.54-.54c-.76-.86-1.22-1.95-1.22-3.18 0-1.23.56-2.32 1.22-3.18l.54-.54c.43-.43 1.12-.43 1.55 0 .43.43.43 1.12 0 1.55l-.54.54c-.76.86-1.22 1.95-1.22 3.18 0 2.1 1.71 3.82 3.82 3.82 1.23 0 2.32-.56 3.18-1.22l.54-.54c.43-.43 1.12-.43 1.55 0 .43.43.43 1.12 0 1.55l-.54.54c-.86.76-1.95 1.22-3.18 1.22-1.1 0-2.16-.26-3.07-.75V4.01c0-.55.21-1.07.6-1.46.39-.39.91-.6 1.46-.6h.01" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-stone-700 mb-2">Route Trace Settings</h2>
              <p className="text-sm text-stone-500 mb-4">Configure your traceability workflow and defaults</p>
              <Link
                href="/admin/settings/apps"
                className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors"
              >
                Manage Add-ons →
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}