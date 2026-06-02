import type { Metadata } from "next";
import { getCurrentAdminUser } from "@/actions/admin-user";
import AnalyticsDashboard from "@/components/admin/AnalyticsDashboard";

export const metadata: Metadata = {
  title: "Analytics — Route Commerce Admin",
  description: "Track your business performance and growth with real-time analytics.",
};

export default async function AnalyticsPage() {
  const adminUser = await getCurrentAdminUser();
  const effectiveBrandId = adminUser?.brand_id ?? undefined;

  return (
    <div className="p-6">
      <AnalyticsDashboard brandId={effectiveBrandId} />
    </div>
  );
}