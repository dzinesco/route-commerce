import { redirect } from "next/navigation";

export default async function PaymentSettingsPage() {
  // Payment settings are now part of the Brand tab in Settings
  redirect("/admin/settings#brand");
}