import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/admin-permissions";
import { getCommunicationTemplates, getTemplateById } from "@/actions/communications/templates";
import { getCommunicationCampaigns } from "@/actions/communications/campaigns";
import { getHarvestReachSegments } from "@/actions/harvest-reach/segments";
import CommunicationsPage from "@/components/admin/CommunicationsPage";

export const metadata: Metadata = {
  title: "Edit Template - Harvest Reach",
  description: "Edit an email template for your marketing campaigns.",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TemplateEditPage({ params }: PageProps) {
  const adminUser = await getAdminUser();
  if (!adminUser || !adminUser.can_manage_messages) {
    redirect("/admin/pickup");
  }

  const { id } = await params;
  const isNew = id === "new";
  const effectiveBrandId = adminUser.brand_id ?? "64294306-5f42-463d-a5e8-2ad6c81a96de";

  const [campaignsResult, templatesResult, segmentsResult] = await Promise.all([
    getCommunicationCampaigns(effectiveBrandId),
    getCommunicationTemplates(effectiveBrandId),
    getHarvestReachSegments(effectiveBrandId),
  ]);

  const template = isNew ? undefined : id ? await getTemplateById(id) : undefined;

  return (
    <CommunicationsPage
      campaigns={campaignsResult.success ? campaignsResult.campaigns : []}
      templates={templatesResult.success ? templatesResult.templates : []}
      brandId={effectiveBrandId}
      initialSegments={segmentsResult.success ? segmentsResult.segments : []}
      editTemplate={template}
      editMode={isNew ? "new" : "edit"}
    />
  );
}