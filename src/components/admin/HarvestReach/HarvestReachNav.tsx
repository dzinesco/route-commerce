"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin/harvest-reach/segments", label: "Segments" },
  { href: "/admin/harvest-reach/campaigns", label: "Campaigns" },
  { href: "/admin/harvest-reach/analytics", label: "Analytics" },
];

export default function HarvestReachNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 border-b border-zinc-800 mb-6">
      {TABS.map((tab) => {
        const active = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              active
                ? "border-stone-900 text-stone-900"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}