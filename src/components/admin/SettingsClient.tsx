"use client";

import { useState } from "react";
import SettingsSections from "@/components/admin/SettingsSections";
import UsersPage from "@/components/admin/UsersPage";
import IntegrationsInner from "@/components/admin/IntegrationsInner";
import TimeTrackingSettingsClient from "@/components/admin/TimeTrackingSettingsClient";

type Tab = "general" | "users" | "integrations";

const TABS: { id: Tab; label: string }[] = [
  { id: "general", label: "General" },
  { id: "users", label: "Users" },
  { id: "integrations", label: "Integrations" },
];

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

  return (
    <div className="min-h-screen bg-stone-50 px-6 py-10">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-6">
          <nav className="flex items-center gap-2 text-xs text-stone-500 mb-3">
            <a href="/admin" className="hover:text-stone-600 transition-colors">Admin</a>
            <span>/</span>
            <span className="text-stone-600">Settings</span>
          </nav>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-stone-950 tracking-tight">Settings</h1>
              <p className="mt-1.5 text-sm text-stone-500">Manage your brand, workers, tasks, users, and integrations.</p>
            </div>
          </div>

          {/* Tab nav */}
          <div className="border-b border-stone-200 mt-6">
            <nav className="flex gap-1 -mb-px">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors rounded-t-lg ${
                    activeTab === tab.id
                      ? "border-emerald-500 text-emerald-700 bg-white"
                      : "border-transparent text-stone-500 hover:text-stone-700 hover:bg-stone-50"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab content */}
        {activeTab === "general" && (
          <div className="rounded-2xl bg-white border border-stone-200 shadow-sm p-6">
            <SettingsSections brandId={brandId} />
          </div>
        )}

        {activeTab === "users" && (
          <div className="rounded-2xl bg-white border border-stone-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-100 bg-stone-50">
              <h2 className="text-lg font-bold text-stone-950">Users & Permissions</h2>
            </div>
            <div className="p-6">
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

        {activeTab === "integrations" && (
          <div className="rounded-2xl bg-white border border-stone-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-100 bg-stone-50">
              <h2 className="text-lg font-bold text-stone-950">Integrations & Exports</h2>
            </div>
            <div className="p-6 space-y-6">
              <IntegrationsInner brandId={brandId} brands={brands} />

              {/* Time Tracking Exports */}
              <div className="border-t border-stone-200 pt-6">
                <h3 className="text-base font-semibold text-stone-800 mb-4">Time Tracking Exports</h3>
                <TimeTrackingSettingsClient brandId={brandId} />
              </div>

              <p className="text-xs text-stone-500">
                For more settings, see{" "}
                <a href="/admin/settings/ai" className="text-emerald-600 hover:text-emerald-700 underline underline-offset-2">AI Tools</a>
                {" "}and{" "}
                <a href="/admin/settings/shipping" className="text-emerald-600 hover:text-emerald-700 underline underline-offset-2">Shipping</a>
                .
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}