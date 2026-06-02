import type { Metadata } from "next";
import FAQClientPage from "./FAQClientPage";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://routecommerce.com";

export const metadata: Metadata = {
  title: "FAQ — Frequently Asked Questions",
  description: "Find answers to common questions about ordering corn, pickup stops, shipping, and wholesale accounts for Tuxedo Corn.",
  keywords: ["Tuxedo Corn FAQ", "Olathe Sweet corn questions", "corn pickup FAQ", "wholesale corn accounts", "corn shipping"],
  openGraph: {
    title: "FAQ — Tuxedo Corn Frequently Asked Questions",
    description: "Find answers to common questions about ordering corn, pickup stops, shipping, and wholesale accounts.",
    url: `${BASE_URL}/tuxedo/faq`,
    siteName: "Tuxedo Corn",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/og-tuxedo.jpg",
        width: 1200,
        height: 630,
        alt: "Tuxedo Corn FAQ",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "FAQ — Tuxedo Corn",
    description: "Find answers to common questions about ordering corn, pickup stops, shipping, and wholesale accounts.",
    site: "@TuxedoCorn",
    images: ["/og-tuxedo.jpg"],
  },
  alternates: {
    canonical: `${BASE_URL}/tuxedo/faq`,
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
      "name": "How do I place a preorder for corn?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Find a stop near you on our homepage and click 'Shop This Stop' to add corn to your cart and select your pickup location. Preordering helps us bring the right amount of corn to each stop."
      }
    },
    {
      "@type": "Question",
      "name": "Can I order without selecting a pickup stop?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. Choose 'Shipping' at checkout and we will mail cooler boxes directly to your home. Shipping is available for orders of 4 or more dozen and is fulfilled after the season ends."
      }
    },
    {
      "@type": "Question",
      "name": "Do you ship corn?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. We ship Olathe Sweet Sweet Corn nationwide. Orders ship as cooler boxes after our field season ends in late summer. A minimum of 4 dozen is required for shipping."
      }
    },
    {
      "@type": "Question",
      "name": "How do I set up a wholesale account?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Visit /wholesale/register to apply. We review applications and respond within 1-2 business days. Wholesale accounts are available to retailers, restaurants, and farm stands."
      }
    },
    {
      "@type": "Question",
      "name": "What makes Olathe Sweet different?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Olathe Sweet Sweet Corn is grown in the Uncompahgre Valley of Colorado, where high-altitude days and cool nights produce exceptionally sweet, tender corn. We have been growing this variety for over 40 years."
      }
    }
  ]
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": BASE_URL
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "Tuxedo Corn",
      "item": `${BASE_URL}/tuxedo`
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": "FAQ",
      "item": `${BASE_URL}/tuxedo/faq`
    }
  ]
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Tuxedo Corn",
  url: `${BASE_URL}/tuxedo`,
  logo: {
    "@type": "ImageObject",
    url: `${BASE_URL}/logo-tuxedo.png`
  },
  contactPoint: {
    "@type": "ContactPoint",
    telephone: "+1-970-323-6874",
    contactType: "customer service",
    availableLanguage: "English"
  }
};

export default function TuxedoFAQLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <FAQClientPage />
    </>
  );
}