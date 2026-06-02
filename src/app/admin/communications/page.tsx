import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/admin-permissions";
import { getCommunicationCampaigns } from "@/actions/communications/campaigns";
import { getCommunicationTemplates } from "@/actions/communications/templates";
import { getHarvestReachSegments } from "@/actions/harvest-reach/segments";
import { getCampaignAnalytics } from "@/actions/harvest-reach/campaigns";
import CommunicationsPage from "@/components/admin/CommunicationsPage";

export const metadata: Metadata = {
  title: "Harvest Reach - Communications Hub",
  description: "Manage email campaigns, templates, contacts, and marketing automation for your brand.",
};

export default async function CommunicationsRootPage() {
  const adminUser = await getAdminUser();
  if (!adminUser || !adminUser.can_manage_messages) {
    redirect("/admin/pickup");
  }

  const effectiveBrandId = adminUser!.brand_id ?? "64294306-5f42-463d-a5e8-2ad6c81a96de";

  const [campaignsResult, templatesResult, segmentsResult, analyticsResult] = await Promise.all([
    getCommunicationCampaigns(effectiveBrandId),
    getCommunicationTemplates(effectiveBrandId),
    getHarvestReachSegments(effectiveBrandId),
    getCampaignAnalytics(effectiveBrandId),
  ]);

  return (
    <CommunicationsPage
      campaigns={campaignsResult.success ? campaignsResult.campaigns : []}
      templates={templatesResult.success ? templatesResult.templates : []}
      brandId={effectiveBrandId}
      initialSegments={segmentsResult.success ? segmentsResult.segments : []}
      initialAnalytics={analyticsResult}
    />
  );
}