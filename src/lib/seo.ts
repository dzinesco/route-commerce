// SEO and Metadata Utilities

import { Metadata } from "next";

// Base URL for the application
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://routecommerce.com";

// Default SEO configuration
export const defaultSEO: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "Route Commerce | Fresh Produce Wholesale Platform",
    template: "%s | Route Commerce",
  },
  description: "Multi-tenant B2B e-commerce platform for fresh produce wholesale distribution. Brands sell to customers who pick up at scheduled stops or receive shipments.",
  keywords: [
    "wholesale produce",
    "farm fresh",
    "B2B e-commerce",
    "produce distribution",
    "pickup stops",
    "fresh produce",
    "farm management",
    "order management",
    "customer portal",
    "wholesale ordering",
  ],
  authors: [{ name: "Route Commerce" }],
  creator: "Route Commerce",
  publisher: "Route Commerce",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: BASE_URL,
    siteName: "Route Commerce",
    title: "Route Commerce | Fresh Produce Wholesale Platform",
    description: "Multi-tenant B2B e-commerce platform for fresh produce wholesale distribution.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Route Commerce Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Route Commerce | Fresh Produce Wholesale Platform",
    description: "Multi-tenant B2B e-commerce platform for fresh produce wholesale distribution.",
    site: "@RouteCommerce",
    creator: "@RouteCommerce",
    images: ["/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: "/icons/apple-touch-icon.png",
    other: [
      {
        rel: "manifest",
        url: "/manifest.json",
      },
    ],
  },
  alternates: {
    canonical: BASE_URL,
    languages: {
      "en-US": BASE_URL,
    },
  },
};

// Brand-specific metadata
export function getBrandMetadata(brand: {
  name: string;
  slug: string;
  description?: string;
  logo_url?: string;
}) {
  return {
    title: `${brand.name} | Fresh Produce`,
    description: brand.description || `Order fresh produce from ${brand.name}. Pick up at scheduled stops or get deliveries.`,
    openGraph: {
      title: `${brand.name} | Fresh Produce`,
      description: brand.description || `Order fresh produce from ${brand.name}`,
      url: `${BASE_URL}/${brand.slug}`,
      siteName: brand.name,
      images: brand.logo_url ? [{ url: brand.logo_url }] : [],
    },
  };
}

// Product metadata
export function getProductMetadata(product: {
  name: string;
  description?: string;
  price?: number;
  image_url?: string;
}) {
  return {
    title: `${product.name} | Route Commerce`,
    description: product.description || `Order ${product.name} from Route Commerce`,
    openGraph: {
      title: product.name,
      description: product.description,
      images: product.image_url ? [{ url: product.image_url }] : [],
    },
  };
}

// Admin page metadata
export function getAdminMetadata(pageTitle: string) {
  return {
    title: `${pageTitle} | Admin | Route Commerce`,
    robots: {
      index: false,
      follow: false,
    },
  };
}

// Structured data (JSON-LD)
export function getOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Route Commerce",
    url: BASE_URL,
    logo: `${BASE_URL}/logo.svg`,
    sameAs: [
      "https://twitter.com/RouteCommerce",
      "https://linkedin.com/company/route-commerce",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      email: "support@routecommerce.com",
    },
  };
}

export function getProductSchema(product: {
  name: string;
  description: string;
  price: number;
  currency?: string;
  availability?: string;
  image?: string;
  brand?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.image,
    brand: {
      "@type": "Brand",
      name: product.brand || "Route Commerce",
    },
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: product.currency || "USD",
      availability: product.availability || "https://schema.org/InStock",
    },
  };
}

export function getLocalBusinessSchema(business: {
  name: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  phone?: string;
  email?: string;
  openingHours?: string[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: business.name,
    address: {
      "@type": "PostalAddress",
      streetAddress: business.address,
      addressLocality: business.city,
      addressRegion: business.state,
      postalCode: business.postalCode,
    },
    telephone: business.phone,
    email: business.email,
    openingHours: business.openingHours,
  };
}

// Generate sitemap data
export function generateSitemap(pages: { url: string; lastModified?: Date; changeFrequency?: string; priority?: number }[]) {
  return pages.map((page) => ({
    url: `${BASE_URL}${page.url}`,
    lastModified: page.lastModified || new Date(),
    changeFrequency: page.changeFrequency || "weekly",
    priority: page.priority || 0.5,
  }));
}