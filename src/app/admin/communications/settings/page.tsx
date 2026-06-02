import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/admin-permissions";
import { getCommunicationSettings } from "@/actions/communications/settings";
import CommunicationSettingsForm from "@/components/admin/CommunicationSettingsForm";

export const metadata: Metadata = {
  title: "Settings - Harvest Reach",
  description: "Configure email and SMS integration settings for Harvest Reach.",
};

export default async function SettingsPage() {
  const adminUser = await getAdminUser();
  if (!adminUser) redirect("/admin");
  if (!adminUser.can_manage_messages) redirect("/admin/pickup");

  const brandId = adminUser.brand_id ?? "64294306-5f42-463d-a5e8-2ad6c81a96de";
  const settingsResult = await getCommunicationSettings(brandId);

  return (
    <div className="min-h-screen bg-[var(--admin-bg)]">
      <div className="px-4 sm:px-6 md:px-8 pt-4 sm:pt-6">
        {/* Back button */}
        <a
          href="/admin/communications"
          className="inline-flex items-center gap-2 text-sm text-stone-500 hover:text-stone-700 mb-4 transition-colors"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6"/>
          </svg>
          Back to Harvest Reach
        </a>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/20">
            <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-stone-900">Harvest Reach Settings</h1>
            <p className="text-sm text-stone-500">Configure email and SMS integration</p>
          </div>
        </div>

        {/* Settings Form */}
        <div className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-6 shadow-sm">
          <CommunicationSettingsForm settings={settingsResult} brandId={brandId} />
        </div>
      </div>
    </div>
  );
}