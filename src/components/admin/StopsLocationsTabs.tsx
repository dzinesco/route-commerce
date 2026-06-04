"use client";

import Link from "next/link";

type Props = {
  active: "stops" | "locations";
  stopCount: number;
  locationCount: number;
  stopsSublabel?: string; // e.g. "269 · 7 cities"
  locationsSublabel?: string; // e.g. "41 · 8 cities"
};

const StopIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const PinIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

export default function StopsLocationsTabs({
  active,
  stopCount,
  locationCount,
  stopsSublabel,
  locationsSublabel,
}: Props) {
  const tabs = [
    {
      value: "stops" as const,
      label: "Stops",
      count: stopCount,
      sublabel: stopsSublabel,
      icon: <StopIcon />,
      href: "/admin/stops",
    },
    {
      value: "locations" as const,
      label: "Locations",
      count: locationCount,
      sublabel: locationsSublabel,
      icon: <PinIcon />,
      href: "/admin/stops?tab=locations",
    },
  ];

  return (
    <div
      className="flex flex-wrap items-stretch gap-1.5 px-3 py-2.5 border-b border-[var(--admin-border)] bg-[var(--admin-card-bg-alt)]"
      role="tablist"
      aria-label="Stops and Locations tabs"
    >
      {tabs.map((t) => {
        const isActive = t.value === active;
        return (
          <Link
            key={t.value}
            href={t.href}
            role="tab"
            aria-selected={isActive}
            className={`
              group relative flex items-center gap-2.5 rounded-xl px-3.5 py-2
              text-sm font-semibold transition-all duration-200
              ${isActive
                ? "bg-white text-emerald-700 border border-emerald-200 shadow-sm"
                : "text-stone-600 border border-transparent hover:text-emerald-700 hover:bg-emerald-50/40"
              }
            `}
          >
            <span
              className={`flex-shrink-0 transition-colors ${isActive ? "text-emerald-600" : "text-stone-400 group-hover:text-emerald-500"}`}
              aria-hidden
            >
              {t.icon}
            </span>
            <span>{t.label}</span>
            <span
              className={`
                inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5
                text-[11px] font-bold tabular-nums
                ${isActive
                  ? "bg-emerald-600 text-white"
                  : "bg-stone-200/70 text-stone-600 group-hover:bg-emerald-100 group-hover:text-emerald-700"
                }
              `}
            >
              {t.count}
            </span>
            {t.sublabel && (
              <span
                className={`hidden sm:inline text-[11px] font-medium tabular-nums ${isActive ? "text-stone-500" : "text-stone-400"}`}
              >
                · {t.sublabel}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
