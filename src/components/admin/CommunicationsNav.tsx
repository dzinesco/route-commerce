"use client";

const TABS = [
  { id: "campaigns", label: "Campaigns", href: "/admin/communications" },
  { id: "compose", label: "Compose", href: "/admin/communications/compose" },
  { id: "segments", label: "Segments", href: "/admin/communications/segments" },
  { id: "analytics", label: "Analytics", href: "/admin/communications/analytics" },
  { id: "templates", label: "Templates", href: "/admin/communications/templates" },
  { id: "contacts", label: "Contacts", href: "/admin/communications/contacts" },
  { id: "logs", label: "Message Logs", href: "/admin/communications/logs" },
  { id: "settings", label: "Settings", href: "/admin/communications/settings" },
];

export default function CommunicationsNav({
  activeTab,
}: {
  activeTab: "campaigns" | "templates" | "contacts" | "logs" | "settings" | "segments" | "analytics" | "compose";
}) {
  return (
    <div className="border-b border-zinc-800 mb-6">
      <nav className="flex gap-1 -mb-px">
        {TABS.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <a
              key={tab.id}
              href={tab.href}
              className={`px-1 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                isActive
                  ? "border-blue-600 text-blue-400"
                  : "border-transparent text-zinc-500 hover:text-zinc-300 hover:border-zinc-600"
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

export { TABS };