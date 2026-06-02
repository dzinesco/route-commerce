import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Analytics - Harvest Reach",
  description: "Track campaign performance and email engagement metrics.",
};

export default function AnalyticsPage() {
  redirect("/admin/communications?tab=analytics");
}