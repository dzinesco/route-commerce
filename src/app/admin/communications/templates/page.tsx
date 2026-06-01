import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/admin-permissions";
import { getCommunicationCampaigns } from "@/actions/communications/campaigns";
import { getCommunicationTemplates } from "@/actions/communications/templates";
import CommunicationsPage from "@/components/admin/CommunicationsPage";

export default async function TemplatesPage() {
  const adminUser = await getAdminUser();
  if (!adminUser) redirect("/admin");
  if (!adminUser.can_manage_messages) redirect("/admin/pickup");

  const [campaignsResult, templatesResult] = await Promise.all([
    getCommunicationCampaigns(adminUser.brand_id ?? undefined),
    getCommunicationTemplates(adminUser.brand_id ?? undefined),
  ]);

  return (
    <main className="min-h-screen bg-stone-100 px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-stone-950">Harvest Reach</h1>
          <p className="mt-2 text-stone-500">
            Manage email campaigns, templates, and message history.
          </p>
        </div>

        <CommunicationsPage
          campaigns={campaignsResult.success ? campaignsResult.campaigns : []}
          templates={templatesResult.success ? templatesResult.templates : []}
          activeTab="templates"
          brandId={adminUser.brand_id ?? "64294306-5f42-463d-a5e8-2ad6c81a96de"}
        />
      </div>
    </main>
  );
}