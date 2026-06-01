import type { Metadata } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://yourdomain.com";

export const metadata: Metadata = {
  title: "Our Story | Three Generations of Sweet Corn Excellence",
  description:
    "Learn about Tuxedo Corn's heritage - three generations of growing and shipping Olathe Sweet Sweet Corn from our family farm in Olathe, Colorado since 1982.",
  openGraph: {
    title: "Our Story | Tuxedo Corn",
    description:
      "Three generations of sweet corn excellence. Learn about our family farm and the Olathe Sweet difference.",
    url: `${BASE_URL}/tuxedo/about`,
    images: [
      {
        url: `${BASE_URL}/og-tuxedo-about.jpg`,
        width: 1200,
        height: 630,
        alt: "Tuxedo Corn Family Farm - Three Generations of Excellence",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Our Story | Tuxedo Corn",
    description:
      "Three generations of sweet corn excellence. Learn about our family farm and the Olathe Sweet difference.",
    images: [`${BASE_URL}/og-tuxedo-about.jpg`],
  },
  alternates: {
    canonical: `${BASE_URL}/tuxedo/about`,
  },
};

export default function TuxedoAboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
