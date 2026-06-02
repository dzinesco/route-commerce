import type { Metadata } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://routecommerce.com";

// BreadcrumbList schema for SEO
const tuxedoBreadcrumbSchema = {
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
      "name": "Tuxedo Corn",
      "item": `${BASE_URL}/tuxedo`,
    },
  ],
};

export const metadata: Metadata = {
  title: {
    default: "Tuxedo Corn | Fresh Produce Wholesale",
    template: "%s | Tuxedo Corn",
  },
  description: "Premium sweet corn and seasonal produce delivered fresh from the farm to pickup stops near you. Shop wholesale pricing on Tuxedo Corn.",
  keywords: ["sweet corn", "Olathe Sweet", "Colorado produce", "wholesale corn", "farm fresh", "pickup stops", "wholesale produce"],
  openGraph: {
    title: "Tuxedo Corn | Olathe Sweet Sweet Corn",
    description: "Premium sweet corn and seasonal produce, delivered fresh from our Colorado farm to pickup stops near you.",
    url: `${BASE_URL}/tuxedo`,
    siteName: "Tuxedo Corn",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/og-tuxedo.jpg",
        width: 1200,
        height: 630,
        alt: "Tuxedo Corn - Olathe Sweet Sweet Corn",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Tuxedo Corn | Fresh Produce Wholesale",
    description: "Premium sweet corn and seasonal produce delivered fresh from our Colorado farm to pickup stops near you.",
    site: "@TuxedoCorn",
    images: ["/og-tuxedo.jpg"],
  },
  alternates: {
    canonical: `${BASE_URL}/tuxedo`,
  },
  robots: {
    index: true,
    follow: true,
  },
  other: {
    "application/ld+json": JSON.stringify(tuxedoBreadcrumbSchema),
  },
};

export default function TuxedoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen relative">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-emerald-950/50 via-zinc-950 to-zinc-950" />
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px]" />
      </div>
      <div className="relative">{children}</div>
    </div>
  );
}
