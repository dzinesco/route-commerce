"use client";

import NextImage from "next/image";
import { useState, useEffect, useRef } from "react";
import {
  getBrandSettings,
  saveBrandSettings,
  uploadBrandLogo,
  uploadOlatheSweetLogo,
  uploadOlatheSweetLogoDark,
  type BrandSettings,
} from "@/actions/brand-settings";
import { AdminInput, AdminTextInput, AdminTextarea, AdminSelect } from "./design-system";

type Props = {
  settings: BrandSettings | null;
  brandId: string;
  brandName: string;
  brands?: { id: string; name: string }[];
  isPlatformAdmin?: boolean;
};

export default function BrandSettingsForm({
  settings,
  brandId: initialBrandId,
  brandName: initialBrandName,
  brands = [],
  isPlatformAdmin = false,
}: Props) {
  const [activeBrandId, setActiveBrandId] = useState(initialBrandId);
  const [activeBrandName, setActiveBrandName] = useState(initialBrandName);
  const [legalBusinessName, setLegalBusinessName] = useState(settings?.legal_business_name ?? "");
  const [phone, setPhone] = useState(settings?.phone ?? "");
  const [email, setEmail] = useState(settings?.email ?? "");
  const [websiteUrl, setWebsiteUrl] = useState(settings?.website_url ?? "");
  const [streetAddress, setStreetAddress] = useState(settings?.street_address ?? "");
  const [city, setCity] = useState(settings?.city ?? "");
  const [state, setState] = useState(settings?.state ?? "");
  const [postalCode, setPostalCode] = useState(settings?.postal_code ?? "");
  const [country, setCountry] = useState(settings?.country ?? "US");
  const [logoUrl, setLogoUrl] = useState(settings?.logo_url ?? "");
  const [logoUrlDark, setLogoUrlDark] = useState(settings?.logo_url_dark ?? "");
  const [olatheSweetLogoUrl, setOlatheSweetLogoUrl] = useState(settings?.olathe_sweet_logo_url ?? "");
  const [olatheSweetLogoUrlDark, setOlatheSweetLogoUrlDark] = useState(settings?.olathe_sweet_logo_url_dark ?? "");
  const [defaultEmailSignature, setDefaultEmailSignature] = useState(
    settings?.default_email_signature ?? ""
  );
  const [invoiceFooterNotes, setInvoiceFooterNotes] = useState(
    settings?.invoice_footer_notes ?? ""
  );

  // Storefront customization fields
  const [heroTagline, setHeroTagline] = useState(settings?.hero_tagline ?? "");
  const [aboutHeadline, setAboutHeadline] = useState(settings?.about_headline ?? "");
  const [aboutSubheadline, setAboutSubheadline] = useState(settings?.about_subheadline ?? "");
  const [customFooterText, setCustomFooterText] = useState(settings?.custom_footer_text ?? "");
  const [showWholesaleLink, setShowWholesaleLink] = useState(settings?.show_wholesale_link ?? true);
  const [showZipSearch, setShowZipSearch] = useState(settings?.show_zip_search ?? true);
  const [showSchedulePdf, setShowSchedulePdf] = useState(settings?.show_schedule_pdf ?? true);
  const [showTextAlerts, setShowTextAlerts] = useState(settings?.show_text_alerts ?? false);
  const [schedulePdfNotes, setSchedulePdfNotes] = useState(settings?.schedule_pdf_notes ?? "");
  const [heroImageUrl, setHeroImageUrl] = useState(settings?.hero_image_url ?? "");
  const [brandPrimaryColor, setBrandPrimaryColor] = useState(settings?.brand_primary_color ?? "#16a34a");
  const [brandSecondaryColor, setBrandSecondaryColor] = useState(settings?.brand_secondary_color ?? "#f5f5f4");
  const [brandBgColor, setBrandBgColor] = useState(settings?.brand_bg_color ?? "#fafaf9");
  const [brandTextColor, setBrandTextColor] = useState(settings?.brand_text_color ?? "#1c1917");
  // Tax settings
  const [collectSalesTax, setCollectSalesTax] = useState(settings?.collect_sales_tax ?? false);
  const [nexusStates, setNexusStates] = useState<string[]>(settings?.nexus_states ?? ["CO"]);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Reload settings when brand changes (platform admin)
  useEffect(() => {
    if (!isPlatformAdmin) return;
    setLoading(true);
    getBrandSettings(activeBrandId).then((result) => {
      setLoading(false);
      if (result.success && result.settings) {
        const s = result.settings;
        setLegalBusinessName(s.legal_business_name ?? "");
        setPhone(s.phone ?? "");
        setEmail(s.email ?? "");
        setWebsiteUrl(s.website_url ?? "");
        setStreetAddress(s.street_address ?? "");
        setCity(s.city ?? "");
        setState(s.state ?? "");
        setPostalCode(s.postal_code ?? "");
        setCountry(s.country ?? "US");
        setLogoUrl(s.logo_url ?? "");
        setLogoUrlDark(s.logo_url_dark ?? "");
        setOlatheSweetLogoUrl(s.olathe_sweet_logo_url ?? "");
        setOlatheSweetLogoUrlDark(s.olathe_sweet_logo_url_dark ?? "");
        setDefaultEmailSignature(s.default_email_signature ?? "");
        setInvoiceFooterNotes(s.invoice_footer_notes ?? "");
        setHeroTagline(s.hero_tagline ?? "");
        setAboutHeadline(s.about_headline ?? "");
        setAboutSubheadline(s.about_subheadline ?? "");
        setCustomFooterText(s.custom_footer_text ?? "");
        setShowWholesaleLink(s.show_wholesale_link ?? true);
        setShowZipSearch(s.show_zip_search ?? true);
        setShowSchedulePdf(s.show_schedule_pdf ?? true);
        setShowTextAlerts(s.show_text_alerts ?? false);
        setSchedulePdfNotes(s.schedule_pdf_notes ?? "");
        setHeroImageUrl(s.hero_image_url ?? "");
        setBrandPrimaryColor(s.brand_primary_color ?? "#16a34a");
        setBrandSecondaryColor(s.brand_secondary_color ?? "#f5f5f4");
        setBrandBgColor(s.brand_bg_color ?? "#fafaf9");
        setBrandTextColor(s.brand_text_color ?? "#1c1917");
        setCollectSalesTax(s.collect_sales_tax ?? false);
        setNexusStates(s.nexus_states ?? ["CO"]);
        setActiveBrandName(s.brand_name ?? "");
      } else {
        setLegalBusinessName("");
        setPhone("");
        setEmail("");
        setWebsiteUrl("");
        setStreetAddress("");
        setCity("");
        setState("");
        setPostalCode("");
        setCountry("US");
        setLogoUrl("");
        setLogoUrlDark("");
        setOlatheSweetLogoUrl("");
        setOlatheSweetLogoUrlDark("");
        setDefaultEmailSignature("");
        setInvoiceFooterNotes("");
        setHeroTagline("");
        setAboutHeadline("");
        setAboutSubheadline("");
        setCustomFooterText("");
        setShowWholesaleLink(true);
        setShowZipSearch(true);
        setShowSchedulePdf(true);
        setShowTextAlerts(false);
        setSchedulePdfNotes("");
        setHeroImageUrl("");
        setBrandPrimaryColor("#16a34a");
        setBrandSecondaryColor("#f5f5f4");
        setBrandBgColor("#fafaf9");
        setBrandTextColor("#1c1917");
        setCollectSalesTax(false);
        setNexusStates(["CO"]);
      }
    });
  }, [activeBrandId, isPlatformAdmin]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    const result = await saveBrandSettings({
      brandId: activeBrandId,
      legalBusinessName: legalBusinessName || undefined,
      phone: phone || undefined,
      email: email || undefined,
      websiteUrl: websiteUrl || undefined,
      streetAddress: streetAddress || undefined,
      city: city || undefined,
      state: state || undefined,
      postalCode: postalCode || undefined,
      country: country || undefined,
      logoUrl: logoUrl || undefined,
      logoUrlDark: logoUrlDark || undefined,
      olatheSweetLogoUrl: olatheSweetLogoUrl || undefined,
      olatheSweetLogoUrlDark: olatheSweetLogoUrlDark || undefined,
      defaultEmailSignature: defaultEmailSignature || undefined,
      invoiceFooterNotes: invoiceFooterNotes || undefined,
      heroTagline: heroTagline || undefined,
      aboutHeadline: aboutHeadline || undefined,
      aboutSubheadline: aboutSubheadline || undefined,
      customFooterText: customFooterText || undefined,
      showWholesaleLink: showWholesaleLink,
      showZipSearch: showZipSearch,
      showSchedulePdf: showSchedulePdf,
      showTextAlerts: showTextAlerts,
      schedulePdfNotes: schedulePdfNotes || undefined,
      heroImageUrl: heroImageUrl || undefined,
      brandPrimaryColor: brandPrimaryColor || undefined,
      brandSecondaryColor: brandSecondaryColor || undefined,
      brandBgColor: brandBgColor || undefined,
      brandTextColor: brandTextColor || undefined,
      collectSalesTax,
      nexusStates,
    });

    setSaving(false);
    if (!result.success) {
      setError(result.error ?? "Failed to save");
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-8">
      {/* Platform admin brand picker */}
      {isPlatformAdmin && brands.length > 0 && (
        <AdminInput label="Brand" helpText={`Viewing ${activeBrandName}`}>
          <AdminSelect
            value={activeBrandId}
            onChange={(e) => setActiveBrandId(e.target.value)}
            options={brands.map((b) => ({ value: b.id, label: b.name }))}
          />
        </AdminInput>
      )}

      {error && (
        <div className="rounded-xl bg-red-950/50 border border-red-800 p-4 text-sm text-red-300">{error}</div>
      )}
      {saved && (
        <div className="rounded-xl bg-green-950/50 border border-green-800 p-4 text-sm text-green-300">
          Brand settings saved.
        </div>
      )}

      {/* Company Info */}
      <div className="space-y-5 rounded-xl border border-zinc-700 p-5">
        <div>
          <h3 className="font-semibold text-zinc-100">Company Information</h3>
          <p className="mt-1 text-sm text-zinc-400">
            Primary contact and business details for this brand.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <AdminInput label="Legal Business Name">
            <AdminTextInput
              value={legalBusinessName}
              onChange={(e) => setLegalBusinessName(e.target.value)}
              placeholder="Tuxedo Corn LLC"
            />
          </AdminInput>
          <AdminInput label="Phone">
            <AdminTextInput
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(772) 555-0100"
            />
          </AdminInput>
          <AdminInput label="Email">
            <AdminTextInput
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="orders@tuxedocorn.com"
            />
          </AdminInput>
          <AdminInput label="Website">
            <AdminTextInput
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://tuxedocorn.com"
            />
          </AdminInput>
        </div>
      </div>

      {/* Address */}
      <div className="space-y-5 rounded-xl border border-zinc-700 p-5">
        <div>
          <h3 className="font-semibold text-zinc-100">Business Address</h3>
          <p className="mt-1 text-sm text-zinc-400">
            Used on invoices and shipping labels.
          </p>
        </div>

        <div className="space-y-4">
          <AdminInput label="Street Address">
            <AdminTextInput
              value={streetAddress}
              onChange={(e) => setStreetAddress(e.target.value)}
              placeholder="1234 Farm Road"
            />
          </AdminInput>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="col-span-2">
              <AdminInput label="City">
                <AdminTextInput
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Stuart"
                />
              </AdminInput>
            </div>
            <AdminInput label="State">
              <AdminTextInput
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="FL"
                maxLength={2}
              />
            </AdminInput>
            <AdminInput label="ZIP / Postal Code">
              <AdminTextInput
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder="34994"
              />
            </AdminInput>
          </div>
          <AdminInput label="Country">
            <AdminSelect
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              options={[
                { value: "US", label: "United States" },
                { value: "CA", label: "Canada" },
              ]}
            />
          </AdminInput>
        </div>
      </div>

      {/* Brand Logos */}
      <div className="space-y-5 rounded-xl border border-zinc-700 p-5">
        <div>
          <h3 className="font-semibold text-zinc-100">Brand Logos</h3>
          <p className="mt-1 text-sm text-zinc-400">
            Upload your brand logos to Supabase Storage. Recommended: 1200×400px max, 5MB max (ideally under 2MB for faster loading).
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Primary Logo */}
          <LogoUploadField
            label="Primary Brand Logo"
            hint="Light backgrounds — invoices, email headers, storefront header"
            value={logoUrl}
            previewBg="bg-zinc-800"
            brandId={activeBrandId}
            onUpload={(url) => setLogoUrl(url)}
          />

          {/* Dark Logo */}
          <LogoUploadField
            label="Dark Background Logo"
            hint="Dark backgrounds — storefront nav on dark header"
            value={logoUrlDark}
            previewBg="bg-zinc-900"
            brandId={activeBrandId}
            onUpload={(url) => setLogoUrlDark(url)}
            isDark
          />
        </div>

        {/* Olathe Sweet Logos — two variants */}
        <div className="mt-2">
          <p className="text-sm font-semibold text-zinc-200 mb-4">Olathe Sweet™ Logo</p>
          <p className="text-xs text-zinc-400 mb-4">
            The mountain &amp; wagon wheel mark — use the light version on dark backgrounds, dark/white version on light backgrounds. Shown in hero, About page, and product cards.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <LogoUploadField
              label="Olathe Sweet™ — Dark/White"
              hint="Works on light backgrounds (stone, white)"
              value={olatheSweetLogoUrl}
              previewBg="bg-zinc-700"
              brandId={activeBrandId}
              onUpload={(url) => setOlatheSweetLogoUrl(url)}
              isOlatheSweetLight
            />
            <LogoUploadField
              label="Olathe Sweet™ — Transparent"
              hint="Works on dark backgrounds (hero, dark sections)"
              value={olatheSweetLogoUrlDark}
              previewBg="bg-zinc-900"
              brandId={activeBrandId}
              onUpload={(url) => setOlatheSweetLogoUrlDark(url)}
              isOlatheSweetDark
            />
          </div>
        </div>
      </div>

      {/* Email & Invoice branding */}
      <div className="space-y-5 rounded-xl border border-zinc-700 p-5">
        <div>
          <h3 className="font-semibold text-zinc-100">Email & Invoice Branding</h3>
          <p className="mt-1 text-sm text-zinc-400">
            Used in email signatures, invoice footers, and customer-facing documents.
          </p>
        </div>

        <AdminInput 
          label="Default Email Signature"
          helpText="Appears at the bottom of all outbound emails. Supports line breaks."
        >
          <AdminTextarea
            value={defaultEmailSignature}
            onChange={(e) => setDefaultEmailSignature(e.target.value)}
            rows={3}
            placeholder={"The Tuxedo Corn Team\norders@tuxedocorn.com | (772) 555-0100\nFresh from Florida since 1987"}
          />
        </AdminInput>

        <AdminInput 
          label="Invoice Footer Notes"
          helpText="Printed at the bottom of invoices and order confirmations."
        >
          <AdminTextarea
            value={invoiceFooterNotes}
            onChange={(e) => setInvoiceFooterNotes(e.target.value)}
            rows={2}
            placeholder={"Thank you for your order! Pickup available at our farm stand.\nQuestions? Call (772) 555-0100 or email orders@tuxedocorn.com"}
          />
        </AdminInput>
      </div>

      {/* Storefront Customization */}
      <div className="space-y-5 rounded-xl border border-zinc-700 p-5">
        <div>
          <h3 className="font-semibold text-zinc-100">Storefront Customization</h3>
          <p className="mt-1 text-sm text-zinc-400">
            Controls what appears on your public storefront homepage.
          </p>
        </div>

        <AdminInput label="Hero Tagline" helpText="Subtitle below the brand name in the hero section.">
          <AdminTextInput
            value={heroTagline}
            onChange={(e) => setHeroTagline(e.target.value)}
            placeholder="Fresh citrus delivered to stops near you."
          />
        </AdminInput>

        <AdminInput 
          label="Hero Image URL"
          helpText="Full-width hero background image. Recommended: 1600×600px, under 1MB. Paste a public image URL. For Tuxedo Corn: corn field photo. For IRD: citrus orchard."
        >
          <AdminTextInput
            type="url"
            value={heroImageUrl}
            onChange={(e) => setHeroImageUrl(e.target.value)}
            placeholder="https://cdn.example.com/hero-corn-field.jpg"
          />
        </AdminInput>
        {heroImageUrl && (
          <div className="relative mt-2 rounded-lg overflow-hidden border border-zinc-700 h-32">
            <NextImage src={heroImageUrl} alt="Hero preview" fill style={{ objectFit: "cover" }} />
          </div>
        )}

        <AdminInput label="About Page Headline">
          <AdminTextInput
            value={aboutHeadline}
            onChange={(e) => setAboutHeadline(e.target.value)}
            placeholder="Our Story"
          />
        </AdminInput>

        <AdminInput label="About Page Subheadline">
          <AdminTextInput
            value={aboutSubheadline}
            onChange={(e) => setAboutSubheadline(e.target.value)}
            placeholder="Growing citrus in the Indian River region since 1985."
          />
        </AdminInput>

        <AdminInput label="Custom Footer Text" helpText="Appears above the copyright line in the brand footer.">
          <AdminTextarea
            value={customFooterText}
            onChange={(e) => setCustomFooterText(e.target.value)}
            rows={2}
            placeholder="Fresh from Florida — Ships Sept through May"
          />
        </AdminInput>
      </div>

      {/* Brand Colors */}
      <div className="space-y-5 rounded-xl border border-zinc-700 p-5">
        <div>
          <h3 className="font-semibold text-zinc-100">Brand Colors</h3>
          <p className="mt-1 text-sm text-zinc-400">
            Customize your storefront accent and background colors. Use hex codes (e.g. #e11d48).
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Primary Accent</label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={brandPrimaryColor}
                onChange={(e) => setBrandPrimaryColor(e.target.value)}
                className="w-10 h-10 rounded-lg border border-zinc-600 cursor-pointer"
              />
              <input
                type="text"
                value={brandPrimaryColor}
                onChange={(e) => setBrandPrimaryColor(e.target.value)}
                className="flex-1 rounded-xl border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-500 font-mono"
                placeholder="#16a34a"
              />
            </div>
            <p className="mt-1 text-xs text-zinc-500">Buttons, badges, links</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Text Color</label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={brandTextColor}
                onChange={(e) => setBrandTextColor(e.target.value)}
                className="w-10 h-10 rounded-lg border border-zinc-600 cursor-pointer"
              />
              <input
                type="text"
                value={brandTextColor}
                onChange={(e) => setBrandTextColor(e.target.value)}
                className="flex-1 rounded-xl border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-500 font-mono"
                placeholder="#1c1917"
              />
            </div>
            <p className="mt-1 text-xs text-zinc-500">Headlines, body text</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Background Color</label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={brandBgColor}
                onChange={(e) => setBrandBgColor(e.target.value)}
                className="w-10 h-10 rounded-lg border border-zinc-600 cursor-pointer"
              />
              <input
                type="text"
                value={brandBgColor}
                onChange={(e) => setBrandBgColor(e.target.value)}
                className="flex-1 rounded-xl border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-500 font-mono"
                placeholder="#fafaf9"
              />
            </div>
            <p className="mt-1 text-xs text-zinc-500">Page background (light mode)</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Secondary Accent</label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={brandSecondaryColor}
                onChange={(e) => setBrandSecondaryColor(e.target.value)}
                className="w-10 h-10 rounded-lg border border-zinc-600 cursor-pointer"
              />
              <input
                type="text"
                value={brandSecondaryColor}
                onChange={(e) => setBrandSecondaryColor(e.target.value)}
                className="flex-1 rounded-xl border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-500 font-mono"
                placeholder="#f5f5f4"
              />
            </div>
            <p className="mt-1 text-xs text-zinc-500">Hover states, highlights</p>
          </div>
        </div>

        <div className="mt-3 p-4 rounded-xl bg-zinc-800 border border-zinc-700">
          <p className="text-xs text-zinc-400 mb-2 font-medium">Preview</p>
          <div className="flex gap-3 items-center flex-wrap">
            <div className="flex gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: brandPrimaryColor }}>
                A
              </div>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold border border-zinc-600" style={{ backgroundColor: brandBgColor, color: brandTextColor }}>
                A
              </div>
              <div className="w-8 h-8 rounded-lg border border-zinc-600" style={{ backgroundColor: brandSecondaryColor }} />
            </div>
            <div className="h-8 w-px bg-zinc-600" />
            <div className="flex gap-1.5">
              <div className="px-3 py-1.5 rounded-lg text-white text-xs font-semibold" style={{ backgroundColor: brandPrimaryColor }}>
                Button
              </div>
              <div className="px-3 py-1.5 rounded-lg text-xs font-semibold border" style={{ borderColor: brandPrimaryColor, color: brandPrimaryColor }}>
                Outline
              </div>
              <div className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ backgroundColor: brandSecondaryColor, color: brandTextColor }}>
                Secondary
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tax Settings */}
      <div className="space-y-5 rounded-xl border border-amber-700 bg-amber-950/30 p-5">
        <div>
          <h3 className="font-semibold text-amber-200">Tax Settings</h3>
          <p className="mt-1 text-sm text-amber-300/70">
            Configure automatic sales tax collection via Stripe Tax. Tax is only calculated for ship orders shipping to your nexus states.
          </p>
        </div>

        <FeatureToggle
          label="Collect Sales Tax"
          description="Automatically calculate and collect sales tax for ship orders via Stripe Tax."
          checked={collectSalesTax}
          onChange={setCollectSalesTax}
        />

        {collectSalesTax && (
          <div>
            <label className="block text-sm font-medium text-amber-200 mb-1">
              Nexus States
            </label>
            <p className="mt-1 text-xs text-amber-300/60 mb-2">
              States where you have tax nexus (physical presence). Stripe Tax will calculate tax for ship orders to these states.
            </p>
            <NexusStateInput
              value={nexusStates}
              onChange={setNexusStates}
            />
          </div>
        )}
      </div>

      {/* Feature Toggles */}
      <div className="space-y-5 rounded-xl border border-zinc-700 p-5">
        <div>
          <h3 className="font-semibold text-zinc-100">Feature Toggles</h3>
          <p className="mt-1 text-sm text-zinc-400">
            Show or hide features on your public storefront.
          </p>
        </div>

        <div className="space-y-4">
          <FeatureToggle
            label="Wholesale Portal link"
            description="Show the green Wholesale Portal banner on the homepage and nav link."
            checked={showWholesaleLink}
            onChange={setShowWholesaleLink}
          />
          <FeatureToggle
            label="Zip Code Search"
            description="Show the ZIP code search box on the IRD homepage."
            checked={showZipSearch}
            onChange={setShowZipSearch}
          />
          <FeatureToggle
            label="Schedule PDF Download"
            description="Show the 'Download Schedule PDF' button on the stops section."
            checked={showSchedulePdf}
            onChange={setShowSchedulePdf}
          />
          <FeatureToggle
            label="Text Alerts Signup"
            description="Show a text alert signup section on the homepage."
            checked={showTextAlerts}
            onChange={setShowTextAlerts}
          />
        </div>

        <AdminInput label="Schedule PDF Footer Notes" helpText="Printed at the bottom of the generated schedule PDF.">
          <AdminTextarea
            value={schedulePdfNotes}
            onChange={(e) => setSchedulePdfNotes(e.target.value)}
            rows={1}
            placeholder="All orders prepaid. No refunds on unpicked orders."
          />
        </AdminInput>
      </div>

      {loading ? (
        <div className="flex items-center gap-3 text-zinc-400">
          <div className="h-5 w-5 rounded-full border-2 border-zinc-500 border-t-transparent animate-spin" />
          Loading settings...
        </div>
      ) : (
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-900/300 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Brand Settings"}
        </button>
      )}
    </form>
  );
}

// ── Feature Toggle Component ─────────────────────────────────────────────────

function FeatureToggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-3">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
          checked ? "bg-green-600" : "bg-zinc-600"
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-zinc-900 transition-transform ${
            checked ? "translate-x-4" : "translate-x-1"
          }`}
        />
      </button>
      <div>
        <p className="text-sm font-medium text-zinc-200">{label}</p>
        <p className="text-xs text-zinc-400">{description}</p>
      </div>
    </div>
  );
}

// ── Nexus States Input Component ──────────────────────────────────────────────

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
];

function NexusStateInput({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const [input, setInput] = useState("");

  function addState(code: string) {
    const upper = code.toUpperCase().trim();
    if (US_STATES.includes(upper) && !value.includes(upper)) {
      onChange([...value, upper]);
    }
    setInput("");
  }

  function removeState(code: string) {
    onChange(value.filter((s) => s !== code));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (input.trim()) addState(input);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {value.map((code) => (
          <span
            key={code}
            className="inline-flex items-center gap-1 rounded-lg bg-amber-600 text-amber-050 px-2 py-1 text-xs font-semibold"
          >
            {code}
            <button
              type="button"
              onClick={() => removeState(code)}
              className="hover:text-amber-200"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <AdminInput label="" className="flex-1">
          <AdminTextInput
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type state code (e.g. CO) and press Enter"
            maxLength={2}
          />
        </AdminInput>
        <AdminInput label="" className="w-32">
          <AdminSelect
            value=""
            onChange={(e) => { if (e.target.value) addState(e.target.value); }}
            options={[
              { value: "", label: "Add state" },
              ...US_STATES.filter((s) => !value.includes(s)).map((s) => ({ value: s, label: s })),
            ]}
          />
        </AdminInput>
      </div>
    </div>
  );
}

// ── Logo Upload Component ────────────────────────────────────────────────────

type LogoUploadFieldProps = {
  label: string;
  hint: string;
  value: string;
  previewBg: string;
  brandId: string;
  onUpload: (url: string) => void;
  isDark?: boolean;
  isOlatheSweetLight?: boolean;
  isOlatheSweetDark?: boolean;
};

export function LogoUploadField({
  label,
  hint,
  value,
  previewBg,
  brandId,
  onUpload,
  isDark = false,
  isOlatheSweetLight = false,
  isOlatheSweetDark = false,
}: LogoUploadFieldProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError(null);
    setUploading(true);
    let result;
    if (isOlatheSweetLight) {
      result = await uploadOlatheSweetLogo(brandId, file);
    } else if (isOlatheSweetDark) {
      result = await uploadOlatheSweetLogoDark(brandId, file);
    } else {
      result = await uploadBrandLogo(brandId, file, isDark);
    }
    setUploading(false);
    if (result.success) {
      onUpload(result.logoUrl);
    } else {
      setError(result.error ?? "Upload failed");
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <div>
      <label className="block text-sm font-medium text-zinc-300 mb-1">{label}</label>
      <p
        className="text-xs text-zinc-500 mb-2"
        dangerouslySetInnerHTML={{ __html: hint }}
      />

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`
          relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 cursor-pointer transition-colors
          ${dragOver ? "border-emerald-500 bg-emerald-950/30" : "border-zinc-600 hover:border-zinc-500 hover:bg-zinc-800/50"}
          ${uploading ? "opacity-50 pointer-events-none" : ""}
        `}
      >
        {uploading ? (
          <>
            <div className="h-5 w-5 rounded-full border-2 border-zinc-500 border-t-transparent animate-spin" />
            <span className="text-sm text-zinc-400">Uploading...</span>
          </>
        ) : value ? (
          <>
            <span className="relative inline-block h-10 w-auto">
              <NextImage src={value} alt={label} fill style={{ objectFit: "contain" }} />
            </span>
            <span className="text-xs text-zinc-400">Click or drop to replace</span>
          </>
        ) : (
          <>
            <svg className="h-8 w-8 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-sm text-zinc-400">Drag & drop or click to upload</span>
            <span className="text-xs text-zinc-500">PNG, JPEG, WebP · 1200×400px max · max 5MB (ideally under 2MB)</span>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="hidden"
          onChange={handleChange}
        />
      </div>

      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}

      {value && (
        <div className={`mt-3 rounded-lg p-3 text-center ${previewBg}`}>
          <p className="text-xs text-zinc-400 mb-2">Preview</p>
          <span className="relative inline-block h-10 w-auto">
            <NextImage src={value} alt={label} fill style={{ objectFit: "contain" }} className="mx-auto" />
          </span>
        </div>
      )}
    </div>
  );
}
