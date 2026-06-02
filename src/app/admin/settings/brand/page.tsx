import { redirect } from "next/navigation";

export default function BrandSettingsRedirect() {
  redirect("/admin/settings#brand");
}
