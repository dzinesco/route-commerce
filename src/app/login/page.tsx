import type { Metadata } from "next";
import LoginClient from "./LoginClient";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://routecommerce.com";

export const metadata: Metadata = {
  title: "Sign In — Route Commerce",
  description: "Sign in to your Route Commerce account. Access your admin dashboard, manage orders, stops, and communications.",
  keywords: ["sign in", "login", "admin", "account", "Route Commerce"],
  openGraph: {
    title: "Sign In — Route Commerce",
    description: "Sign in to your Route Commerce account.",
    url: `${BASE_URL}/login`,
    siteName: "Route Commerce",
    locale: "en_US",
    type: "website",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function LoginPage() {
  return <LoginClient />;
}