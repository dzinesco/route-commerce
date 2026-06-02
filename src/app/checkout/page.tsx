import type { Metadata } from "next";
import CheckoutClient from "./CheckoutClient";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://routecommerce.com";

export const metadata: Metadata = {
  title: "Checkout — Route Commerce",
  description: "Complete your order. Enter customer details, select pickup location, and proceed to secure payment via Stripe.",
  keywords: ["checkout", "payment", "order", "pickup", "shipping"],
  openGraph: {
    title: "Checkout — Route Commerce",
    description: "Complete your order. Enter customer details, select pickup location, and proceed to secure payment.",
    url: `${BASE_URL}/checkout`,
    siteName: "Route Commerce",
    locale: "en_US",
    type: "website",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function CheckoutPage() {
  return <CheckoutClient />;
}