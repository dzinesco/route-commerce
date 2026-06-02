import { redirect } from "next/navigation";

export default function NewLotPage() {
  // New lot creation is now handled via modal in the Lots tab
  redirect("/admin/route-trace/lots");
}