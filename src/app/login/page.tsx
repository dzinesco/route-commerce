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
  // The Google provider is only added to the Auth.js config when these
  // two env vars are set. Pass the flag down so the client can hide the
  // button (and surface a helpful message) when Google is unavailable.
  const hasGoogle = !!(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
  return <LoginClient hasGoogle={hasGoogle} />;
}