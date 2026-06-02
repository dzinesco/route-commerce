import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/admin-permissions";
import { getAIProviderSettings } from "@/actions/integrations/ai-providers";
import AIClient from "./AIClient";
import AdminAccessDenied from "@/components/admin/AdminAccessDenied";

export default async function AISettingsPage() {
  const adminUser = await getAdminUser();
  if (!adminUser) return <AdminAccessDenied />;

  const brandId = adminUser.brand_id ?? "";

  const settings = await getAIProviderSettings(brandId);
  const isConnected = !!settings.apiKey;

  const brandName = "Brand"; // Note: resolved from adminUser.brand_id on the server; hardcoded fallback for settings UI

  return (
    <AIClient
      isConnected={isConnected}
      brandId={brandId}
      brandName={brandName}
      provider={settings.provider}
      model={settings.model}
      customEndpoint={settings.customEndpoint}
    />
  );
}