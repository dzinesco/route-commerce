import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Message Logs - Harvest Reach",
  description: "View delivery logs and engagement tracking for sent messages.",
};

export default function LogsPage() {
  redirect("/admin/communications?tab=logs");
}