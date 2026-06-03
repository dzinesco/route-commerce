"use client";

import { useState, useEffect, type ReactNode } from "react";
import Link from "next/link";
import UpgradePlanModal from "@/components/admin/UpgradePlanModal";
import { PageHeader, AdminButton, AdminFilterTabs, AdminBadge } from "@/components/admin/design-system";
import { getDashboardStats, type DashboardStats } from "@/actions/dashboard";

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
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      setIsLoadingStats(true);
      try {
        const data = await getDashboardStats();
        setStats(data);
      } catch (err) {
        console.error("Failed to load stats:", err);
      } finally {
        setIsLoadingStats(false);
      }
    };
    loadStats();
  }, []);

  const usagePct = {
    users: limits.max_users > 0 ? (usage.users / limits.max_users) * 100 : 0,
    stops: limits.max_stops_monthly > 0 ? (usage.stops_this_month / limits.max_stops_monthly) * 100 : 0,
    products: limits.max_products > 0 ? (usage.products / limits.max_products) * 100 : 0,
  };

  const tabSections = sections.filter((s) => s.group === activeTab);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  // Get status badge color
  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string }> = {
      pending: { bg: "var(--admin-warning-light)", text: "var(--admin-warning)" },
      processing: { bg: "var(--admin-accent-light)", text: "var(--admin-accent-text)" },
      shipped: { bg: "#dbeafe", text: "#1e40af" },
    };
    return styles[status] || { bg: "var(--admin-bg)", text: "var(--admin-text-secondary)" };
  };

  // Quick action buttons
  const quickActions = [
    { label: "New Order", href: "/admin/orders?new=true", icon: "plus" },
    { label: "Add Stop", href: "/admin/stops/new", icon: "map" },
    { label: "Add Product", href: "/admin/products/new", icon: "package" },
    { label: "Send Blast", href: "/admin/communications/compose", icon: "mail" },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--admin-bg)" }}>
      {/* Page Header */}
      <div className="px-4 sm:px-6 md:px-8 py-6 sm:py-8">
        <PageHeader
          icon={
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1"/>
              <rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="3" y="14" width="7" height="7" rx="1"/>
              <rect x="14" y="14" width="7" height="7" rx="1"/>
            </svg>
          }
          title="Admin Dashboard"
          subtitle={`${brandName} Control Center`}
          actions={
            <div className="flex items-center gap-4">
              <a href="/admin/settings/billing" className="text-sm font-medium hover:underline" style={{ color: "var(--admin-text-muted)" }}>
                Billing →
              </a>
              {planTier === "starter" && brandId && (
                <AdminButton
                  onClick={() => setIsUpgradeOpen(true)}
                  size="md"
                >
                  Upgrade Plan
                </AdminButton>
              )}
            </div>
          }
          className="mb-0"
        />
      </div>

      {/* Content */}
      <div className="px-4 sm:px-6 md:px-8 py-4 sm:py-6 -mt-4 space-y-6">
        {/* Stats Cards Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Today's Orders */}
          <div 
            className="rounded-xl border p-5 transition-all hover:shadow-md hover:-translate-y-0.5"
            style={{ 
              backgroundColor: "var(--admin-card-bg)",
              borderColor: "var(--admin-border)"
            }}
          >
            <div className="flex items-center gap-4">
              <div 
                className="flex h-12 w-12 items-center justify-center rounded-xl"
                style={{ backgroundColor: "var(--admin-accent-light)" }}
              >
                <svg className="w-6 h-6" style={{ color: "var(--admin-accent)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM12.94 18.55l.276-.276a.75.75 0 011.06 0l.27.27a.75.75 0 010 1.06l-.27.27a.75.75 0 01-1.06 0l-.276-.276a.75.75 0 010-1.06z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--admin-text-muted)" }}>
                  Today&apos;s Orders
                </p>
                <p className="text-2xl font-bold mt-0.5" style={{ color: "var(--admin-text-primary)" }}>
                  {isLoadingStats ? "—" : stats?.todayOrders ?? 0}
                </p>
              </div>
            </div>
          </div>

          {/* Today's Revenue */}
          <div 
            className="rounded-xl border p-5 transition-all hover:shadow-md hover:-translate-y-0.5"
            style={{ 
              backgroundColor: "var(--admin-card-bg)",
              borderColor: "var(--admin-border)"
            }}
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50">
                <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--admin-text-muted)" }}>
                  Today&apos;s Revenue
                </p>
                <p className="text-2xl font-bold mt-0.5" style={{ color: "var(--admin-text-primary)" }}>
                  {isLoadingStats ? "—" : formatCurrency(stats?.todayRevenue ?? 0)}
                </p>
              </div>
            </div>
          </div>

          {/* Pending Stops */}
          <div 
            className="rounded-xl border p-5 transition-all hover:shadow-md hover:-translate-y-0.5"
            style={{ 
              backgroundColor: "var(--admin-card-bg)",
              borderColor: "var(--admin-border)"
            }}
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50">
                <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--admin-text-muted)" }}>
                  Pending Stops
                </p>
                <p className="text-2xl font-bold mt-0.5" style={{ color: "var(--admin-text-primary)" }}>
                  {isLoadingStats ? "—" : stats?.pendingStops ?? 0}
                </p>
              </div>
            </div>
          </div>

          {/* Active Products — uses plan-aware usage.products so this card
              always matches the "Products 0/25" usage bar below and the
              billing page's invoice/usage row. Previously this came from a
              separate query (`active=eq.true` only) and could disagree with
              the plan limit usage, producing e.g. "1 vs 0/25" in the same
              dashboard. */}
          <div
            className="rounded-xl border p-5 transition-all hover:shadow-md hover:-translate-y-0.5"
            style={{
              backgroundColor: "var(--admin-card-bg)",
              borderColor: "var(--admin-border)"
            }}
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50">
                <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--admin-text-muted)" }}>
                  Active Products
                </p>
                <p className="text-2xl font-bold mt-0.5" style={{ color: "var(--admin-text-primary)" }}>
                  {/* usage.products comes from the server-rendered prop (via
                      getBillingOverview), so it's available immediately and
                      is guaranteed to match the "Products X/25" usage bar
                      and the billing page. */}
                  {usage.products}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions + Recent Orders Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Quick Actions */}
          <div 
            className="rounded-xl border p-5"
            style={{ 
              backgroundColor: "var(--admin-card-bg)",
              borderColor: "var(--admin-border)"
            }}
          >
            <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--admin-text-primary)" }}>
              Quick Actions
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex items-center gap-2 p-3 rounded-xl border transition-all hover:-translate-y-0.5 hover:shadow-sm"
                  style={{ 
                    borderColor: "var(--admin-border-light)",
                    backgroundColor: "var(--admin-bg-subtle)"
                  }}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: "var(--admin-accent-light)" }}>
                    {action.icon === "plus" && (
                      <svg className="w-4 h-4" style={{ color: "var(--admin-accent)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                    )}
                    {action.icon === "map" && (
                      <svg className="w-4 h-4" style={{ color: "var(--admin-accent)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                      </svg>
                    )}
                    {action.icon === "package" && (
                      <svg className="w-4 h-4" style={{ color: "var(--admin-accent)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                      </svg>
                    )}
                    {action.icon === "mail" && (
                      <svg className="w-4 h-4" style={{ color: "var(--admin-accent)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-3-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                      </svg>
                    )}
                  </div>
                  <span className="text-sm font-medium" style={{ color: "var(--admin-text-secondary)" }}>
                    {action.label}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* Recent Orders */}
          <div 
            className="lg:col-span-2 rounded-xl border overflow-hidden"
            style={{ 
              backgroundColor: "var(--admin-card-bg)",
              borderColor: "var(--admin-border)"
            }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--admin-border-light)" }}>
              <h3 className="text-sm font-semibold" style={{ color: "var(--admin-text-primary)" }}>
                Recent Orders
              </h3>
              <Link 
                href="/admin/orders" 
                className="text-xs font-medium hover:underline"
                style={{ color: "var(--admin-accent)" }}
              >
                View all →
              </Link>
            </div>
            <div className="divide-y" style={{ borderColor: "var(--admin-border-light)" }}>
              {stats?.recentOrders && stats.recentOrders.length > 0 ? (
                stats.recentOrders.map((order) => {
                  const badge = getStatusBadge(order.status);
                  return (
                    <div key={order.id} className="flex items-center justify-between px-5 py-4 hover:bg-stone-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: "var(--admin-bg)" }}>
                          <svg className="w-5 h-5 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM12.94 18.55l.276-.276a.75.75 0 011.06 0l.27.27a.75.75 0 010 1.06l-.27.27a.75.75 0 01-1.06 0l-.276-.276a.75.75 0 010-1.06z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium" style={{ color: "var(--admin-text-primary)" }}>
                            {order.customer_name}
                          </p>
                          <p className="text-xs" style={{ color: "var(--admin-text-muted)" }}>
                            {order.created_at}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-semibold" style={{ color: "var(--admin-text-primary)" }}>
                          {formatCurrency(order.total)}
                        </span>
                        <span 
                          className="px-2.5 py-1 rounded-full text-xs font-medium capitalize"
                          style={{ backgroundColor: badge.bg, color: badge.text }}
                        >
                          {order.status}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="px-5 py-12 text-center">
                  <svg className="w-12 h-12 mx-auto mb-3" style={{ color: "var(--admin-text-muted)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <p className="text-sm" style={{ color: "var(--admin-text-muted)" }}>
                    No recent orders
                  </p>
                  <Link 
                    href="/admin/orders?new=true" 
                    className="inline-block mt-3 text-xs font-medium hover:underline"
                    style={{ color: "var(--admin-accent)" }}
                  >
                    Create your first order →
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Usage stats bar */}
        <div 
          className="rounded-xl border p-5"
          style={{ 
            backgroundColor: "var(--admin-card-bg)",
            borderColor: "var(--admin-border)"
          }}
        >
          <div className="flex items-center gap-4 mb-4">
            <AdminBadge variant={
              planTier === "enterprise" ? "warning" :
              planTier === "farm" ? "success" :
              "default"
            }>
              {planTier.charAt(0).toUpperCase() + planTier.slice(1)} Plan
            </AdminBadge>
            <span className="text-xs" style={{ color: "var(--admin-text-muted)" }}>
              {brandId ? brandName : "All Brands"}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-8">
            {[
              { label: "Users", value: `${usage.users}/${limits.max_users}`, pct: usagePct.users, icon: "users" },
              { label: "Stops", value: `${usage.stops_this_month}/${limits.max_stops_monthly}`, pct: usagePct.stops, icon: "map" },
              { label: "Products", value: `${usage.products}/${limits.max_products}`, pct: usagePct.products, icon: "package" },
            ].map(({ label, value, pct }) => (
              <div key={label}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {label === "Users" && (
                      <svg className="w-4 h-4" style={{ color: "var(--admin-text-muted)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                      </svg>
                    )}
                    {label === "Stops" && (
                      <svg className="w-4 h-4" style={{ color: "var(--admin-text-muted)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                      </svg>
                    )}
                    {label === "Products" && (
                      <svg className="w-4 h-4" style={{ color: "var(--admin-text-muted)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                      </svg>
                    )}
                    <span className="text-sm font-medium" style={{ color: "var(--admin-text-secondary)" }}>{label}</span>
                  </div>
                  <span className="text-sm font-semibold" style={{ color: "var(--admin-text-primary)" }}>{value}</span>
                </div>
                <div className="h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--admin-bg)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-500 ease-out"
                    style={{ 
                      width: `${Math.min(pct, 100)}%`,
                      backgroundColor: pct > 90 ? "var(--admin-danger)" : pct > 75 ? "#f59e0b" : "var(--admin-accent)"
                    }}
                  />
                </div>
                {pct > 85 && (
                  <p className="text-xs mt-1.5" style={{ color: "var(--admin-danger)" }}>
                    Near limit - consider upgrading
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Tab navigation */}
        <AdminFilterTabs
          activeTab={activeTab}
          onTabChange={(value) => setActiveTab(value as Tab)}
          tabs={TABS.map((tab) => ({
            value: tab.id,
            label: tab.label,
            icon: tab.icon,
          }))}
          size="md"
          showCounts={false}
        />

        {/* Section Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
                  "group relative flex flex-col rounded-xl border p-5 transition-all hover:-translate-y-0.5 hover:shadow-md",
                  isAddon && !isEnabled
                    ? "border-stone-200 shadow-sm opacity-75 hover:opacity-100"
                    : isProminent
                    ? "border-[var(--admin-accent)]/20 shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
                    : "border-stone-200 shadow-sm",
                ].join(" ")}
                style={{ backgroundColor: "var(--admin-card-bg)" }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl transition-transform group-hover:scale-110 ${
                    isAddon && !isEnabled
                      ? "bg-stone-100 text-stone-400"
                      : isProminent
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-stone-100 text-stone-600"
                  }`}>
                    {section.title === "Orders" && (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM12.94 18.55l.276-.276a.75.75 0 011.06 0l.27.27a.75.75 0 010 1.06l-.27.27a.75.75 0 01-1.06 0l-.276-.276a.75.75 0 010-1.06z" />
                      </svg>
                    )}
                    {section.title === "Products" && (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                      </svg>
                    )}
                    {section.title === "Tours & Stops" && (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                      </svg>
                    )}
                    {section.title === "Driver Pickup" && (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                      </svg>
                    )}
                    {!["Orders", "Products", "Tours & Stops", "Driver Pickup"].includes(section.title) && (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                  </div>
                  {isAddon && !isEnabled && (
                    <AdminBadge variant="warning">
                      Add-on
                    </AdminBadge>
                  )}
                  {isAddon && isEnabled && (
                    <AdminBadge variant="success">
                      Active
                    </AdminBadge>
                  )}
                  {isProminent && (
                    <AdminBadge variant="success">
                      Core
                    </AdminBadge>
                  )}
                </div>

                <h3 className="text-sm font-semibold leading-tight" style={{ color: "var(--admin-text-primary)" }}>
                  {section.title}
                </h3>

                <p className={`mt-2 text-sm leading-relaxed ${
                  isAddon && !isEnabled ? "text-stone-500" : "text-stone-600"
                }`}>
                  {section.description}
                </p>

                {isAddon && !isEnabled && section.upgradeText && (
                  <p className="mt-3 text-xs font-medium" style={{ color: "var(--admin-warning)" }}>
                    {section.upgradeText}
                  </p>
                )}
                
                {/* Arrow indicator */}
                <div className="mt-4 flex items-center text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "var(--admin-accent)" }}>
                  Open section
                  <svg className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </div>
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