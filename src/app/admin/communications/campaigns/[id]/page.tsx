import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/admin-permissions";
import { getCommunicationCampaigns, getCampaignById } from "@/actions/communications/campaigns";
import { getCommunicationTemplates } from "@/actions/communications/templates";
import { getHarvestReachSegments } from "@/actions/harvest-reach/segments";
import CommunicationsPage from "@/components/admin/CommunicationsPage";

export default async function CampaignEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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

  const campaign = isNew ? undefined : id ? await getCampaignById(id) : undefined;

  return (
    <CommunicationsPage
      campaigns={campaignsResult.success ? campaignsResult.campaigns : []}
      templates={templatesResult.success ? templatesResult.templates : []}
      brandId={effectiveBrandId}
      initialSegments={segmentsResult.success ? segmentsResult.segments : []}
      editCampaign={campaign}
      editMode={isNew ? "new" : "edit"}
    />
  );
}