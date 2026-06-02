import type { Metadata } from "next";
import PricingClientPage from "./PricingClientPage";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://routecommerce.com";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Simple, transparent pricing for produce wholesale operations. Starter at $49/mo, Farm at $149/mo, Enterprise at $399/mo. Built for farms, Co-ops, and produce distributors.",
  keywords: ["produce wholesale pricing", "farm software pricing", "agriculture platform", "route commerce plans", "stops scheduling pricing"],
  openGraph: {
    title: "Pricing — Route Commerce",
    description: "Simple, transparent pricing for produce wholesale operations. Starter at $49/mo, Farm at $149/mo, Enterprise at $399/mo.",
    url: `${BASE_URL}/pricing`,
    siteName: "Route Commerce",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/og-default.jpg",
        width: 1200,
        height: 630,
        alt: "Route Commerce Pricing",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Pricing — Route Commerce",
    description: "Simple, transparent pricing for produce wholesale operations. Starter at $49/mo, Farm at $149/mo, Enterprise at $399/mo.",
    site: "@RouteCommerce",
    images: ["/og-default.jpg"],
  },
  alternates: {
    canonical: `${BASE_URL}/pricing`,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function PricingPage() {
  return <PricingClientPage />;
}