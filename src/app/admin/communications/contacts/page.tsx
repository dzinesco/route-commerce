import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Contacts - Harvest Reach",
  description: "Manage your email marketing contacts and subscriber list.",
};

export default function ContactsPage() {
  redirect("/admin/communications?tab=contacts");
}