import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/admin-permissions";
import { getCommunicationCampaigns, getCampaignById } from "@/actions/communications/campaigns";
import { getCommunicationTemplates } from "@/actions/communications/templates";
import CommunicationsPage from "@/components/admin/CommunicationsPage";

export default async function CampaignEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const adminUser = await getAdminUser();
  if (!adminUser) redirect("/admin");
  if (!adminUser.can_manage_messages) redirect("/admin/pickup");

  const { id } = await params;
  const isNew = id === "new";
  const effectiveBrandId = adminUser.brand_id ?? "64294306-5f42-463d-a5e8-2ad6c81a96de";

  const [campaignsResult, templatesResult] = await Promise.all([
    getCommunicationCampaigns(effectiveBrandId),
    getCommunicationTemplates(effectiveBrandId),
  ]);

  const campaign = isNew ? undefined : id ? await getCampaignById(id) : undefined;

  return (
    <main className="min-h-screen bg-stone-100 px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-stone-950">Harvest Reach</h1>
        </div>

        <CommunicationsPage
          campaigns={campaignsResult.success ? campaignsResult.campaigns : []}
          templates={templatesResult.success ? templatesResult.templates : []}
          activeTab="campaigns"
          brandId={adminUser.brand_id ?? "64294306-5f42-463d-a5e8-2ad6c81a96de"}
          editCampaign={campaign}
          editMode={isNew ? "new" : "edit"}
        />
      </div>
    </main>
  );
}