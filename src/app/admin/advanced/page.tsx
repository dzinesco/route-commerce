import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/admin-permissions";
import { getBrands } from "@/actions/admin/users";
import { getStripeConnectStatus } from "@/actions/stripe-connect";
import AdvancedSettingsClient from "@/components/admin/AdvancedSettingsClient";

export const metadata = {
  title: "Advanced Settings - Route Commerce Admin",
  description: "Developer settings, API integrations, and advanced configurations",
};

export default async function AdvancedSettingsPage() {
  const adminUser = await getAdminUser();
  if (!adminUser) redirect("/login");

  // Only admins can access advanced settings
  if (!adminUser.can_manage_settings && adminUser.role !== "platform_admin") {
    redirect("/admin");
  }

  const brandId = adminUser.brand_id ?? "";
  const { brands } = await getBrands();
  
  // Get Stripe Connect status
  const stripeConnect = brandId ? await getStripeConnectStatus(brandId) : null;

  return (
    <AdvancedSettingsClient
      brandId={brandId}
      brands={brands}
      stripeConnect={stripeConnect}
    />
  );
}