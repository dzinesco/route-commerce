/**
 * @deprecated Use AdminSidebar instead. AdminHeader is deprecated and will be removed.
 * The AdminSidebar provides the complete navigation system for admin pages.
 * It includes an expandable Settings sub-menu with all settings pages.
 */
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { signOutAction } from "@/actions/auth-actions";

type AdminHeaderProps = {
  userRole?: string | null;
  canManageUsers?: boolean;
  routeTraceEnabled?: boolean;
};

type NavLink = {
  href: string;
  label: string;
  external?: boolean;
};

type SettingsItem = {
  href: string;
  label: string;
  description: string;
};

const SETTINGS_ITEMS: SettingsItem[] = [
  { href: "/admin/settings", label: "General", description: "Brand name, logo, timezone" },
  { href: "/admin/settings/apps", label: "Add-ons", description: "Enable and manage feature add-ons" },
  { href: "/admin/settings/billing", label: "Billing & Plans", description: "Subscription, invoices, usage" },
  { href: "/admin/settings/payments", label: "Payments", description: "Stripe, Square, payment methods" },
  { href: "/admin/communications/abandoned-carts", label: "Abandoned Cart Recovery", description: "3-email recovery sequence, recovered carts" },
  { href: "/admin/communications/welcome-sequence", label: "Welcome Sequence", description: "4-email onboarding for new subscribers" },
];

const BASE_NAV_LINKS: NavLink[] = [
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/stops", label: "Stops & Routes" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/time-tracking", label: "Time Tracking" },
  { href: "/admin/communications", label: "Harvest Reach" },
];

const EMPLOYEE_NAV_LINKS: NavLink[] = [
  { href: "/admin/wholesale", label: "Wholesale" },
  { href: "/admin/pickup", label: "Pickup" },
  { href: "/wholesale/employee", label: "Pickup Portal", external: true },
];

export default function AdminHeader({ userRole, canManageUsers, routeTraceEnabled }: AdminHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isStoreEmployee = userRole === "store_employee";
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Close dropdown on route change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSettingsOpen(false);
  }, [pathname]);

  const moduleLinks: NavLink[] = routeTraceEnabled
    ? [{ href: "/admin/route-trace", label: "Route Trace" }]
    : [];

  const fullNavLinks = BASE_NAV_LINKS.concat(
    userRole === "platform_admin" ? [{ href: "/admin/command-center", label: "Command Center" }] : []
  ).concat(moduleLinks);

  const navLinks = isStoreEmployee ? EMPLOYEE_NAV_LINKS : fullNavLinks;
  const homeHref = isStoreEmployee ? "/admin/wholesale" : "/admin";
  const homeLabel = isStoreEmployee ? "Pickup" : "Admin";

  async function handleLogout() {
    await signOutAction();
  }

  const roleLabel = userRole === "platform_admin" ? "Platform Admin"
    : userRole === "brand_admin" ? "Brand Admin"
    : userRole === "store_employee" ? "Store Employee"
    : null;

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    if (href === "/admin/settings") {
      return pathname === "/admin/settings" || pathname.startsWith("/admin/settings/");
    }
    return pathname.startsWith(href);
  };

  const isSettingsActive =
    pathname.startsWith("/admin/settings") ||
    pathname === "/admin/settings" ||
    pathname.startsWith("/admin/communications/abandoned-carts") ||
    pathname.startsWith("/admin/communications/welcome-sequence");

  return (
    <header className="border-b border-white/5 bg-gradient-to-b from-zinc-900/80 to-transparent backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-0">
        <div className="flex items-center h-16">
          {/* Logo mark */}
          <Link
            href={homeHref}
            className="flex items-center gap-3 mr-8 text-white hover:text-emerald-400 transition-colors"
          >
            <div className="relative">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/30">
                <svg className="h-4.5 w-4.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l.707-.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
            </div>
            <span className="text-sm font-semibold tracking-tight">{homeLabel}</span>
          </Link>

          <nav className="flex h-full items-center gap-1">
            {navLinks.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  {...(link.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className={[
                    "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                    active
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent",
                  ].join(" ")}
                >
                  {link.label}
                </Link>
              );
            })}

            {/* Settings dropdown */}
            <div className="relative ml-2" ref={settingsRef}>
              <button
                onClick={() => setSettingsOpen(v => !v)}
                className={[
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2",
                  isSettingsActive
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent",
                ].join(" ")}
              >
                Settings
                <svg className={`w-3.5 h-3.5 transition-transform ${settingsOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {settingsOpen && (
                <div className="absolute top-full left-0 mt-2 w-80 rounded-2xl glass-strong shadow-2xl z-50 overflow-hidden border border-white/10">
                  <div className="p-2">
                    {SETTINGS_ITEMS.map((item) => {
                      const active = pathname === item.href || (item.href !== "/admin/settings" && pathname.startsWith(item.href));
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={[
                            "flex items-start gap-3 rounded-xl px-4 py-3 transition-all duration-200",
                            active
                              ? "bg-emerald-500/10 border border-emerald-500/20"
                              : "hover:bg-white/5 border border-transparent",
                          ].join(" ")}
                        >
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${active ? "text-emerald-400" : "text-white"}`}>
                              {item.label}
                            </p>
                            <p className="text-xs text-zinc-500 mt-0.5 leading-snug">{item.description}</p>
                          </div>
                          {active && (
                            <span className="mt-0.5 flex-shrink-0 w-2 h-2 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50" />
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </nav>
        </div>
        <div className="flex items-center gap-6">
          {roleLabel && (
            <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/5">
              <span className="text-xs font-medium text-zinc-400">{roleLabel}</span>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="text-sm font-medium text-zinc-500 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
