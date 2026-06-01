import Link from "next/link";
import { getAdminUser } from "@/lib/admin-permissions";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { getBrandPlanInfo } from "@/actions/billing/stripe-portal";
import DashboardHeader from "@/components/admin/DashboardHeader";

const TUXEDO_BRAND_ID = "64294306-5f42-463d-a5e8-2ad6c81a96de";

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

const groupMeta = {
  operations: { label: "Core Operations", cols: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4" },
  fulfillment: { label: "Fulfillment & Logistics", cols: "grid-cols-1 md:grid-cols-3" },
  management: { label: "Business Management", cols: "grid-cols-1 md:grid-cols-3" },
  tools: { label: "Tools & Add-ons", cols: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4" },
} as const;

export default async function AdminPage() {
  const adminUser = await getAdminUser();
  const isStoreEmployee = adminUser?.role === "store_employee";

  const isWaterLogVisible =
    adminUser?.role === "platform_admin" ||
    (adminUser?.role === "brand_admin" &&
      adminUser?.brand_id === TUXEDO_BRAND_ID &&
      adminUser?.can_manage_water_log);

  const enabledAddons: Record<string, boolean> = {};
  let planTier = "starter";
  let usage = { users: 0, stops_this_month: 0, products: 0 };
  let limits = { max_users: 1, max_stops_monthly: 10, max_products: 25 };
  let brandDisplayName = "Admin";
  if (adminUser?.brand_id) {
    for (const key of ["harvest_reach", "wholesale_portal", "water_log", "ai_tools", "sms_campaigns", "square_sync", "route_trace"] as const) {
      enabledAddons[key] = await isFeatureEnabled(adminUser.brand_id, key);
    }
    const planResult = await getBrandPlanInfo(adminUser.brand_id);
    if (planResult.success && planResult.data) {
      planTier = planResult.data.plan_tier ?? "starter";
      usage = planResult.data.usage ?? usage;
      limits = {
        max_users: planResult.data.max_users ?? 1,
        max_stops_monthly: planResult.data.max_stops_monthly ?? 10,
        max_products: planResult.data.max_products ?? 25,
      };
      if (planResult.data.brand_name) brandDisplayName = planResult.data.brand_name;
    }
  }

  if (isStoreEmployee) {
    return (
      <main className="min-h-screen px-6 py-12">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-3xl font-semibold tracking-tight text-stone-950">Driver Pickup</h1>
          <p className="mt-3 text-sm text-stone-600">
            Use the buttons below to look up orders, record pickups, and manage fulfillment.
          </p>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            <Link
              href="/admin/pickup"
              className="block rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
            >
              <div className="flex items-center gap-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 transition-colors">
                  <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-stone-950">Pickup Lookup</h2>
                  <p className="mt-0.5 text-sm text-stone-500">Scan QR or search orders</p>
                </div>
              </div>
            </Link>
            <Link
              href="/admin/wholesale"
              className="block rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
            >
              <div className="flex items-center gap-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 transition-colors">
                  <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-stone-950">Wholesale Portal</h2>
                  <p className="mt-0.5 text-sm text-stone-500">Approved buyer orders</p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const allGroups = [
    {
      key: "operations" as const,
      label: groupMeta.operations.label,
      cols: groupMeta.operations.cols,
      sections: sections.filter((s) => s.group === "operations"),
    },
    {
      key: "fulfillment" as const,
      label: groupMeta.fulfillment.label,
      cols: groupMeta.fulfillment.cols,
      sections: sections.filter((s) => s.group === "fulfillment"),
    },
    {
      key: "management" as const,
      label: groupMeta.management.label,
      cols: groupMeta.management.cols,
      sections: sections.filter((s) => s.group === "management"),
    },
    {
      key: "tools" as const,
      label: groupMeta.tools.label,
      cols: groupMeta.tools.cols,
      sections: sections.filter((s) => s.group === "tools"),
    },
  ];

  const usagePct = {
    users: limits.max_users > 0 ? (usage.users / limits.max_users) * 100 : 0,
    stops: limits.max_stops_monthly > 0 ? (usage.stops_this_month / limits.max_stops_monthly) * 100 : 0,
    products: limits.max_products > 0 ? (usage.products / limits.max_products) * 100 : 0,
  };

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-7xl space-y-10">
        {/* Header */}
        <DashboardHeader
          brandId={adminUser?.brand_id ?? null}
          brandName={brandDisplayName}
          planTier={planTier}
        />

        {/* Usage bar */}
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-5 mb-5">
            <span className={`rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide ${
              planTier === "enterprise" ? "bg-amber-100 text-amber-700 border border-amber-200" :
              planTier === "farm" ? "bg-emerald-100 text-emerald-700 border border-emerald-200" :
              "bg-stone-100 text-stone-600 border border-stone-200"
            }`}>
              {planTier.charAt(0).toUpperCase() + planTier.slice(1)} Plan
            </span>
            <span className="text-sm text-stone-500">{adminUser?.brand_id ? "Tuxedo Corn" : "All Brands"}</span>
          </div>
          <div className="grid grid-cols-3 gap-8">
            {[
              { label: "Users", value: `${usage.users}/${limits.max_users}`, pct: usagePct.users },
              { label: "Stops / month", value: `${usage.stops_this_month}/${limits.max_stops_monthly}`, pct: usagePct.stops },
              { label: "Products", value: `${usage.products}/${limits.max_products}`, pct: usagePct.products },
            ].map(({ label, value, pct }) => (
              <div key={label}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-stone-600">{label}</span>
                  <span className="text-sm font-semibold text-stone-900">{value}</span>
                </div>
                <div className="h-1.5 rounded-full bg-stone-200 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      pct > 85 ? "bg-gradient-to-r from-amber-500 to-amber-400" : "bg-gradient-to-r from-emerald-500 to-emerald-400"
                    }`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Grouped sections */}
        {allGroups.map(({ key, label, cols, sections: groupSections }) => {
          if (groupSections.length === 0) return null;
          return (
            <div key={key}>
              <div className="flex items-center gap-4 mb-5">
                <p className="text-[11px] font-bold uppercase tracking-widest text-stone-600 flex-shrink-0">{label}</p>
                <div className="h-px flex-1 bg-gradient-to-r from-stone-300 to-transparent" />
              </div>
              <div className={`grid ${cols} gap-4`}>
                {groupSections.map((section) => {
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
                        "group relative flex flex-col rounded-2xl border bg-white p-5 transition-all hover:-translate-y-0.5",
                        isAddon && !isEnabled
                          ? "border-stone-200 shadow-sm opacity-75 hover:opacity-100"
                          : isProminent
                          ? "border-stone-200 shadow-md shadow-stone-200/50 hover:shadow-lg"
                          : "border-stone-200 shadow-sm hover:shadow-md",
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
          );
        })}
      </div>
    </main>
  );
}