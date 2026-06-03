import type { Metadata, Viewport } from "next";
import LandingPageClient from "./LandingPageClient";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://routecommerce.com";

export const metadata: Metadata = {
  title: "Route Commerce — Fresh Produce Wholesale Platform",
  description: "The all-in-one platform for produce wholesale distribution. Manage orders, stops, routes, and customer communications. Built for farms, Co-ops, and distributors.",
  keywords: ["produce wholesale", "farm management", "route commerce", "agricultural platform", "order management", "stop scheduling", "B2B e-commerce", "fresh produce delivery"],
  authors: [{ name: "Route Commerce" }],
  creator: "Route Commerce",
  publisher: "Route Commerce",
  openGraph: {
    title: "Route Commerce — Fresh Produce Wholesale Platform",
    description: "The all-in-one platform for produce wholesale distribution. Manage orders, stops, routes, and customer communications.",
    url: BASE_URL,
    siteName: "Route Commerce",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/og-default.jpg",
        width: 1200,
        height: 630,
        alt: "Route Commerce Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Route Commerce — Fresh Produce Wholesale Platform",
    description: "The all-in-one platform for produce wholesale distribution.",
    site: "@RouteCommerce",
    creator: "@RouteCommerce",
    images: ["/og-default.jpg"],
  },
  alternates: {
    canonical: BASE_URL,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function LandingPage() {
  return <LandingPageClient />;
}