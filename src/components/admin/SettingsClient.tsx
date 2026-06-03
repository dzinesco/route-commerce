"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect } from "react";
import SettingsSections from "@/components/admin/SettingsSections";
import UsersPage from "@/components/admin/UsersPage";
import BrandSettingsForm from "@/components/admin/BrandSettingsForm";
import PaymentSettingsForm from "@/components/admin/PaymentSettingsForm";
import { PageHeader, AdminButton } from "@/components/admin/design-system";
import type { PaymentProvider } from "@/actions/payments";

type Tab = "general" | "brand" | "workers" | "tasks" | "users";

const TABS: { id: Tab; label: string; icon: string; hash: string }[] = [
  { id: "general", label: "General", icon: "settings", hash: "general" },
  { id: "brand", label: "Brand", icon: "brand", hash: "brand" },
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
  brand: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.592 9.592c1.106.105 1.35.374 1.591.659l4.317 4.317c.221.241.375.574.375.896v.318c0 .621-.504 1.125-1.125 1.125H5.25A2.25 2.25 0 013 16.5v-4.318c0-.597-.237-1.17-.659-1.591l-9.592-9.592A2.25 2.25 0 012.25 5.25m5.318 4.5v4.318l3.591 3.591M5.25 7.5a2.25 2.25 0 012.25-2.25h4.318m0 0L9 10.5m5.25-2.25v4.318m0 0L14.25 12m5.25-2.25H9.75" />
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

// Brand Selector Component
function BrandSelector({
  brands,
  selectedBrandId,
  onSelect,
}: {
  brands: Brand[];
  selectedBrandId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-[var(--admin-text-muted)]">Select which brand&apos;s settings to manage:</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {brands.map((brand) => (
          <button
            key={brand.id}
            onClick={() => onSelect(brand.id)}
            className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all ${
              selectedBrandId === brand.id
                ? "border-[var(--admin-accent)] bg-[var(--admin-accent-light)] ring-2 ring-[var(--admin-accent)]"
                : "border-[var(--admin-border)] hover:border-[var(--admin-accent)] hover:bg-stone-50"
            }`}
          >
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg text-white font-bold ${
              selectedBrandId === brand.id ? "bg-[var(--admin-accent)]" : "bg-stone-400"
            }`}>
              {brand.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[var(--admin-text-primary)] truncate">{brand.name}</p>
              {selectedBrandId === brand.id && (
                <p className="text-xs text-[var(--admin-accent)]">Currently viewing</p>
              )}
            </div>
            {selectedBrandId === brand.id && (
              <svg className="w-5 h-5 text-[var(--admin-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

type Props = {
  brandId: string;
  users: import("@/actions/admin/users").AdminUserRow[];
  brands: Brand[];
  paymentSettings?: {
    provider?: PaymentProvider | null;
    stripe_publishable_key?: string | null;
    stripe_secret_key?: string | null;
    square_access_token?: string | null;
    square_location_id?: string | null;
    square_sync_enabled?: boolean;
    square_inventory_mode?: "none" | "rc_to_square" | "square_to_rc" | "bidirectional";
    square_last_sync_at?: string | null;
    square_last_sync_error?: string | null;
  } | null;
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
  paymentSettings,
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
    <main className="min-h-screen bg-[var(--admin-bg)]">
      {/* Page Header */}
      <div className="px-4 sm:px-6 md:px-8 pt-4 sm:pt-6">
        <PageHeader
          title="Settings"
          subtitle="Manage your brand, workers, and integrations"
          icon={
            <svg className="h-5 w-5 sm:h-6 sm:w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          }
          actions={
            <AdminButton
              variant="secondary"
              size="sm"
              onClick={() => window.location.href = "/admin/advanced"}
            >
              Advanced Settings
            </AdminButton>
          }
        />

        {/* Tab navigation */}
        <nav className="flex items-center gap-1 p-1.5 rounded-xl bg-white border border-[var(--admin-border)] overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold transition-all duration-150 whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-[var(--admin-accent)] text-white shadow-sm"
                  : "text-[var(--admin-text-muted)] hover:text-[var(--admin-text-secondary)] hover:bg-stone-50"
              }`}
            >
              {/* icons */}
              <span>{tab.label}</span>
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

        {activeTab === "brand" && (
          <div className="space-y-6">
            {currentUser.role === "platform_admin" && brands.length > 0 && (
              <div className="rounded-2xl border border-[var(--admin-border)] bg-white overflow-hidden">
                <div className="p-4 sm:p-6 border-b border-[var(--admin-border)]">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500">
                      {Icons.brand("w-4 h-4 text-white")}
                    </div>
                    <div>
                      <h2 className="text-sm sm:text-lg font-bold text-[var(--admin-text-primary)]">Select Brand</h2>
                      <p className="text-[10px] sm:text-xs text-[var(--admin-text-muted)]">Choose a brand to view and edit its settings</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 sm:p-6">
                  <BrandSelector
                    brands={brands}
                    selectedBrandId={brandId}
                    onSelect={(id) => {
                      window.location.href = `/admin/settings?brand=${id}#brand`;
                    }}
                  />
                </div>
              </div>
            )}

            {/* Selected Brand Settings */}
            <div className="rounded-2xl border border-[var(--admin-border)] bg-white overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-[var(--admin-border)]">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500">
                    {Icons.brand("w-4 h-4 text-white")}
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-lg font-bold text-[var(--admin-text-primary)]">Brand Settings</h2>
                    <p className="text-[10px] sm:text-xs text-[var(--admin-text-muted)]">Company information, logos, and default signatures</p>
                  </div>
                </div>
              </div>
              <div className="p-4 sm:p-6">
                <BrandSettingsForm
                  settings={null}
                  brandId={brandId}
                  brandName=""
                  brands={brands}
                  isPlatformAdmin={currentUser.role === "platform_admin"}
                />
              </div>
            </div>

            {/* Payment Settings */}
            <div className="rounded-2xl border border-[var(--admin-border)] bg-white overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-[var(--admin-border)]">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--admin-accent)]">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 0h3m-3.75 0h3m-3.75 0h3m-3.75 0h3m3.75 0h3m-3.75 0h3m-3.75 0h3m-3.75 0h3m3.75 0h3m-3.75 0h3m-3.75 0h3m-3.75 0h3" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-lg font-bold text-[var(--admin-text-primary)]">Payment Settings</h2>
                    <p className="text-[10px] sm:text-xs text-[var(--admin-text-muted)]">Configure your payment provider for checkout processing</p>
                  </div>
                </div>
              </div>
              <div className="p-4 sm:p-6">
                <PaymentSettingsForm
                  settings={paymentSettings ?? null}
                  brandId={brandId}
                  brands={brands}
                  isPlatformAdmin={currentUser.role === "platform_admin"}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === "workers" && (
          <div className="rounded-2xl border border-[var(--admin-border)] bg-white overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-[var(--admin-border)]">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--admin-accent)]">
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

        <div className="mt-6 p-4 rounded-xl border border-[var(--admin-accent)] bg-[var(--admin-accent-light)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--admin-accent)]">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/>
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--admin-accent-text)]">Advanced Settings</p>
                <p className="text-xs text-[var(--admin-text-muted)]">AI, integrations, Square sync, shipping, and webhooks</p>
              </div>
            </div>
            <AdminButton
              variant="secondary"
              size="sm"
              onClick={() => window.location.href = "/admin/advanced"}
            >
              Open Advanced →
            </AdminButton>
          </div>
        </div>
      </div>
    </main>
  );
}