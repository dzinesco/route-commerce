import type { Metadata } from "next";
import FAQClientPage from "./FAQClientPage";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://routecommerce.com";

export const metadata: Metadata = {
  title: "FAQ — Frequently Asked Questions",
  description: "Find answers to common questions about ordering peaches, citrus, pickup stops, and wholesale accounts for Indian River Direct.",
  keywords: ["Indian River Direct FAQ", "peach pickup questions", "citrus order FAQ", "Florida produce FAQ", "wholesale fruit accounts"],
  openGraph: {
    title: "FAQ — Indian River Direct Frequently Asked Questions",
    description: "Find answers to common questions about ordering peaches, citrus, pickup stops, shipping, and wholesale accounts.",
    url: `${BASE_URL}/indian-river-direct/faq`,
    siteName: "Indian River Direct",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/og-indian-river.jpg",
        width: 1200,
        height: 630,
        alt: "Indian River Direct FAQ",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "FAQ — Indian River Direct",
    description: "Find answers to common questions about ordering peaches, citrus, pickup stops, and wholesale accounts.",
    site: "@IndianRiverDirect",
    images: ["/og-indian-river.jpg"],
  },
  alternates: {
    canonical: `${BASE_URL}/indian-river-direct/faq`,
  },
  robots: {
    index: true,
    follow: true,
  },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "How does preordering work?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Select your preferred pickup stop from our schedule, then browse our available products. Add items to your cart and select your stop at checkout. Preordering helps us know how much to bring to each stop — and ensures you get what you want."
      }
    },
    {
      "@type": "Question",
      "name": "What citrus is available when?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Our season runs year-round with different fruits at different times: Navels (Dec–Mar), Ruby Red Grapefruit (Jan–Apr), Honeybells (Jan–Feb), Super Sweet Tangerines (Jan–Mar), Temples (Mar–Apr), Peaches (Jun–Aug), Blueberries (Jun–Jul)."
      }
    },
    {
      "@type": "Question",
      "name": "Can I have my order shipped instead of picked up?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Currently we offer pickup-only ordering through this site. For bulk or wholesale shipping inquiries, please contact us directly at 772-971-4484."
      }
    },
    {
      "@type": "Question",
      "name": "How do I apply for a wholesale account?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Visit /wholesale/register to apply. We review applications and typically respond within 1–2 business days. Wholesale accounts are available to retailers, restaurants, farm stands, and other businesses."
      }
    }
  ]
};

export default function IndianRiverFAQLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <FAQClientPage />
    </>
  );
}