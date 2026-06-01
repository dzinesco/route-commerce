import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/admin-permissions";
import { getPaymentSettings } from "@/actions/payments";
import { getSyncLog, type SyncLogEntry } from "@/actions/square-sync-ui";
import SquareSyncSettingsClient from "./SquareSyncSettingsClient";

export default async function SquareSyncSettingsPage() {
  const adminUser = await getAdminUser();
  if (!adminUser) redirect("/login");
  if (!adminUser.can_manage_orders) redirect("/admin/pickup");

  const brandId =
    adminUser.brand_id ?? "64294306-5f42-463d-a5e8-2ad6c81a96de";

  const [settingsResult, logResult] = await Promise.all([
    getPaymentSettings(brandId),
    getSyncLog(brandId),
  ]);

  const settings = settingsResult.success ? settingsResult.settings : null;
  const logs: SyncLogEntry[] = logResult.success ? logResult.logs : [];

  return (
    <SquareSyncSettingsClient
      settings={settings as any}
      logs={logs}
      brandId={brandId}
    />
  );
}