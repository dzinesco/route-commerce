import type { Metadata, Viewport } from "next";
import ContactClientPage from "./ContactClientPage";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://routecommerce.com";

export const metadata: Metadata = {
  title: "Contact Us — Route Commerce",
  description: "Get in touch with Route Commerce. Questions about produce, wholesale accounts, or becoming a partner? We'd love to hear from you.",
  keywords: ["Route Commerce contact", "produce wholesale inquiry", "partnership questions", "agriculture platform support", "contact form", "support"],
  authors: [{ name: "Route Commerce" }],
  creator: "Route Commerce",
  publisher: "Route Commerce",
  openGraph: {
    title: "Contact Us — Route Commerce",
    description: "Get in touch with Route Commerce. Questions about produce, wholesale accounts, or becoming a partner.",
    url: `${BASE_URL}/contact`,
    siteName: "Route Commerce",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/og-default.jpg",
        width: 1200,
        height: 630,
        alt: "Contact Route Commerce",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact Us — Route Commerce",
    description: "Get in touch with Route Commerce.",
    site: "@RouteCommerce",
    creator: "@RouteCommerce",
    images: ["/og-default.jpg"],
  },
  alternates: {
    canonical: `${BASE_URL}/contact`,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function ContactPage() {
  return <ContactClientPage />;
}