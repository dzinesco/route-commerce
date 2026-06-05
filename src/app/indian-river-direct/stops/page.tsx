import { getPublicStopsForBrand } from "@/actions/stops";
import { getBrandSettingsPublic } from "@/actions/brand-settings";
import IndianRiverStopsList from "./IndianRiverStopsList";

// Page-level cache — matches the 5-min revalidate in getPublicStopsForBrand.
// Mutations call revalidateTag("stops") to invalidate.
export const revalidate = 300;
export const dynamic = "force-dynamic";

export default async function IndianRiverStopsPage() {
  const [stops, settings] = await Promise.all([
    getPublicStopsForBrand("indian-river-direct"),
    getBrandSettingsPublic("indian-river-direct"),
  ]);

  const brandName = settings.success ? settings.settings?.brand_name : null;

  return (
    <IndianRiverStopsList
      stops={stops}
      brandName={brandName ?? "Indian River Direct"}
      brandSlug="indian-river-direct"
    />
  );
}
