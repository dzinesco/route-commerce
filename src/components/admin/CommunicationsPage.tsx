"use client";

import { useState } from "react";
import CampaignListPanel, { CampaignEditPanel } from "./CampaignListPanel";
import { TemplateListPanel, TemplateEditForm } from "./TemplateEditForm";
import MessageLogPanel from "./MessageLogPanel";
import ContactListPanel from "./ContactListPanel";
import ContactImportForm from "./ContactImportForm";
import SegmentBuilderPage from "@/components/admin/HarvestReach/SegmentBuilderPage";
import AnalyticsDashboard from "@/components/admin/HarvestReach/AnalyticsDashboard";
import CampaignComposerPage from "@/components/admin/HarvestReach/CampaignComposerPage";
import { PageHeader, AdminFilterTabs } from "@/components/admin/design-system";
import type { Campaign } from "@/actions/communications/campaigns";
import type { Template } from "@/actions/communications/templates";
import type { Contact } from "@/actions/communications/contacts";
import type { Segment } from "@/actions/harvest-reach/segments";
import type { CampaignAnalytics } from "@/actions/harvest-reach/campaigns";

type Tab = "campaigns" | "compose" | "templates" | "contacts" | "segments" | "logs" | "analytics";

const ComposeIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
  </svg>
);

const MailIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2"/>
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
  </svg>
);

const FileTextIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
    <polyline points="10 9 9 9 8 9"/>
  </svg>
);

const UsersIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

const LayersIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 2 7 12 12 22 7 12 2"/>
    <polyline points="2 17 12 22 22 17"/>
    <polyline points="2 12 12 17 22 12"/>
  </svg>
);

const ListIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6"/>
    <line x1="8" y1="12" x2="21" y2="12"/>
    <line x1="8" y1="18" x2="21" y2="18"/>
    <line x1="3" y1="6" x2="3.01" y2="6"/>
    <line x1="3" y1="12" x2="3.01" y2="12"/>
    <line x1="3" y1="18" x2="3.01" y2="18"/>
  </svg>
);

const ChartIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/>
    <line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="14"/>
  </svg>
);

export default function CommunicationsPage({
  campaigns,
  templates,
  brandId,
  editCampaign,
  editMode,
  editTemplate,
  initialContacts = [],
  initialContactTotal = 0,
  initialSegments = [],
  initialAnalytics = [],
  editCampaignId,
}: {
  campaigns: Campaign[];
  templates: Template[];
  brandId: string;
  editCampaign?: Campaign | null;
  editMode?: "edit" | "new";
  editTemplate?: Template | null;
  initialContacts?: Contact[];
  initialContactTotal?: number;
  initialSegments?: Segment[];
  initialAnalytics?: CampaignAnalytics[];
  editCampaignId?: string;
}) {
  const [currentTab, setCurrentTab] = useState<Tab>("campaigns");
  const [isComposing, setIsComposing] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--admin-bg)]">
      {/* Page Header */}
      <div className="px-4 sm:px-6 md:px-8 pt-4 sm:pt-6">
        <PageHeader
          title="Harvest Reach"
          subtitle="Email campaigns, templates, and contacts"
          icon={<MailIcon />}
        />

        {/* Tab navigation */}
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 pb-2">
          <AdminFilterTabs
            activeTab={currentTab}
            onTabChange={(tab) => {
              setCurrentTab(tab as Tab);
              setIsComposing(false);
            }}
            tabs={[
              { value: "campaigns", label: "Campaigns", icon: <MailIcon /> },
              { value: "compose", label: "Compose", icon: <ComposeIcon /> },
              { value: "templates", label: "Templates", icon: <FileTextIcon /> },
              { value: "contacts", label: "Contacts", icon: <UsersIcon /> },
              { value: "segments", label: "Segments", icon: <LayersIcon /> },
              { value: "logs", label: "Logs", icon: <ListIcon /> },
              { value: "analytics", label: "Analytics", icon: <ChartIcon /> },
            ]}
            size="md"
          />
        </div>
      </div>

      {/* Content */}
      <div className="px-4 sm:px-6 md:px-8 py-4 sm:py-6">
        {/* Campaigns Tab */}
        {currentTab === "campaigns" && !isComposing && (
          editCampaign !== undefined || editMode === "new" ? (
            <CampaignEditPanel
              campaign={editCampaign ?? undefined}
              templates={templates}
              mode={editMode ?? "edit"}
              brandId={brandId}
            />
          ) : (
            <div className="rounded-2xl border border-[var(--admin-border)] bg-white overflow-hidden">
              <CampaignListPanel initialCampaigns={campaigns} brandId={brandId} />
            </div>
          )
        )}

        {/* Templates Tab */}
        {currentTab === "templates" && !isComposing && (
          editTemplate !== undefined || editMode === "new" ? (
            <div className="rounded-2xl border border-[var(--admin-border)] bg-white p-4 sm:p-6">
              <TemplateEditForm
                template={editTemplate ?? undefined}
                mode={editMode ?? "edit"}
                brandId={brandId}
              />
            </div>
          ) : (
            <div className="rounded-2xl border border-[var(--admin-border)] bg-white overflow-hidden">
              <TemplateListPanel templates={templates} brandId={brandId} />
            </div>
          )
        )}

        {/* Contacts Tab */}
        {currentTab === "contacts" && !isComposing && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-[var(--admin-border)] bg-white overflow-hidden">
              <ContactListPanel initialContacts={initialContacts} initialTotal={initialContactTotal} brandId={brandId} />
            </div>
            <div className="rounded-2xl border border-[var(--admin-border)] bg-white p-4 sm:p-6">
              <ContactImportForm brandId={brandId} />
            </div>
          </div>
        )}

        {/* Segments Tab */}
        {currentTab === "segments" && !isComposing && (
          <div className="rounded-2xl border border-[var(--admin-border)] bg-white overflow-hidden">
            <SegmentBuilderPage brandId={brandId} initialSegments={initialSegments} />
          </div>
        )}

        {/* Logs Tab */}
        {currentTab === "logs" && !isComposing && (
          <div className="rounded-2xl border border-[var(--admin-border)] bg-white overflow-hidden">
            <MessageLogPanel brandId={brandId} />
          </div>
        )}

        {/* Analytics Tab */}
        {currentTab === "analytics" && !isComposing && (
          <div className="rounded-2xl border border-[var(--admin-border)] bg-white overflow-hidden">
            <AnalyticsDashboard analytics={initialAnalytics} />
          </div>
        )}

        {/* Compose Tab */}
        {currentTab === "compose" && (
          <div className="rounded-2xl border border-[var(--admin-border)] bg-white">
            <CampaignComposerPage
              brandId={brandId}
              campaigns={campaigns}
              templates={templates}
              segments={initialSegments}
            />
          </div>
        )}

        {/* Legacy Compose Mode (from edit mode) */}
        {(isComposing || editCampaignId) && currentTab === "campaigns" && (
          <div className="rounded-2xl border border-[var(--admin-border)] bg-white">
            <CampaignComposerPage
              brandId={brandId}
              campaigns={campaigns}
              templates={templates}
              segments={initialSegments}
              editCampaignId={editCampaignId}
            />
          </div>
        )}
      </div>
    </div>
  );
}