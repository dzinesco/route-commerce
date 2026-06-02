import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Segments - Harvest Reach",
  description: "Create and manage audience segments for targeted campaigns.",
};

export default function SegmentsPage() {
  redirect("/admin/communications?tab=segments");
}