"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

// Warm earth-tone dark sidebar design
// Colors: stone-900 bg, stone-300 text, emerald accent

const TOP_LINKS = [
  { href: "/admin", label: "Dashboard", icon: "grid" },
  { href: "/admin/orders", label: "Orders", icon: "shopping-cart" },
  { href: "/admin/stops", label: "Stops & Routes", icon: "map-pin" },
  { href: "/admin/products", label: "Products", icon: "package" },
  { href: "/admin/route-trace", label: "Route Trace", icon: "clipboard" },
  { href: "/admin/time-tracking", label: "Time Tracking", icon: "clock" },
  { href: "/admin/communications", label: "Communications", icon: "mail" },
];

const SETTINGS_SUB_LINKS = [
  { href: "/admin/settings", label: "General" },
  { href: "/admin/settings#workers", label: "Workers & PINs" },
  { href: "/admin/settings#tasks", label: "Tasks" },
  { href: "/admin/settings#users", label: "Users & Permissions" },
  { href: "/admin/settings#integrations", label: "Integrations" },
];

function GridIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? "w-4 h-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25a2.25 2.25 0 01-2.25 2.25H15.75a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H15.75a2.25 2.25 0 01-2.25-2.25v-2.25z" />
    </svg>
  );
}

function CartIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? "w-4 h-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM12.94 18.55l.276-.276a.75.75 0 011.06 0l.27.27a.75.75 0 010 1.06l-.27.27a.75.75 0 01-1.06 0l-.276-.276a.75.75 0 010-1.06z" />
    </svg>
  );
}

function MapPinIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? "w-4 h-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
    </svg>
  );
}

function PackageIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? "w-4 h-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  );
}

function ClipboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? "w-4 h-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.801 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? "w-4 h-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function MailIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? "w-4 h-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-3-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
    </svg>
  );
}

function SettingsCogIcon({ open }: { open: boolean }) {
  return (
    <svg className={`w-4 h-4 transition-transform ${open ? "rotate-45" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09.542.56.94 1.11.94h2.64c.55 0 1.02-.398 1.11-.94l.213-1.999c.018-.158.04-.315.062-.472a.563.563 0 00-.122-.519l-.79-2.758A.562.562 0 0014.56 0H9.44a.563.563 0 00-.424.264l-.79 2.758a.563.563 0 00-.122.519c.022.157.044.314.062.472l.213 1.999zM12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  );
}

function HamburgerIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
  );
}

const ICON_MAP: Record<string, React.ReactNode> = {
  grid: <GridIcon />,
  "shopping-cart": <CartIcon />,
  "map-pin": <MapPinIcon />,
  package: <PackageIcon />,
  clipboard: <ClipboardIcon />,
  clock: <ClockIcon />,
  mail: <MailIcon />,
};

type SidebarProps = {
  userRole?: string | null;
};

export default function AdminSidebar({ userRole }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const roleLabel = userRole === "platform_admin" ? "Platform Admin"
    : userRole === "brand_admin" ? "Brand Admin"
    : userRole === "store_employee" ? "Store Employee"
    : null;

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    if (href === "/admin/settings") return pathname === "/admin/settings" || pathname.startsWith("/admin/settings");
    return pathname.startsWith(href);
  };

  const isSettingsPage = pathname.startsWith("/admin/settings");

  async function handleLogout() {
    document.cookie = "dev_session=;path=/;max-age=0";
    await supabase.auth.signOut();
    setMobileOpen(false);
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 lg:hidden"
        aria-label="Open sidebar"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-md border border-stone-200">
          <HamburgerIcon />
        </div>
      </button>

      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar panel - Warm earth-tone dark */}
      <aside className={[
        "fixed top-0 left-0 h-full w-60 z-50",
        "bg-stone-900 border-r border-stone-800",
        "flex flex-col transition-transform duration-300 lg:translate-x-0",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      ].join(" ")}>

        {/* Logo row */}
        <div className="flex items-center h-16 px-5 border-b border-stone-800 flex-shrink-0">
          <Link
            href="/admin"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3 text-stone-100 hover:text-emerald-400 transition-colors"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 shadow-sm">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold tracking-tight">Admin</span>
              <a
                href="/"
                onClick={(e) => e.stopPropagation()}
                className="text-xs text-stone-500 hover:text-stone-300 transition-colors ml-2"
              >
                ← Back to Site
              </a>
            </div>
          </Link>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-1">
          {TOP_LINKS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={[
                  "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                  active
                    ? "bg-emerald-900/20 text-emerald-400 border-l-2 border-emerald-500"
                    : "text-stone-300 hover:text-stone-100 hover:bg-stone-800/50 border-l-2 border-transparent",
                ].join(" ")}
              >
                <span className={[
                  "flex-shrink-0 transition-colors",
                  active ? "text-emerald-400" : "text-stone-500 group-hover:text-stone-300"
                ].join(" ")}>
                  {ICON_MAP[item.icon]}
                </span>
                {item.label}
                {active && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500" />
                )}
              </Link>
            );
          })}

          {/* Settings collapsible section */}
          <div className="pt-4 pb-1">
            <div className="h-px bg-stone-800 mb-4" />
            <button
              onClick={() => setSettingsOpen(v => !v)}
              className={[
                "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                isSettingsPage
                  ? "bg-emerald-900/20 text-emerald-400 border-l-2 border-emerald-500"
                  : "text-stone-300 hover:text-stone-100 hover:bg-stone-800/50 border-l-2 border-transparent",
              ].join(" ")}
            >
              <span className="flex items-center gap-3">
                <span className={isSettingsPage ? "text-emerald-400" : "text-stone-500"}>
                  <SettingsCogIcon open={settingsOpen} />
                </span>
                Settings
              </span>
              <ChevronIcon open={settingsOpen} />
            </button>

            {settingsOpen && (
              <div className="mt-2 ml-2 space-y-0.5 border-l border-stone-700 pl-3">
                {SETTINGS_SUB_LINKS.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={[
                        "flex items-center px-3 py-2 rounded-lg text-sm transition-all duration-200",
                        active
                          ? "bg-emerald-900/20 text-emerald-400"
                          : "text-stone-400 hover:text-stone-200 hover:bg-stone-800/50",
                      ].join(" ")}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </nav>

        {/* Bottom: role + sign out */}
        <div className="px-4 py-5 border-t border-stone-800 flex-shrink-0">
          {roleLabel && (
            <div className="px-3 py-2 mb-3 rounded-lg bg-stone-800 border border-stone-700">
              <p className="text-[10px] text-stone-500 font-medium uppercase tracking-widest mb-0.5">{roleLabel}</p>
              <p className="text-xs text-stone-400">Signed in</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full px-3 py-2 rounded-lg text-sm font-medium text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-all border border-transparent"
          >
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}