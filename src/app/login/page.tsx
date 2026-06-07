import type { Metadata } from "next";
import LoginClient from "./LoginClient";
import { isDevLoginEnabled } from "@/auth.config";

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

type SearchParams = { error?: string; redirect?: string };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  // The Google provider is only added to the Auth.js config when these
  // two env vars are set. Pass the flag down so the client can hide the
  // button (and surface a helpful message) when Google is unavailable.
  //
  // We also require the client ID to look like a real Google OAuth client
  // ID (ends in `.apps.googleusercontent.com`). This guards against
  // dev/CI environments where the env vars are set to placeholder strings
  // like "dummy-google-client-id" — those would otherwise surface a
  // Google button that immediately 401s on Google's end.
  const googleId = process.env.AUTH_GOOGLE_ID ?? "";
  const googleSecret = process.env.AUTH_GOOGLE_SECRET ?? "";
  const hasGoogle = !!(
    googleId &&
    googleSecret &&
    googleId.endsWith(".apps.googleusercontent.com")
  );
  const hasCredentials = isDevLoginEnabled();
  const params = await searchParams;
  const error =
    params?.error === "CredentialsSignin" || params?.error === "MissingCredentials"
      ? "Invalid email or password."
      : params?.error
        ? "Sign-in failed. Please try again."
        : null;
  return (
    <LoginClient
      hasGoogle={hasGoogle}
      hasCredentials={hasCredentials}
      error={error}
      seededEmail={hasCredentials ? "admin@route-commerce.local" : undefined}
      redirectTo={params?.redirect ?? "/admin"}
    />
  );
}
