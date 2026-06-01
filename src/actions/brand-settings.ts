"use server";

import { getAdminUser } from "@/lib/admin-permissions";
import { svcHeaders } from "@/lib/svc-headers";

export type UploadLogoResult =
  | { success: true; logoUrl: string }
  | { success: false; error: string };

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
      headers: { ...svcHeaders(supabaseKey), "Content-Type": file.type, "x-upsert": "true" },
      body: buffer,
    }
  );

  if (!uploadRes.ok) {
    return { success: false, error: `Upload failed: ${await uploadRes.text()}` };
  }

  const publicUrl = `${supabaseUrl}/storage/v1/object/public/brand-logos/${storagePath}`;

  // Save URL to brand_settings via RPC
  const saveRes = await fetch(
    `${supabaseUrl}/rest/v1/rpc/upsert_brand_settings`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({
        p_brand_id: brandId,
        [isDark ? "p_logo_url_dark" : "p_logo_url"]: publicUrl,
      }),
    }
  );

  if (!saveRes.ok) {
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
      headers: { ...svcHeaders(supabaseKey), "Content-Type": file.type, "x-upsert": "true" },
      body: buffer,
    }
  );

  if (!uploadRes.ok) {
    return { success: false, error: `Upload failed: ${await uploadRes.text()}` };
  }

  const publicUrl = `${supabaseUrl}/storage/v1/object/public/brand-logos/${storagePath}`;

  const saveRes = await fetch(
    `${supabaseUrl}/rest/v1/rpc/upsert_brand_settings`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({
        p_brand_id: brandId,
        p_olathe_sweet_logo_url: publicUrl,
      }),
    }
  );

  if (!saveRes.ok) {
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
      headers: { ...svcHeaders(supabaseKey), "Content-Type": file.type, "x-upsert": "true" },
      body: buffer,
    }
  );

  if (!uploadRes.ok) {
    return { success: false, error: `Upload failed: ${await uploadRes.text()}` };
  }

  const publicUrl = `${supabaseUrl}/storage/v1/object/public/brand-logos/${storagePath}`;

  const saveRes = await fetch(
    `${supabaseUrl}/rest/v1/rpc/upsert_brand_settings`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({
        p_brand_id: brandId,
        p_olathe_sweet_logo_url_dark: publicUrl,
      }),
    }
  );

  if (!saveRes.ok) {
    return { success: false, error: "Upload succeeded but failed to save URL" };
  }

  return { success: true, logoUrl: publicUrl };
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
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/get_brand_settings`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({ p_brand_id: brandId }),
    }
  );

  if (!response.ok) return { success: false, error: "Failed to fetch brand settings" };
  const data = await response.json();
  return { success: true, settings: data };
}

// Public version for storefront pages — uses slug, no auth required
export async function getBrandSettingsPublic(brandSlug: string): Promise<GetBrandSettingsResult & { wholesaleEnabled?: boolean | null }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/get_brand_settings_by_slug`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({ p_brand_slug: brandSlug }),
    }
  );

  if (!response.ok) return { success: false, error: "Failed to fetch brand settings", wholesaleEnabled: undefined };
  const data = await response.json();
  return {
    success: true,
    settings: data,
    wholesaleEnabled: data?.wholesale_enabled,
  };
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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/upsert_brand_settings`,
    {
      method: "POST",
      headers: {
        ...svcHeaders(supabaseKey),
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        p_brand_id: params.brandId,
        p_legal_business_name: params.legalBusinessName ?? null,
        p_phone: params.phone ?? null,
        p_email: params.email ?? null,
        p_website_url: params.websiteUrl ?? null,
        p_street_address: params.streetAddress ?? null,
        p_city: params.city ?? null,
        p_state: params.state ?? null,
        p_postal_code: params.postalCode ?? null,
        p_country: params.country ?? null,
        p_logo_url: params.logoUrl ?? null,
        p_logo_url_dark: params.logoUrlDark ?? null,
        p_olathe_sweet_logo_url: params.olatheSweetLogoUrl ?? null,
        p_olathe_sweet_logo_url_dark: params.olatheSweetLogoUrlDark ?? null,
        p_default_email_signature: params.defaultEmailSignature ?? null,
        p_invoice_footer_notes: params.invoiceFooterNotes ?? null,
        p_hero_tagline: params.heroTagline ?? null,
        p_about_headline: params.aboutHeadline ?? null,
        p_about_subheadline: params.aboutSubheadline ?? null,
        p_custom_footer_text: params.customFooterText ?? null,
        p_show_wholesale_link: params.showWholesaleLink ?? null,
        p_show_zip_search: params.showZipSearch ?? null,
        p_show_schedule_pdf: params.showSchedulePdf ?? null,
        p_show_text_alerts: params.showTextAlerts ?? null,
        p_schedule_pdf_notes: params.schedulePdfNotes ?? null,
        p_hero_image_url: params.heroImageUrl ?? null,
        p_brand_primary_color: params.brandPrimaryColor ?? null,
        p_brand_secondary_color: params.brandSecondaryColor ?? null,
        p_brand_bg_color: params.brandBgColor ?? null,
        p_brand_text_color: params.brandTextColor ?? null,
        p_collect_sales_tax: params.collectSalesTax ?? null,
        p_nexus_states: params.nexusStates ?? null,
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    return { success: false, error: `Failed to save: ${err.slice(0, 200)}` };
  }

  const data = await response.json();
  return { success: true, settings: data };
}