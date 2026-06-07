"use server";

import { getAdminUser } from "@/lib/admin-permissions";
import { pool } from "@/lib/db";

export type UploadLogoResult =
  | { success: true; logoUrl: string }
  | { success: false; error: string };

/**
 * Upload a brand logo (light or dark variant) to Supabase Storage and
 * save the resulting public URL to the brand_settings row via the
 * `upsert_brand_settings` SECURITY DEFINER RPC.
 *
 * NOTE: the storage PUT itself is not a database call, so it still
 * goes through the Supabase Storage REST API. Storage migration to an
 * S3-compatible backend is tracked separately; until that lands, the
 * public URL pattern (`/storage/v1/object/public/...`) keeps working
 * for any pre-existing bucket.
 */
export async function uploadBrandLogo(
  brandId: string,
  file: File,
  isDark: boolean = false
): Promise<UploadLogoResult> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (!adminUser.can_manage_settings && adminUser.role !== "platform_admin") {
    return { success: false, error: "Not authorized" };
  }
  if (adminUser.role === "brand_admin" && adminUser.brand_id !== brandId) {
    return { success: false, error: "Not authorized for this brand" };
  }

  const validTypes = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
  if (!validTypes.includes(file.type)) {
    return { success: false, error: "Invalid file type. Use PNG, JPEG, WebP, or SVG." };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { success: false, error: "File too large. Max 5MB." };
  }

  const ext = file.type === "image/svg+xml" ? "svg" : file.type.split("/")[1];
  const path = isDark ? `logo-dark.${ext}` : `logo.${ext}`;
  const storagePath = `brand-logos/${brandId}/${path}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const uploadRes = await fetch(
    `${supabaseUrl}/storage/v1/object/brand-logos/${storagePath}`,
    {
      method: "PUT",
      headers: { apikey: supabaseKey, "Content-Type": file.type, "x-upsert": "true" },
      body: buffer,
    }
  );

  if (!uploadRes.ok) {
    return { success: false, error: `Upload failed: ${await uploadRes.text()}` };
  }

  const publicUrl = `${supabaseUrl}/storage/v1/object/public/brand-logos/${storagePath}`;

  const saveOk = await callUpsertBrandSettings(brandId, {
    [isDark ? "p_logo_url_dark" : "p_logo_url"]: publicUrl,
  });
  if (!saveOk) {
    return { success: false, error: "Upload succeeded but failed to save URL" };
  }

  return { success: true, logoUrl: publicUrl };
}

export async function uploadOlatheSweetLogo(
  brandId: string,
  file: File
): Promise<UploadLogoResult> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (!adminUser.can_manage_settings && adminUser.role !== "platform_admin") {
    return { success: false, error: "Not authorized" };
  }
  if (adminUser.role === "brand_admin" && adminUser.brand_id !== brandId) {
    return { success: false, error: "Not authorized for this brand" };
  }

  const validTypes = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
  if (!validTypes.includes(file.type)) {
    return { success: false, error: "Invalid file type. Use PNG, JPEG, WebP, or SVG." };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { success: false, error: "File too large. Max 5MB." };
  }

  const ext = file.type === "image/svg+xml" ? "svg" : file.type.split("/")[1];
  const storagePath = `brand-logos/${brandId}/olathe-sweet-logo.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const uploadRes = await fetch(
    `${supabaseUrl}/storage/v1/object/brand-logos/${storagePath}`,
    {
      method: "PUT",
      headers: { apikey: supabaseKey, "Content-Type": file.type, "x-upsert": "true" },
      body: buffer,
    }
  );

  if (!uploadRes.ok) {
    return { success: false, error: `Upload failed: ${await uploadRes.text()}` };
  }

  const publicUrl = `${supabaseUrl}/storage/v1/object/public/brand-logos/${storagePath}`;

  const saveOk = await callUpsertBrandSettings(brandId, {
    p_olathe_sweet_logo_url: publicUrl,
  });
  if (!saveOk) {
    return { success: false, error: "Upload succeeded but failed to save URL" };
  }

  return { success: true, logoUrl: publicUrl };
}

export async function uploadOlatheSweetLogoDark(
  brandId: string,
  file: File
): Promise<UploadLogoResult> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (!adminUser.can_manage_settings && adminUser.role !== "platform_admin") {
    return { success: false, error: "Not authorized" };
  }
  if (adminUser.role === "brand_admin" && adminUser.brand_id !== brandId) {
    return { success: false, error: "Not authorized for this brand" };
  }

  const validTypes = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
  if (!validTypes.includes(file.type)) {
    return { success: false, error: "Invalid file type. Use PNG, JPEG, WebP, or SVG." };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { success: false, error: "File too large. Max 5MB." };
  }

  const ext = file.type === "image/svg+xml" ? "svg" : file.type.split("/")[1];
  const storagePath = `brand-logos/${brandId}/olathe-sweet-logo-dark.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const uploadRes = await fetch(
    `${supabaseUrl}/storage/v1/object/brand-logos/${storagePath}`,
    {
      method: "PUT",
      headers: { apikey: supabaseKey, "Content-Type": file.type, "x-upsert": "true" },
      body: buffer,
    }
  );

  if (!uploadRes.ok) {
    return { success: false, error: `Upload failed: ${await uploadRes.text()}` };
  }

  const publicUrl = `${supabaseUrl}/storage/v1/object/public/brand-logos/${storagePath}`;

  const saveOk = await callUpsertBrandSettings(brandId, {
    p_olathe_sweet_logo_url_dark: publicUrl,
  });
  if (!saveOk) {
    return { success: false, error: "Upload succeeded but failed to save URL" };
  }

  return { success: true, logoUrl: publicUrl };
}

/**
 * Internal helper: invoke the SECURITY DEFINER `upsert_brand_settings`
 * RPC via the shared pg pool. Accepts a partial args object whose keys
 * map to the function's `p_*` parameters.
 */
async function callUpsertBrandSettings(
  brandId: string,
  args: Record<string, unknown>
): Promise<boolean> {
  // Always set the brand id.
  args.p_brand_id = brandId;

  // Build a `$1, $2, ...` parameter list in deterministic key order so
  // the positional binds line up with the named parameters.
  const keys = Object.keys(args);
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");
  const params = keys.map((k) => args[k]);

  try {
    await pool.query(
      `SELECT upsert_brand_settings(${placeholders})`,
      params,
    );
    return true;
  } catch {
    return false;
  }
}

export type BrandSettings = {
  id?: string;
  brand_id: string;
  brand_name: string;
  legal_business_name: string | null;
  phone: string | null;
  email: string | null;
  website_url: string | null;
  street_address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  logo_url: string | null;
  logo_url_dark: string | null;
  olathe_sweet_logo_url: string | null;
  olathe_sweet_logo_url_dark: string | null;
  default_email_signature: string | null;
  invoice_footer_notes: string | null;
  // Storefront customization fields
  hero_tagline: string | null;
  about_headline: string | null;
  about_subheadline: string | null;
  custom_footer_text: string | null;
  show_wholesale_link: boolean | null;
  show_zip_search: boolean | null;
  show_schedule_pdf: boolean | null;
  show_text_alerts: boolean | null;
  schedule_pdf_notes: string | null;
  hero_image_url: string | null;
  // Color customization
  brand_primary_color: string | null;
  brand_secondary_color: string | null;
  brand_bg_color: string | null;
  brand_text_color: string | null;
  // Tax settings
  collect_sales_tax: boolean | null;
  nexus_states: string[] | null;
  updated_at?: string;
};

export type GetBrandSettingsResult =
  | { success: true; settings: BrandSettings | null }
  | { success: false; error: string };

export type SaveBrandSettingsResult =
  | { success: true; settings: BrandSettings }
  | { success: false; error: string };

export async function getBrandSettings(brandId: string): Promise<GetBrandSettingsResult> {
  try {
    const { rows } = await pool.query<BrandSettings>(
      "SELECT * FROM get_brand_settings($1)",
      [brandId],
    );
    return { success: true, settings: rows[0] ?? null };
  } catch {
    return { success: false, error: "Failed to fetch brand settings" };
  }
}

// Public version for storefront pages — uses slug, no auth required
export async function getBrandSettingsPublic(brandSlug: string): Promise<GetBrandSettingsResult & { wholesaleEnabled?: boolean | null }> {
  // Wrapped in try/catch so a build-time DB outage (ECONNREFUSED) doesn't
  // crash the prerender — the page just falls back to its default brand
  // name and revalidates from a real request later.
  try {
    const { rows } = await pool.query<BrandSettings & { wholesale_enabled?: boolean | null }>(
      "SELECT * FROM get_brand_settings_by_slug($1)",
      [brandSlug],
    );
    const data = rows[0];
    if (!data) {
      return { success: false, error: "Failed to fetch brand settings", wholesaleEnabled: undefined };
    }
    return {
      success: true,
      settings: data,
      wholesaleEnabled: data.wholesale_enabled,
    };
  } catch {
    return { success: false, error: "Failed to fetch brand settings", wholesaleEnabled: undefined };
  }
}

export async function saveBrandSettings(params: {
  brandId: string;
  legalBusinessName?: string;
  phone?: string;
  email?: string;
  websiteUrl?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  logoUrl?: string;
  logoUrlDark?: string;
  olatheSweetLogoUrl?: string;
  olatheSweetLogoUrlDark?: string;
  defaultEmailSignature?: string;
  invoiceFooterNotes?: string;
  // Storefront customization fields
  heroTagline?: string;
  aboutHeadline?: string;
  aboutSubheadline?: string;
  customFooterText?: string;
  showWholesaleLink?: boolean;
  showZipSearch?: boolean;
  showSchedulePdf?: boolean;
  showTextAlerts?: boolean;
  schedulePdfNotes?: string;
  heroImageUrl?: string;
  brandPrimaryColor?: string;
  brandSecondaryColor?: string;
  brandBgColor?: string;
  brandTextColor?: string;
  collectSalesTax?: boolean;
  nexusStates?: string[];
}): Promise<SaveBrandSettingsResult> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (!adminUser.can_manage_settings && adminUser.role !== "platform_admin") {
    return { success: false, error: "Not authorized" };
  }

  if (adminUser.role === "brand_admin" && adminUser.brand_id !== params.brandId) {
    return { success: false, error: "Not authorized for this brand" };
  }

  try {
    const { rows } = await pool.query<BrandSettings>(
      `SELECT * FROM upsert_brand_settings(
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
         $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
         $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
         $31, $32
       )`,
      [
        params.brandId,
        params.legalBusinessName ?? null,
        params.phone ?? null,
        params.email ?? null,
        params.websiteUrl ?? null,
        params.streetAddress ?? null,
        params.city ?? null,
        params.state ?? null,
        params.postalCode ?? null,
        params.country ?? null,
        params.logoUrl ?? null,
        params.logoUrlDark ?? null,
        params.olatheSweetLogoUrl ?? null,
        params.olatheSweetLogoUrlDark ?? null,
        params.defaultEmailSignature ?? null,
        params.invoiceFooterNotes ?? null,
        params.heroTagline ?? null,
        params.aboutHeadline ?? null,
        params.aboutSubheadline ?? null,
        params.customFooterText ?? null,
        params.showWholesaleLink ?? null,
        params.showZipSearch ?? null,
        params.showSchedulePdf ?? null,
        params.showTextAlerts ?? null,
        params.schedulePdfNotes ?? null,
        params.heroImageUrl ?? null,
        params.brandPrimaryColor ?? null,
        params.brandSecondaryColor ?? null,
        params.brandBgColor ?? null,
        params.brandTextColor ?? null,
        params.collectSalesTax ?? null,
        params.nexusStates ?? null,
      ],
    );
    return { success: true, settings: rows[0] as BrandSettings };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save";
    return { success: false, error: `Failed to save: ${message.slice(0, 200)}` };
  }
}
