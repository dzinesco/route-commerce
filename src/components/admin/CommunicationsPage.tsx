"use client";

import CommunicationsNav from "./CommunicationsNav";
import CampaignListPanel, { CampaignEditPanel } from "./CampaignListPanel";
import { TemplateListPanel, TemplateEditForm } from "./TemplateEditForm";
import MessageLogPanel from "./MessageLogPanel";
import CommunicationSettingsForm from "./CommunicationSettingsForm";
import ContactListPanel from "./ContactListPanel";
import ContactImportForm from "./ContactImportForm";
import SegmentBuilderPage from "@/components/admin/HarvestReach/SegmentBuilderPage";
import AnalyticsDashboard from "@/components/admin/HarvestReach/AnalyticsDashboard";
import CampaignComposerPage from "@/components/admin/HarvestReach/CampaignComposerPage";
import type { Campaign } from "@/actions/communications/campaigns";
import type { Template } from "@/actions/communications/templates";
import type { MessageLogEntry } from "@/actions/communications/send";
import type { CommunicationSettings } from "@/actions/communications/settings";
import type { Contact } from "@/actions/communications/contacts";
import type { Segment } from "@/actions/harvest-reach/segments";
import type { CampaignAnalytics } from "@/actions/harvest-reach/campaigns";

export default function CommunicationsPage({
  campaigns,
  templates,
  activeTab,
  brandId,
  editCampaign,
  editMode,
  editTemplate,
  initialLogs = [],
  initialSettings = null,
  initialContacts = [],
  initialContactTotal = 0,
  initialSegments = [],
  initialAnalytics = [],
  editCampaignId,
}: {
  campaigns: Campaign[];
  templates: Template[];
  activeTab: "campaigns" | "templates" | "contacts" | "logs" | "settings" | "segments" | "analytics" | "compose";
  brandId: string;
  editCampaign?: Campaign | null;
  editMode?: "edit" | "new";
  editTemplate?: Template | null;
  initialLogs?: MessageLogEntry[];
  initialSettings?: CommunicationSettings | null;
  initialContacts?: Contact[];
  initialContactTotal?: number;
  initialSegments?: Segment[];
  initialAnalytics?: CampaignAnalytics[];
  editCampaignId?: string;
}) {
  return (
    <div>
      <CommunicationsNav activeTab={activeTab} />

      {activeTab === "campaigns" && (
        editCampaign !== undefined || editMode === "new" ? (
          <CampaignEditPanel
            campaign={editCampaign ?? undefined}
            templates={templates}
            mode={editMode ?? "edit"}
            brandId={brandId}
          />
        ) : (
          <CampaignListPanel initialCampaigns={campaigns} />
        )
      )}

      {activeTab === "templates" && (
        editTemplate !== undefined || editMode === "new" ? (
          <TemplateEditForm
            template={editTemplate ?? undefined}
            mode={editMode ?? "edit"}
            brandId={brandId}
          />
        ) : (
          <TemplateListPanel templates={templates} />
        )
      )}

      {activeTab === "contacts" && (
        <div className="space-y-6">
          <ContactListPanel initialContacts={initialContacts} initialTotal={initialContactTotal} brandId={brandId} />
          <ContactImportForm brandId={brandId} />
        </div>
      )}

      {activeTab === "logs" && (
        <MessageLogPanel initialLogs={initialLogs} />
      )}

      {activeTab === "settings" && (
        <CommunicationSettingsForm settings={initialSettings} brandId={brandId} />
      )}

      {activeTab === "segments" && (
        <SegmentBuilderPage brandId={brandId} initialSegments={initialSegments} />
      )}

      {activeTab === "analytics" && (
        <AnalyticsDashboard analytics={initialAnalytics} />
      )}

      {(activeTab === "compose" || (activeTab === "campaigns" && editCampaignId)) && (
        <CampaignComposerPage
          brandId={brandId}
          campaigns={campaigns}
          templates={templates}
          segments={initialSegments}
          editCampaignId={editCampaignId}
        />
      )}
    </div>
  );
}