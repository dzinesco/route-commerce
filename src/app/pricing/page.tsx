import type { Metadata } from "next";
import PricingClientPage from "./PricingClientPage";

export const metadata: Metadata = {
  title: "Pricing — Route Commerce",
  description: "Simple, transparent pricing for produce wholesale operations. Starter at $49/mo, Farm at $149/mo, Enterprise at $399/mo. Built for farms, Co-ops, and produce distributors.",
};

export default function PricingPage() {
  return <PricingClientPage />;
}