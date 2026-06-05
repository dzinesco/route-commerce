"use client";

import { useState, useEffect, useRef, useCallback, KeyboardEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

// Elegant warm sidebar design
// Colors: parchment 100 bg, soft linen text, powder petal accent

type NavItem = {
  href?: string;
  label: string;
  icon?: string;
  divider?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  // Main
  { href: "/admin", label: "Dashboard", icon: "grid" },
  { href: "/admin/orders", label: "Orders", icon: "shopping-cart" },
  { href: "/admin/stops", label: "Stops & Routes", icon: "map-pin" },
  { href: "/admin/products", label: "Products", icon: "package" },
  { href: "/admin/communications", label: "Communications", icon: "mail" },
  // Settings section
  { divider: true, label: "Settings" },
  { href: "/admin/settings", label: "General", icon: "settings" },
  { href: "/admin/time-tracking", label: "Workers & PINs", icon: "users" },
  { href: "/admin/time-tracking?tab=tasks", label: "Tasks", icon: "clipboard" },
  { href: "/admin/users", label: "Users & Permissions", icon: "shield" },
  { href: "/admin/settings/integrations", label: "Integrations", icon: "plug" },
  { href: "/admin/settings/billing", label: "Billing", icon: "billing" },
];

// Icon components
function GridIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? "w-4 h-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25a2.25 2.25 0 01-2.25 2.25H15.75a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H15.75a2.25 2.25 0 01-2.25-2.25v-2.25z" />
    </svg>
  );
}

function CartIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? "w-4 h-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM12.94 18.55l.276-.276a.75.75 0 011.06 0l.27.27a.75.75 0 010 1.06l-.27.27a.75.75 0 01-1.06 0l-.276-.276a.75.75 0 010-1.06z" />
    </svg>
  );
}

function MapPinIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? "w-4 h-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
    </svg>
  );
}

function PackageIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? "w-4 h-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  );
}

function ClipboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? "w-4 h-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.801 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? "w-4 h-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function MailIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? "w-4 h-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-3-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
    </svg>
  );
}

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? "w-4 h-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  );
}

function SettingsCogIcon({ open }: { open: boolean }) {
  return (
    <svg className={`w-4 h-4 transition-transform duration-200 ${open ? "rotate-45" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09.542.56.94 1.11.94h2.64c.55 0 1.02-.398 1.11-.94l.213-1.999c.018-.158.04-.315.062-.472a.563.563 0 00-.122-.519l-.79-2.758A.562.562 0 0014.56 0H9.44a.563.563 0 00-.424.264l-.79 2.758a.563.563 0 00-.122.519c.022.157.044.314.062.472l.213 1.999zM12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  );
}

function HamburgerIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function BillingIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? "w-4 h-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 0h3m-3.75 0h3m-3.75 0h3m3.75 0h3m-3.75 0h3m3.75 0h3m3.75 0h3" />
    </svg>
  );
}

function PuzzleIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? "w-4 h-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 01-.657.643 48.39 48.39 0 01-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 01-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 00-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 01-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 00.657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 01-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.4.604-.4.959v0c0 .333.277.599.61.58a48.1 48.1 0 005.427-.63 48.05 48.05 0 00.582-4.717.532.532 0 00-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.96.401v0a.656.656 0 00.658-.663 48.422 48.422 0 00-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 01-.61-.58v0z" />
    </svg>
  );
}

function PlugIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? "w-4 h-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
    </svg>
  );
}

function TruckIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? "w-4 h-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
    </svg>
  );
}

function SquareIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? "w-4 h-4"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" />
    </svg>
  );
}

function LogoutIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? "w-4 h-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? "w-4 h-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? "w-4 h-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
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
  settings: <SettingsCogIcon open={false} />,
  advanced: <SparkleIcon />,
  billing: <BillingIcon />,
  puzzle: <PuzzleIcon />,
  plug: <PlugIcon />,
  sparkles: <SparkleIcon />,
  truck: <TruckIcon />,
  square: <SquareIcon />,
  users: <UsersIcon />,
  shield: <ShieldIcon />,
};

type SidebarProps = {
  userRole?: string | null;
};

export default function AdminSidebar({ userRole }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const roleLabel = userRole === "platform_admin" ? "Platform Admin"
    : userRole === "brand_admin" ? "Brand Admin"
    : userRole === "store_employee" ? "Store Employee"
    : null;

  const isActive = useCallback((href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  }, [pathname]);

  // Close mobile menu with animation
  const closeMobileMenu = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setMobileOpen(false);
      setIsClosing(false);
    }, 200);
  }, []);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape" && mobileOpen) {
        closeMobileMenu();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [mobileOpen, closeMobileMenu]);

  // Focus trap and body scroll lock
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
      // Focus close button after animation
      setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 100);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  // Keyboard navigation for nav items
  const handleNavKeyDown = useCallback((e: KeyboardEvent<HTMLAnchorElement>, href: string, index: number) => {
    const navLinks = NAV_ITEMS.filter(item => !item.divider);
    
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const nextIndex = (index + 1) % navLinks.length;
      const nextLink = document.querySelector(`[data-nav-index="${nextIndex}"]`) as HTMLAnchorElement;
      nextLink?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prevIndex = index === 0 ? navLinks.length - 1 : index - 1;
      const prevLink = document.querySelector(`[data-nav-index="${prevIndex}"]`) as HTMLAnchorElement;
      prevLink?.focus();
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      router.push(href);
      if (mobileOpen) closeMobileMenu();
    }
  }, [router, mobileOpen, closeMobileMenu]);

  async function handleLogout() {
    document.cookie = "dev_session=;path=/;max-age=0";
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      {/* Mobile hamburger button - accessible */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 lg:hidden rounded-xl bg-white shadow-lg border border-[var(--admin-border)] p-3 transition-transform hover:scale-105 active:scale-95"
        aria-label="Open navigation menu"
        aria-expanded={mobileOpen}
        aria-controls="admin-sidebar"
        type="button"
      >
        <HamburgerIcon />
      </button>

      {/* Mobile overlay backdrop with blur */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-200"
          style={{ opacity: isClosing ? 0 : 1 }}
          onClick={closeMobileMenu}
          aria-hidden="true"
        />
      )}

      {/* Sidebar panel - Elegant warm dark with smooth transitions */}
      <aside
        ref={sidebarRef}
        id="admin-sidebar"
        className={[
          "fixed top-0 left-0 h-full w-56 z-50",
          "border-r flex flex-col",
          "transition-transform duration-300 ease-out lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          isClosing ? "opacity-90" : "opacity-100"
        ].join(" ")}
        style={{ 
          backgroundColor: "var(--admin-sidebar-bg)",
          borderColor: "rgba(208, 203, 180, 0.2)"
        }}
        role="navigation"
        aria-label="Admin navigation"
      >
        {/* Logo row with close button on mobile */}
        <div 
          className="flex items-center h-16 px-5 border-b flex-shrink-0" 
          style={{ borderColor: "rgba(208, 203, 180, 0.2)" }}
        >
          <div className="flex items-center justify-between w-full">
            <Link
              href="/admin"
              onClick={() => closeMobileMenu()}
              className="flex items-center gap-3 text-white hover:opacity-90 transition-opacity"
              aria-label="Admin Dashboard home"
            >
              <div 
                className="flex h-9 w-9 items-center justify-center rounded-xl shadow-sm transition-transform hover:scale-105" 
                style={{ backgroundColor: "var(--admin-accent)" }}
              >
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-sm font-semibold tracking-tight">Admin</span>
            </Link>
            
            {/* Mobile close button */}
            <button
              ref={closeButtonRef}
              onClick={closeMobileMenu}
              className="lg:hidden p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Close navigation menu"
              type="button"
            >
              <CloseIcon />
            </button>
          </div>
        </div>

        {/* Back to site link */}
        <div className="px-5 py-3 border-b flex-shrink-0" style={{ borderColor: "rgba(208, 203, 180, 0.2)" }}>
          <Link
            href="/"
            className="text-xs transition-colors flex items-center gap-1.5 hover:text-white"
            style={{ color: "var(--admin-sidebar-text)" }}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back to Site
          </Link>
        </div>

        {/* Nav links with keyboard navigation */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 scrollbar-thin">
          <ul className="space-y-1" role="list">
            {NAV_ITEMS.map((item, index) => {
              // Divider with optional label
              if (item.divider) {
                return (
                  <li key={`divider-${index}`} role="separator" aria-hidden="true">
                    <div className="flex items-center gap-2 px-3 py-3 mt-2">
                      <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "rgba(195, 195, 193, 0.5)" }}>
                        {item.label}
                      </span>
                    </div>
                  </li>
                );
              }

              const active = isActive(item.href!);
              const icon = item.icon ? ICON_MAP[item.icon] : null;
              const navIndex = NAV_ITEMS.filter(i => !i.divider).findIndex(i => i.href === item.href);

              return (
                <li key={item.href}>
                  <Link
                    href={item.href!}
                    data-nav-index={navIndex}
                    onClick={() => closeMobileMenu()}
                    onKeyDown={(e) => handleNavKeyDown(e, item.href!, navIndex)}
                    className={[
                      "group flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--admin-sidebar-bg)]",
                      active
                        ? "border-l-[3px]"
                        : "border-l-[3px] hover:border-l-[3px]",
                    ].join(" ")}
                    style={active ? {
                      backgroundColor: "rgba(202, 117, 67, 0.15)",
                      color: "#dea889",
                      borderColor: "var(--admin-accent)",
                      borderLeftColor: "var(--admin-accent)"
                    } : {
                      color: "var(--admin-sidebar-text)",
                      borderColor: "transparent"
                    }}
                    aria-current={active ? "page" : undefined}
                    tabIndex={0}
                  >
                    <span 
                      className="flex-shrink-0 transition-colors duration-200" 
                      style={{
                        color: active ? "var(--admin-accent)" : "rgba(208, 203, 180, 0.6)"
                      }}
                      aria-hidden="true"
                    >
                      {icon}
                    </span>
                    <span className="flex-1">{item.label}</span>
                    {active && (
                      <span 
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0 animate-pulse" 
                        style={{ backgroundColor: "var(--admin-accent)" }} 
                        aria-hidden="true"
                      />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Bottom: role + sign out */}
        <div 
          className="px-4 py-5 border-t flex-shrink-0" 
          style={{ borderColor: "rgba(208, 203, 180, 0.2)" }}
        >
          {roleLabel && (
            <div 
              className="px-3 py-2.5 mb-3 rounded-xl border" 
              style={{ 
                backgroundColor: "rgba(208, 203, 180, 0.1)",
                borderColor: "rgba(208, 203, 180, 0.2)"
              }}
            >
              <p className="text-[10px] font-medium uppercase tracking-widest mb-0.5" style={{ color: "rgba(195, 195, 193, 0.6)" }}>
                {roleLabel}
              </p>
              <p className="text-xs" style={{ color: "rgba(195, 195, 193, 0.8)" }}>Signed in</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 hover:bg-white/10"
            style={{ color: "rgba(195, 195, 193, 0.7)" }}
            aria-label="Sign out of admin"
            type="button"
          >
            <LogoutIcon />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}