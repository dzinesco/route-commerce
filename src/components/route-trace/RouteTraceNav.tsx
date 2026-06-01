"use client";

const TABS = [
  { id: "dashboard", label: "Dashboard", href: "/admin/route-trace" },
  { id: "lots", label: "Lots", href: "/admin/route-trace/lots" },
  { id: "lookup", label: "Lookup", href: "/admin/route-trace/lookup" },
  { id: "settings", label: "Settings", href: "/admin/route-trace/settings" },
];

export default function RouteTraceNav({
  activeTab,
}: {
  activeTab: "dashboard" | "lots" | "lookup" | "settings";
}) {
  return (
    <div className="border-b border-stone-200 mb-6">
      <nav className="flex gap-1 -mb-px">
        {TABS.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <a
              key={tab.id}
              href={tab.href}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap rounded-t-lg ${
                isActive
                  ? "border-stone-900 text-stone-900 bg-white"
                  : "border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300"
              }`}
            >
              {tab.label}
            </a>
          );
        })}
      </nav>
    </div>
  );
}