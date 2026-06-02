"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { 
    href: "/admin/harvest-reach/segments", 
    label: "Segments",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 2 7 12 12 22 7 12 2"/>
        <polyline points="2 17 12 22 22 17"/>
        <polyline points="2 12 12 17 22 12"/>
      </svg>
    ),
  },
  { 
    href: "/admin/harvest-reach/campaigns", 
    label: "Campaigns",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
        <polyline points="22,6 12,13 2,6"/>
      </svg>
    ),
  },
  { 
    href: "/admin/harvest-reach/analytics", 
    label: "Analytics",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/>
        <line x1="12" y1="20" x2="12" y2="4"/>
        <line x1="6" y1="20" x2="6" y2="14"/>
      </svg>
    ),
  },
];

export default function HarvestReachNav() {
  const pathname = usePathname();

  return (
    <div className="flex flex-col">
      {/* Brand header */}
      <div className="flex items-center gap-3 pb-4 mb-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/20">
          <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
        </div>
        <div>
          <h1 className="text-lg font-bold text-stone-900">Harvest Reach</h1>
          <p className="text-xs text-stone-500">Email marketing & campaigns</p>
        </div>
      </div>

      {/* Navigation tabs */}
      <nav className="flex gap-1 p-1 bg-stone-100 rounded-xl">
        {TABS.map((tab) => {
          const active = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                active
                  ? "bg-white text-emerald-600 shadow-sm"
                  : "text-stone-500 hover:text-stone-700 hover:bg-white/50"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}