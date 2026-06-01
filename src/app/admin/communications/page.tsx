import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/admin-permissions";
import { getCommunicationCampaigns } from "@/actions/communications/campaigns";
import { getCommunicationTemplates } from "@/actions/communications/templates";
import { getHarvestReachSegments } from "@/actions/harvest-reach/segments";
import { getCampaignAnalytics } from "@/actions/harvest-reach/campaigns";
import CommunicationsPage from "@/components/admin/CommunicationsPage";

export default async function CommunicationsRootPage() {
  const adminUser = await getAdminUser();
  if (!adminUser || !adminUser.can_manage_messages) redirect("/admin/pickup");

  const effectiveBrandId = adminUser.brand_id ?? "64294306-5f42-463d-a5e8-2ad6c81a96de";

  const [campaignsResult, templatesResult, segmentsResult, analyticsResult] = await Promise.all([
    getCommunicationCampaigns(effectiveBrandId),
    getCommunicationTemplates(effectiveBrandId),
    getHarvestReachSegments(effectiveBrandId),
    getCampaignAnalytics(effectiveBrandId),
  ]);

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-6xl">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-stone-500 mb-6">
          <a href="/admin" className="hover:text-stone-600 transition-colors">Admin</a>
          <span>/</span>
          <span className="text-stone-600">Harvest Reach</span>
        </nav>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-stone-950">Harvest Reach</h1>
          <p className="mt-2 text-stone-500">
            Manage email campaigns, templates, and message history.
          </p>
        </div>

        <CommunicationsPage
          campaigns={campaignsResult.success ? campaignsResult.campaigns : []}
          templates={templatesResult.success ? templatesResult.templates : []}
          activeTab="campaigns"
          brandId={effectiveBrandId}
          initialSegments={segmentsResult.success ? segmentsResult.segments : []}
          initialAnalytics={analyticsResult}
        />
      </div>
    </main>
  );
}