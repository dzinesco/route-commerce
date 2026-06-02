"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import UpgradePlanModal from "@/components/admin/UpgradePlanModal";

type Section = {
  title: string;
  href: string;
  description: string;
  group: "operations" | "fulfillment" | "management" | "tools";
  addonKey?: string;
  upgradeText?: string;
  prominent?: boolean;
};

const sections: Section[] = [
  {
    title: "Orders",
    href: "/admin/orders",
    description: "View orders, pickup status, fulfillment, and customer details.",
    group: "operations",
    prominent: true,
  },
  {
    title: "Products",
    href: "/admin/products",
    description: "Manage products, pricing, shipping type, and availability.",
    group: "operations",
    prominent: true,
  },
  {
    title: "Tours & Stops",
    href: "/admin/stops",
    description: "Manage routes, pickup locations, dates, and cutoff times.",
    group: "fulfillment",
  },
  {
    title: "Driver Pickup",
    href: "/admin/pickup",
    description: "Mobile pickup lookup, QR scanning, and completion tools.",
    group: "fulfillment",
  },
  {
    title: "Shipping",
    href: "/admin/shipping",
    description: "FedEx integration, label creation, and shipment tracking.",
    group: "fulfillment",
  },
  {
    title: "Reports",
    href: "/admin/reports",
    description: "Sales, route, product, pickup, and customer reports.",
    group: "management",
  },
  {
    title: "Tax Dashboard",
    href: "/admin/taxes",
    description: "Sales tax collected, breakdown by state, and exportable reports.",
    group: "management",
  },
  {
    title: "Settings",
    href: "/admin/settings",
    description: "Users, billing, brand, integrations, payments, and shipping.",
    group: "management",
  },
  {
    title: "Harvest Reach",
    href: "/admin/communications",
    description: "Email campaigns, stop blast, templates, and audience segments.",
    group: "tools",
    addonKey: "harvest_reach",
    upgradeText: "Enable to access email & SMS marketing",
  },
  {
    title: "Wholesale Portal",
    href: "/admin/wholesale",
    description: "Standalone B2B portal with custom pricing, credit limits, and net-30.",
    group: "tools",
    addonKey: "wholesale_portal",
    upgradeText: "Enable to unlock B2B buyer portal",
  },
  {
    title: "Import Center",
    href: "/admin/import",
    description: "AI-powered import for products, orders, contacts, and stops.",
    group: "tools",
    addonKey: "ai_tools",
    upgradeText: "Enable AI import with smart column mapping",
  },
  {
    title: "AI Intelligence",
    href: "/admin/settings/ai",
    description: "Campaign writer, pricing advisor, and report explainer.",
    group: "tools",
    addonKey: "ai_tools",
    upgradeText: "Enable AI tools for marketing and pricing",
  },
  {
    title: "Time Tracking",
    href: "/admin/time-tracking",
    description: "Worker clock-in/out, hours tracking, and overtime management.",
    group: "tools",
    addonKey: "time_tracking",
    upgradeText: "Enable for field worker time tracking",
  },
  {
    title: "Water Log",
    href: "/admin/water-log",
    description: "Irrigation tracking and water usage reporting.",
    group: "tools",
    addonKey: "water_log",
    upgradeText: "Enable for agricultural water tracking",
  },
  {
    title: "Route Trace",
    href: "/admin/route-trace",
    description: "Lot tracking, QR stickers, hauling board, and supply chain traceability.",
    group: "tools",
    addonKey: "route_trace",
    upgradeText: "Enable for field-to-delivery traceability",
  },
];

type Tab = "operations" | "fulfillment" | "management" | "tools";

const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
  {
    id: "operations",
    label: "Operations",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
      </svg>
    ),
  },
  {
    id: "fulfillment",
    label: "Fulfillment",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16.5 9.4 7.55 4.24"/>
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
        <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
        <line x1="12" y1="22.08" x2="12" y2="12"/>
      </svg>
    ),
  },
  {
    id: "management",
    label: "Management",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    ),
  },
  {
    id: "tools",
    label: "Tools",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
      </svg>
    ),
  },
];

type Props = {
  brandId: string | null;
  brandName: string;
  planTier: string;
  isWaterLogVisible: boolean;
  enabledAddons: Record<string, boolean>;
  usage: { users: number; stops_this_month: number; products: number };
  limits: { max_users: number; max_stops_monthly: number; max_products: number };
};

export default function DashboardClient({
  brandId,
  brandName,
  planTier,
  isWaterLogVisible,
  enabledAddons,
  usage,
  limits,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("operations");
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);

  const usagePct = {
    users: limits.max_users > 0 ? (usage.users / limits.max_users) * 100 : 0,
    stops: limits.max_stops_monthly > 0 ? (usage.stops_this_month / limits.max_stops_monthly) * 100 : 0,
    products: limits.max_products > 0 ? (usage.products / limits.max_products) * 100 : 0,
  };

  const tabSections = sections.filter((s) => s.group === activeTab);

  return (
    <div className="min-h-screen bg-[var(--admin-bg)]">
      {/* Header */}
      <div className="px-4 sm:px-6 md:px-8 py-6 sm:py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 sm:mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-emerald-600">
              <svg className="h-5 w-5 sm:h-6 sm:w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1"/>
                <rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/>
                <rect x="14" y="14" width="7" height="7" rx="1"/>
              </svg>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-[var(--admin-text-primary)] tracking-tight">Admin Dashboard</h1>
              <p className="text-xs sm:text-sm text-[var(--admin-text-muted)]">{brandName} Control Center</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <a href="/admin/settings/billing" className="text-sm font-medium text-[var(--admin-text-muted)] hover:text-[var(--admin-text-secondary)] transition-colors">
              Billing →
            </a>
            {planTier === "starter" && brandId && (
              <button
                onClick={() => setIsUpgradeOpen(true)}
                className="rounded-full bg-emerald-600 hover:bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white transition-all shadow-sm"
              >
                Upgrade Plan
              </button>
            )}
          </div>
        </div>

        {/* Usage stats - compact bar */}
        <div className="rounded-xl border border-[var(--admin-border)] bg-white p-4 mb-4">
          <div className="flex items-center gap-4 mb-3">
            <span className={`rounded-full px-3 py-1 text-xs font-semibold tracking-wide ${
              planTier === "enterprise" ? "bg-amber-100 text-amber-700 border border-amber-200" :
              planTier === "farm" ? "bg-emerald-100 text-emerald-700 border border-emerald-200" :
              "bg-stone-100 text-stone-600 border border-stone-200"
            }`}>
              {planTier.charAt(0).toUpperCase() + planTier.slice(1)} Plan
            </span>
            <span className="text-xs text-stone-500">{brandId ? "Tuxedo Corn" : "All Brands"}</span>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Users", value: `${usage.users}/${limits.max_users}`, pct: usagePct.users },
              { label: "Stops", value: `${usage.stops_this_month}/${limits.max_stops_monthly}`, pct: usagePct.stops },
              { label: "Products", value: `${usage.products}/${limits.max_products}`, pct: usagePct.products },
            ].map(({ label, value, pct }) => (
              <div key={label}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-stone-600">{label}</span>
                  <span className="text-xs font-semibold text-stone-900">{value}</span>
                </div>
                <div className="h-1 rounded-full bg-stone-200 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      pct > 85 ? "bg-amber-500" : "bg-emerald-500"
                    }`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tab navigation */}
        <nav className="grid grid-cols-4 gap-1 p-1.5 rounded-xl bg-white border border-[var(--admin-border)]">
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
              {tab.icon}
              <span>{tab.label}</span>
              {activeTab === tab.id && (
                <div className="absolute bottom-1 sm:bottom-1.5 left-1/2 -translate-x-1/2 h-0.5 w-6 sm:w-12 bg-white rounded-full" />
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="px-4 sm:px-6 md:px-8 py-4 sm:py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {tabSections.map((section) => {
            if (section.title === "Water Log" && !isWaterLogVisible) return null;
            if (section.title === "Route Trace" && !enabledAddons["route_trace"]) return null;

            const isAddon = Boolean(section.addonKey);
            const isEnabled = section.addonKey ? (enabledAddons[section.addonKey] ?? false) : true;
            const isProminent = section.prominent;

            return (
              <Link
                key={section.title}
                href={section.href}
                className={[
                  "group relative flex flex-col rounded-2xl border bg-white p-5 transition-all hover:-translate-y-0.5 hover:shadow-md",
                  isAddon && !isEnabled
                    ? "border-stone-200 shadow-sm opacity-75 hover:opacity-100"
                    : isProminent
                    ? "border-emerald-200 shadow-md shadow-emerald-100/50"
                    : "border-stone-200 shadow-sm",
                ].join(" ")}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                    isAddon && !isEnabled
                      ? "bg-stone-100 text-stone-400"
                      : isProminent
                      ? "bg-emerald-100 text-emerald-600"
                      : "bg-violet-100 text-violet-600"
                  }`}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  {isAddon && !isEnabled && (
                    <span className="text-[10px] font-semibold text-amber-800 bg-amber-100 border border-amber-200 rounded-full px-2.5 py-0.5">
                      Add-on
                    </span>
                  )}
                  {isAddon && isEnabled && (
                    <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100 border border-emerald-200 rounded-full px-2.5 py-0.5">
                      Active
                    </span>
                  )}
                  {isProminent && (
                    <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100 border border-emerald-200 rounded-full px-2.5 py-0.5">
                      Core
                    </span>
                  )}
                </div>

                <h3 className="text-sm font-semibold leading-tight text-stone-950">
                  {section.title}
                </h3>

                <p className={`mt-2 text-sm leading-relaxed ${
                  isAddon && !isEnabled ? "text-stone-500" : "text-stone-600"
                }`}>
                  {section.description}
                </p>

                {isAddon && !isEnabled && section.upgradeText && (
                  <p className="mt-3 text-xs text-amber-700 font-medium">{section.upgradeText}</p>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Upgrade Modal */}
      {planTier === "starter" && brandId && (
        <UpgradePlanModal
          isOpen={isUpgradeOpen}
          onClose={() => setIsUpgradeOpen(false)}
          brandId={brandId}
          currentTier={planTier}
        />
      )}
    </div>
  );
}