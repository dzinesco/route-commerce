import type { Metadata } from "next";
import ContactClientPage from "./ContactClientPage";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://routecommerce.com";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Get in touch with Tuxedo Corn. Questions about corn orders, pickup stops, or wholesale accounts — we're happy to help.",
  keywords: ["Tuxedo Corn contact", "Olathe Sweet contact", "corn wholesale inquiry", "order questions"],
  openGraph: {
    title: "Contact Us — Tuxedo Corn",
    description: "Get in touch with Tuxedo Corn. Questions about corn orders, pickup stops, or wholesale accounts.",
    url: `${BASE_URL}/tuxedo/contact`,
    siteName: "Tuxedo Corn",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/og-tuxedo.jpg",
        width: 1200,
        height: 630,
        alt: "Contact Tuxedo Corn",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact Us — Tuxedo Corn",
    description: "Get in touch with Tuxedo Corn. Questions about corn orders, pickup stops, or wholesale accounts.",
    site: "@TuxedoCorn",
    images: ["/og-tuxedo.jpg"],
  },
  alternates: {
    canonical: `${BASE_URL}/tuxedo/contact`,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function TuxedoContactLayout({ children }: { children: React.ReactNode }) {
  return <ContactClientPage />;
}