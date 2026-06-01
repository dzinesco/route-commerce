import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/admin-permissions";
import { getHarvestReachSegments } from "@/actions/harvest-reach/segments";
import CommunicationsPage from "@/components/admin/CommunicationsPage";

export default async function SegmentsPage() {
  const adminUser = await getAdminUser();
  if (!adminUser || !adminUser.can_manage_messages) redirect("/admin/pickup");

  const effectiveBrandId = adminUser.brand_id ?? "64294306-5f42-463d-a5e8-2ad6c81a96de";
  const segmentsResult = await getHarvestReachSegments(effectiveBrandId);
  const segments = segmentsResult.success ? segmentsResult.segments : [];

  return (
    <div className="min-h-screen bg-stone-100 px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <CommunicationsPage
          campaigns={[]}
          templates={[]}
          activeTab="segments"
          brandId={effectiveBrandId}
          initialSegments={segments}
        />
      </div>
    </div>
  );
}