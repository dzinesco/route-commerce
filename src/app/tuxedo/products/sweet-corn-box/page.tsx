import type { Metadata } from "next";
import { Fraunces, JetBrains_Mono } from "next/font/google";
import { supabase } from "@/lib/supabase";
import { getBrandSettingsPublic } from "@/actions/brand-settings";
import SweetCornProductPage from "@/components/storefront/SweetCornProductPage";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  style: ["normal", "italic"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  // The Tuxedo layout's `template: "%s | Tuxedo Corn"` already appends the
  // brand — keep the bare title here so the rendered <title> is correct.
  title: "Fresh Sweet Corn Box – 12 Ears",
  description:
    "Our 12-Ear Corn Box is packed with peak-season, super-sweet Olathe Sweet corn picked that morning and rushed to your door. Hand-selected, non-GMO, and 100% sweetness guaranteed.",
  keywords: [
    "sweet corn",
    "Olathe Sweet",
    "fresh corn box",
    "12 ears of corn",
    "farm fresh corn",
    "Tuxedo Corn",
  ],
  openGraph: {
    title: "Fresh Sweet Corn Box – 12 Ears",
    description:
      "Peak-season, super-sweet Olathe Sweet corn — picked that morning, rushed to your door. 100% sweetness guaranteed.",
    type: "website",
    images: [
      {
        url: "https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&w=1200&q=80",
        width: 1200,
        height: 630,
        alt: "Fresh sweet corn box — 12 ears of Olathe Sweet corn",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Fresh Sweet Corn Box – 12 Ears",
    description:
      "Peak-season, super-sweet Olathe Sweet corn. Hand-selected, non-GMO, 100% sweetness guaranteed.",
  },
};

const BRAND_SLUG = "tuxedo";

type Brand = {
  id: string;
  name: string;
};

type Settings = {
  logo_url?: string | null;
  logo_url_dark?: string | null;
};

export default async function SweetCornBoxPage() {
  // Fetch the brand record so we have a real brand_id to thread through
  // the cart system. Falls back to a placeholder if Supabase is unreachable
  // (so the page still renders in dev / disconnected previews).
  let brandId = "00000000-0000-0000-0000-000000000000";
  let brandName = "Tuxedo Corn";
  let logoUrl: string | null = null;
  let logoUrlDark: string | null = null;

  try {
    const [brandRes, settingsRes] = await Promise.all([
      supabase.from("brands").select("id, name").eq("slug", BRAND_SLUG).single(),
      getBrandSettingsPublic(BRAND_SLUG),
    ]);
    if (brandRes.data) {
      const b = brandRes.data as Brand;
      brandId = b.id;
      brandName = b.name;
    }
    if (settingsRes.success && settingsRes.settings) {
      const s = settingsRes.settings as Settings;
      logoUrl = s.logo_url ?? null;
      logoUrlDark = s.logo_url_dark ?? null;
    }
  } catch {
    // ignore — fall through with defaults
  }

  return (
    <div
      className={`${fraunces.variable} ${jetbrainsMono.variable} font-sans`}
      style={{
        // The product page uses editorial typography: a display serif
        // (Fraunces) for headlines and a mono (JetBrains Mono) for data
        // stamps. Body copy falls back to the global SF Pro stack.
        ["--font-display" as never]: fraunces.style.fontFamily,
        ["--font-mono" as never]: jetbrainsMono.style.fontFamily,
      }}
    >
      <SweetCornProductPage
        brandId={brandId}
        brandName={brandName}
        logoUrl={logoUrl}
        logoUrlDark={logoUrlDark}
      />
    </div>
  );
}
