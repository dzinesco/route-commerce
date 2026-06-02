import type { Metadata } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://routecommerce.com";

// BreadcrumbList schema for SEO
const indianRiverBreadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": BASE_URL,
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "Indian River Direct",
      "item": `${BASE_URL}/indian-river-direct`,
    },
  ],
};

export const metadata: Metadata = {
  title: {
    default: "Indian River Direct | Peach & Citrus Truckload",
    template: "%s | Indian River Direct",
  },
  description: "Fresh peaches and citrus from our Florida groves to truckload sales in your neighborhood. Family-owned since 1985. Pre-order now for 2026 season.",
  keywords: ["peaches", "citrus", "Florida produce", "truckload sales", "fresh fruit", "Indian River", "wholesale peaches"],
  openGraph: {
    title: "Indian River Direct | Fresh Peaches & Citrus",
    description: "Fresh peaches and citrus from our Florida groves to truckload sales in your neighborhood. Family-owned since 1985.",
    url: `${BASE_URL}/indian-river-direct`,
    siteName: "Indian River Direct",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/og-indian-river.jpg",
        width: 1200,
        height: 630,
        alt: "Indian River Direct - Fresh Peaches & Citrus",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Indian River Direct | Peach & Citrus Truckload",
    description: "Fresh peaches and citrus from our Florida groves. Family-owned since 1985. Pre-order for 2026 season.",
    site: "@IndianRiverDirect",
    images: ["/og-indian-river.jpg"],
  },
  alternates: {
    canonical: `${BASE_URL}/indian-river-direct`,
  },
  robots: {
    index: true,
    follow: true,
  },
  other: {
    "application/ld+json": JSON.stringify(indianRiverBreadcrumbSchema),
  },
};

export default function IndianRiverLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen relative">
      {/* Glass morphism gradient background */}
      <div className="fixed inset-0 bg-gradient-to-br from-blue-100/40 via-white/60 to-blue-50/30" />
      
      {/* Decorative glass orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-blue-200/30 to-transparent rounded-full blur-3xl" />
        <div className="absolute top-1/3 -left-20 w-72 h-72 bg-gradient-to-br from-blue-100/25 to-transparent rounded-full blur-2xl" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-gradient-to-br from-blue-50/40 to-transparent rounded-full blur-3xl" />
      </div>

      {/* Content wrapper */}
      <div className="relative">{children}</div>
    </div>
  );
}