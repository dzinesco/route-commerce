import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://routecommerce.com";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a0a0a",
};

export const metadata: Metadata = {
  title: {
    default: "Route Commerce | Fresh Produce Wholesale Platform",
    template: "%s | Route Commerce",
  },
  description: "Multi-tenant B2B e-commerce platform for fresh produce wholesale distribution. Brands sell to customers who pick up at scheduled stops or receive shipments.",
  keywords: ["wholesale produce", "farm fresh", "B2B e-commerce", "produce distribution", "pickup stops", "fresh produce"],
  metadataBase: new URL(BASE_URL),
  openGraph: {
    title: "Route Commerce | Fresh Produce Wholesale Platform",
    description: "Multi-tenant B2B e-commerce platform for fresh produce wholesale distribution.",
    url: BASE_URL,
    siteName: "Route Commerce",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Route Commerce | Fresh Produce Wholesale Platform",
    description: "Multi-tenant B2B e-commerce platform for fresh produce wholesale distribution.",
    site: "@RouteCommerce",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}