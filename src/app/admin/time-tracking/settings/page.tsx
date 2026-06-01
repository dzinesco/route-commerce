import { redirect } from "next/navigation";

export default function TimeTrackingSettingsRedirect() {
  redirect("/admin/settings#workers");
}
