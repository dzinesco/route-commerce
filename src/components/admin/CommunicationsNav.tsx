"use client";

const TABS = [
  { id: "campaigns", label: "Campaigns" },
  { id: "compose", label: "Compose" },
  { id: "segments", label: "Segments" },
  { id: "analytics", label: "Analytics" },
  { id: "templates", label: "Templates" },
  { id: "contacts", label: "Contacts" },
  { id: "logs", label: "Logs" },
];

// Icon components
const Icons = {
  mail: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2"/>
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
    </svg>
  ),
  send: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m22 2-11 11"/>
      <path d="M22 2 15 22l-4-9-9-4 20-7z"/>
    </svg>
  ),
  users: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  chart: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" x2="12" y1="20" y2="10"/>
      <line x1="18" x2="18" y1="20" y2="4"/>
      <line x1="6" x2="6" y1="20" y2="16"/>
    </svg>
  ),
  fileText: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" x2="8" y1="13" y2="13"/>
      <line x1="16" x2="8" y1="17" y2="17"/>
      <line x1="10" x2="8" y1="9" y2="9"/>
    </svg>
  ),
  userCheck: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <polyline points="16 11 18 13 22 9"/>
    </svg>
  ),
  list: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" x2="21" y1="6" y2="6"/>
      <line x1="8" x2="21" y1="12" y2="12"/>
      <line x1="8" x2="21" y1="18" y2="18"/>
      <line x1="3" x2="3.01" y1="6" y2="6"/>
      <line x1="3" x2="3.01" y1="12" y2="12"/>
      <line x1="3" x2="3.01" y1="18" y2="18"/>
    </svg>
  ),
  settings: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  filter: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
    </svg>
  ),
};

export default function CommunicationsNav({
  activeTab,
}: {
  activeTab: "campaigns" | "templates" | "contacts" | "logs" | "segments" | "analytics" | "compose";
}) {
  return (
    <nav className="grid grid-cols-4 sm:grid-cols-7 gap-1 p-1.5 rounded-xl bg-white border border-stone-200">
      {TABS.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <a
            key={tab.id}
            href={`/admin/communications/${tab.id}`}
            className={`relative flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 rounded-lg px-2 sm:px-3 py-2.5 text-[10px] sm:text-xs font-semibold transition-colors ${
              isActive
                ? "bg-emerald-600 text-white"
                : "text-stone-500 hover:text-stone-700 hover:bg-stone-50"
            }`}
          >
            {tab.id === "campaigns" && Icons.send("h-3.5 w-3.5 sm:h-4 sm:w-4")}
            {tab.id === "compose" && Icons.mail("h-3.5 w-3.5 sm:h-4 sm:w-4")}
            {tab.id === "segments" && Icons.users("h-3.5 w-3.5 sm:h-4 sm:w-4")}
            {tab.id === "analytics" && Icons.chart("h-3.5 w-3.5 sm:h-4 sm:w-4")}
            {tab.id === "templates" && Icons.fileText("h-3.5 w-3.5 sm:h-4 sm:w-4")}
            {tab.id === "contacts" && Icons.userCheck("h-3.5 w-3.5 sm:h-4 sm:w-4")}
            {tab.id === "logs" && Icons.list("h-3.5 w-3.5 sm:h-4 sm:w-4")}
            <span>{tab.label}</span>
            {isActive && (
              <div className="absolute bottom-1 sm:bottom-1.5 left-1/2 -translate-x-1/2 h-0.5 w-4 sm:w-8 bg-white rounded-full" />
            )}
          </a>
        );
      })}
    </nav>
  );
}

export { TABS, Icons };