import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/admin-permissions";
import { getAIProviderSettings } from "@/actions/integrations/ai-providers";
import AIClient from "./AIClient";

export default async function AISettingsPage() {
  const adminUser = await getAdminUser();
  if (!adminUser) redirect("/login");

  const brandId = adminUser.brand_id ?? "64294306-5f42-463d-a5e8-2ad6c81a96de";

  const settings = await getAIProviderSettings(brandId);
  const isConnected = !!settings.apiKey;

  const brandName = "Brand"; // Note: resolved from adminUser.brand_id on the server; hardcoded fallback for settings UI

  return (
    <AIClient
      isConnected={isConnected}
      brandId={brandId}
      brandName={brandName}
    />
  );
}