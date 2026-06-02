"use client";

import { useState, useEffect } from "react";
import { PageHeader, AdminFilterTabs } from "@/components/admin/design-system";

type Tab = "general" | "addons" | "billing" | "integrations" | "ai" | "advanced";

const TABS: { id: Tab; label: string }[] = [
  { id: "general", label: "General" },
  { id: "addons", label: "Add-ons" },
  { id: "billing", label: "Billing" },
  { id: "integrations", label: "Integrations" },
  { id: "ai", label: "AI" },
  { id: "advanced", label: "Advanced" },
];

type Props = {
  brandId: string;
};

export default function SettingsClient({ brandId }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("general");

  // Handle URL hash for navigation
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    const matchingTab = TABS.find(t => t.id === hash);
    if (matchingTab) {
      setActiveTab(matchingTab.id);
    }
  }, []);

  // Content for each tab - links to full pages
  const renderContent = () => {
    switch (activeTab) {
      case "general":
        return (
          <div className="rounded-2xl border border-[var(--admin-border)] bg-white overflow-hidden">
            <div className="p-6 text-center">
              <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-xl bg-emerald-100 mb-4">
                <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09.542.56.94 1.11.94h2.64c.55 0 1.02-.398 1.11-.94l.213-1.999c.018-.158.04-.315.062-.472a.563.563 0 00-.122-.519l-.79-2.758A.562.562 0 0014.56 0H9.44a.563.563 0 00-.424.264l-.79 2.758a.563.563 0 00-.122.519c.022.157.044.314.062.472l.213 1.999zM12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-[var(--admin-text-primary)] mb-2">Workers, Tasks & Users</h3>
              <p className="text-sm text-[var(--admin-text-muted)] mb-4">Manage time tracking workers, tasks, and user permissions</p>
              <div className="space-y-3">
                <a href="/admin/settings#general" className="block w-full rounded-xl bg-[var(--admin-accent)] px-4 py-3 text-center text-sm font-semibold text-white hover:bg-[var(--admin-accent-hover)] transition-colors">
                  Open Settings
                </a>
              </div>
            </div>
          </div>
        );

      case "addons":
        return (
          <div className="rounded-2xl border border-[var(--admin-border)] bg-white overflow-hidden">
            <div className="p-6 text-center">
              <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-xl bg-emerald-100 mb-4">
                <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-[var(--admin-text-primary)] mb-2">Feature Add-ons</h3>
              <p className="text-sm text-[var(--admin-text-muted)] mb-4">Enable features to extend your platform capabilities</p>
              <a href="/admin/settings/apps" className="block w-full rounded-xl bg-[var(--admin-accent)] px-4 py-3 text-center text-sm font-semibold text-white hover:bg-[var(--admin-accent-hover)] transition-colors">
                Open Add-ons
              </a>
            </div>
          </div>
        );

      case "billing":
        return (
          <div className="rounded-2xl border border-[var(--admin-border)] bg-white overflow-hidden">
            <div className="p-6 text-center">
              <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-xl bg-emerald-100 mb-4">
                <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-[var(--admin-text-primary)] mb-2">Billing & Plans</h3>
              <p className="text-sm text-[var(--admin-text-muted)] mb-4">Manage your subscription, invoices, and usage</p>
              <a href="/admin/settings/billing" className="block w-full rounded-xl bg-[var(--admin-accent)] px-4 py-3 text-center text-sm font-semibold text-white hover:bg-[var(--admin-accent-hover)] transition-colors">
                Open Billing
              </a>
            </div>
          </div>
        );

      case "integrations":
        return (
          <div className="rounded-2xl border border-[var(--admin-border)] bg-white overflow-hidden">
            <div className="p-6 text-center">
              <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-xl bg-emerald-100 mb-4">
                <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-[var(--admin-text-primary)] mb-2">Integrations</h3>
              <p className="text-sm text-[var(--admin-text-muted)] mb-4">Configure Stripe, Square, shipping, and other integrations</p>
              <a href="/admin/settings/integrations" className="block w-full rounded-xl bg-[var(--admin-accent)] px-4 py-3 text-center text-sm font-semibold text-white hover:bg-[var(--admin-accent-hover)] transition-colors">
                Open Integrations
              </a>
            </div>
          </div>
        );

      case "ai":
        return (
          <div className="rounded-2xl border border-[var(--admin-border)] bg-white overflow-hidden">
            <div className="p-6 text-center">
              <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-xl bg-emerald-100 mb-4">
                <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-[var(--admin-text-primary)] mb-2">AI Settings</h3>
              <p className="text-sm text-[var(--admin-text-muted)] mb-4">Configure AI provider settings for intelligent automation</p>
              <a href="/admin/settings/ai" className="block w-full rounded-xl bg-[var(--admin-accent)] px-4 py-3 text-center text-sm font-semibold text-white hover:bg-[var(--admin-accent-hover)] transition-colors">
                Open AI Settings
              </a>
            </div>
          </div>
        );

      case "advanced":
        return (
          <div className="rounded-2xl border border-[var(--admin-border)] bg-white overflow-hidden">
            <div className="p-6 text-center">
              <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-xl bg-emerald-100 mb-4">
                <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-[var(--admin-text-primary)] mb-2">Advanced Settings</h3>
              <p className="text-sm text-[var(--admin-text-muted)] mb-4">Developer settings, APIs, webhooks, and integrations</p>
              <a href="/admin/advanced" className="block w-full rounded-xl bg-[var(--admin-accent)] px-4 py-3 text-center text-sm font-semibold text-white hover:bg-[var(--admin-accent-hover)] transition-colors">
                Open Advanced
              </a>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

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
        />

        {/* Tab navigation */}
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 pb-2">
          <AdminFilterTabs
            activeTab={activeTab}
            onTabChange={(tab) => setActiveTab(tab as Tab)}
            tabs={TABS.map(tab => ({ value: tab.id, label: tab.label }))}
            size="md"
          />
        </div>
      </div>

      {/* Content */}
      <div className="px-4 sm:px-6 md:px-8 py-4 sm:py-6">
        {renderContent()}
      </div>
    </main>
  );
}