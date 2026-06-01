import type { Metadata } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://yourdomain.com";

export const metadata: Metadata = {
  title: "Our Story | A Passion for All Things Fruit",
  description:
    "Since 1985, Indian River Direct has been bringing the finest peaches and citrus from our Florida groves directly to your neighborhood. Family-owned and operated.",
  openGraph: {
    title: "Our Story | Indian River Direct",
    description:
      "Since 1985, bringing the finest peaches and citrus from our Florida groves directly to your neighborhood. A passion for all things fruit.",
    url: `${BASE_URL}/indian-river-direct/about`,
    images: [
      {
        url: `${BASE_URL}/og-indian-river-about.jpg`,
        width: 1200,
        height: 630,
        alt: "Indian River Direct - Our Family Grove Story",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Our Story | Indian River Direct",
    description:
      "Since 1985, bringing the finest peaches and citrus from our Florida groves directly to your neighborhood.",
    images: [`${BASE_URL}/og-indian-river-about.jpg`],
  },
  alternates: {
    canonical: `${BASE_URL}/indian-river-direct/about`,
  },
};

export default function IndianRiverAboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
