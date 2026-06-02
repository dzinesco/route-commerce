import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Templates - Harvest Reach",
  description: "Manage email templates for your marketing campaigns.",
};

export default function TemplatesPage() {
  redirect("/admin/communications?tab=templates");
}