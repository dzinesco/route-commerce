import { getPublicStopsForBrand } from "@/actions/stops";
import { getBrandSettingsPublic } from "@/actions/brand-settings";
import TuxedoStopsList from "./TuxedoStopsList";

// Page-level cache — matches the 5-min revalidate in getPublicStopsForBrand.
// Mutations call revalidateTag("stops") to invalidate.
export const revalidate = 300;

export default async function TuxedoStopsPage() {
  const [stops, settings] = await Promise.all([
    getPublicStopsForBrand("tuxedo"),
    getBrandSettingsPublic("tuxedo"),
  ]);

  const brandName = settings.success ? settings.settings?.brand_name : null;

  return (
    <TuxedoStopsList
      stops={stops}
      brandName={brandName ?? "Tuxedo Corn"}
      brandSlug="tuxedo"
    />
  );
}
