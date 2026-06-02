"use client";

import { useState, useEffect } from "react";
import SettingsSections from "@/components/admin/SettingsSections";
import UsersPage from "@/components/admin/UsersPage";

type Tab = "general" | "workers" | "tasks" | "users";

const TABS: { id: Tab; label: string; icon: string; hash: string }[] = [
  { id: "general", label: "General", icon: "settings", hash: "general" },
  { id: "workers", label: "Workers", icon: "users", hash: "workers" },
  { id: "tasks", label: "Tasks", icon: "list", hash: "tasks" },
  { id: "users", label: "Users", icon: "user-check", hash: "users" },
];

// Icon components
const Icons = {
  settings: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  users: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"/>
    </svg>
  ),
  "user-check": (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
    </svg>
  ),
  plug: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"/>
    </svg>
  ),
  list: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"/>
    </svg>
  ),
};

type Brand = { id: string; name: string };

type Props = {
  brandId: string;
  users: import("@/actions/admin/users").AdminUserRow[];
  brands: Brand[];
  currentUser: {
    id: string;
    role: string;
    can_manage_users: boolean;
  };
};

export default function SettingsClient({
  brandId,
  users,
  brands,
  currentUser,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("general");

  // Handle URL hash for sidebar navigation
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    const matchingTab = TABS.find(t => t.hash === hash);
    if (matchingTab) {
      setActiveTab(matchingTab.id);
    }
  }, []);

  return (
    <div className="min-h-screen bg-[var(--admin-bg)]">
      {/* Header */}
      <div className="px-4 sm:px-6 md:px-8 pt-4 sm:pt-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-emerald-600">
            {Icons.settings("h-5 w-5 sm:h-6 sm:w-6 text-white")}
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-[var(--admin-text-primary)] tracking-tight">Settings</h1>
            <p className="text-xs text-[var(--admin-text-muted)]">Manage your brand, workers, and integrations</p>
          </div>
        </div>

        {/* Tab navigation */}
        <nav className="grid grid-cols-5 gap-1 p-1.5 rounded-xl bg-white border border-stone-200">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 rounded-lg px-1 sm:px-3 py-2 text-[9px] sm:text-xs font-semibold transition-colors ${
                activeTab === tab.id
                  ? "bg-emerald-600 text-white"
                  : "text-stone-500 hover:text-stone-700 hover:bg-stone-50"
              }`}
            >
              {tab.icon === "settings" && Icons.settings("h-4 w-4")}
              {tab.icon === "users" && Icons.users("h-4 w-4")}
              {tab.icon === "user-check" && Icons["user-check"]("h-4 w-4")}
              {tab.icon === "plug" && Icons.plug("h-4 w-4")}
              {tab.icon === "list" && Icons.list("h-4 w-4")}
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.label.substring(0, 3)}</span>
              {activeTab === tab.id && (
                <div className="absolute bottom-1 sm:bottom-1.5 left-1/2 -translate-x-1/2 h-0.5 w-6 sm:w-8 bg-white rounded-full" />
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="px-4 sm:px-6 md:px-8 py-4 sm:py-6">
        {activeTab === "general" && (
          <div className="rounded-2xl border border-[var(--admin-border)] bg-white overflow-hidden">
            <SettingsSections brandId={brandId} />
          </div>
        )}

        {activeTab === "workers" && (
          <div className="rounded-2xl border border-[var(--admin-border)] bg-white overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-[var(--admin-border)]">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600">
                  {Icons.users("w-4 h-4 text-white")}
                </div>
                <div>
                  <h2 className="text-sm sm:text-lg font-bold text-[var(--admin-text-primary)]">Workers & PINs</h2>
                  <p className="text-[10px] sm:text-xs text-[var(--admin-text-muted)]">Manage time tracking workers and PIN codes</p>
                </div>
              </div>
            </div>
            <div className="p-4 sm:p-6">
              <SettingsSections brandId={brandId} workersOnly />
            </div>
          </div>
        )}

        {activeTab === "tasks" && (
          <div className="rounded-2xl border border-[var(--admin-border)] bg-white overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-[var(--admin-border)]">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500">
                  {Icons.list("w-4 h-4 text-white")}
                </div>
                <div>
                  <h2 className="text-sm sm:text-lg font-bold text-[var(--admin-text-primary)]">Tasks</h2>
                  <p className="text-[10px] sm:text-xs text-[var(--admin-text-muted)]">Define tasks workers can clock into</p>
                </div>
              </div>
            </div>
            <div className="p-4 sm:p-6">
              <SettingsSections brandId={brandId} tasksOnly />
            </div>
          </div>
        )}

        {activeTab === "users" && (
          <div className="rounded-2xl border border-[var(--admin-border)] bg-white overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-[var(--admin-border)]">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--admin-text-primary)]">
                  {Icons["user-check"]("w-4 h-4 text-[var(--admin-bg)]")}
                </div>
                <div>
                  <h2 className="text-sm sm:text-lg font-bold text-[var(--admin-text-primary)]">Users & Permissions</h2>
                  <p className="text-[10px] sm:text-xs text-[var(--admin-text-muted)]">Manage team access and roles</p>
                </div>
              </div>
            </div>
            <div className="p-4 sm:p-6">
              <UsersPage
                initialUsers={users}
                brands={brands}
                currentUser={{
                  id: currentUser.id,
                  role: currentUser.role,
                  can_manage_users: currentUser.can_manage_users,
                }}
              />
            </div>
          </div>
        )}

        <div className="mt-6 p-4 rounded-xl border border-violet-100 bg-violet-50/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100">
                <svg className="w-4 h-4 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/>
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-stone-900">Advanced Settings</p>
                <p className="text-xs text-stone-500">AI, integrations, Square sync, shipping, and webhooks</p>
              </div>
            </div>
            <a
              href="/admin/advanced"
              className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-semibold hover:bg-violet-500 transition-colors"
            >
              Open Advanced →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}