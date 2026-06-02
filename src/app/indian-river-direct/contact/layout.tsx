import type { Metadata } from "next";
import ContactClientPage from "./ContactClientPage";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://routecommerce.com";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Get in touch with Indian River Direct. Questions about peaches, citrus, your order, or becoming a wholesale partner — we'd love to hear from you.",
  keywords: ["Indian River Direct contact", "peach order questions", "citrus wholesale inquiry", "Florida produce contact"],
  openGraph: {
    title: "Contact Us — Indian River Direct",
    description: "Get in touch with Indian River Direct. Questions about peaches, citrus, your order, or becoming a wholesale partner.",
    url: `${BASE_URL}/indian-river-direct/contact`,
    siteName: "Indian River Direct",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/og-indian-river.jpg",
        width: 1200,
        height: 630,
        alt: "Contact Indian River Direct",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact Us — Indian River Direct",
    description: "Get in touch with Indian River Direct. Questions about peaches, citrus, your order, or becoming a wholesale partner.",
    site: "@IndianRiverDirect",
    images: ["/og-indian-river.jpg"],
  },
  alternates: {
    canonical: `${BASE_URL}/indian-river-direct/contact`,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function IndianRiverContactLayout({ children }: { children: React.ReactNode }) {
  return <ContactClientPage />;
}