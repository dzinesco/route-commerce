import Link from "next/link";
import Image from "next/image";

export default function StorefrontFooter({
  brandName,
  brandSlug,
  logoUrl,
  logoUrlDark,
  customFooterText,
  contactEmail,
  contactPhone,
  isAdmin,
  brandAccent = "green",
}: {
  brandName: string;
  brandSlug: string;
  logoUrl?: string | null;
  logoUrlDark?: string | null;
  customFooterText?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  isAdmin?: boolean;
  brandAccent?: "green" | "orange" | "blue";
}) {
  const accentClass =
    brandAccent === "orange"
      ? "text-orange-500 hover:text-orange-600"
      : brandAccent === "blue"
      ? "text-blue-500 hover:text-blue-600"
      : "text-emerald-600 hover:text-emerald-700";

  const subscribeBtnClass =
    brandAccent === "blue"
      ? "bg-blue-600 hover:bg-blue-700"
      : brandAccent === "orange"
      ? "bg-orange-600 hover:bg-orange-700"
      : "bg-emerald-600 hover:bg-emerald-700";

  return (
    <>
      {/* Newsletter band */}
      <div className="bg-stone-950 border-t border-stone-800">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <div className="flex flex-col items-center justify-between gap-8 md:flex-row">
            <div className="text-center md:text-left">
              <p className="text-xs font-semibold uppercase tracking-widest text-stone-500 mb-2">
                Stay in the loop
              </p>
              <h3 className="text-xl font-light text-stone-400">
                Harvest updates, new stops &amp; seasonal news
              </h3>
            </div>
            <form
              className="flex w-full shrink-0 gap-0 sm:w-auto"
              onSubmit={(e) => e.preventDefault()}
            >
              <input
                type="email"
                placeholder="your@email.com"
                aria-label="Email address"
                className="w-full sm:w-52 lg:w-64 rounded-l-xl sm:rounded-l-lg border border-stone-600 bg-stone-900 px-4 py-3 sm:py-2.5 text-sm text-stone-200 placeholder-stone-500 focus:border-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400/50 transition-all duration-200"
              />
              <button
                type="submit"
                className={`rounded-r-xl sm:rounded-r-lg ${subscribeBtnClass} px-4 sm:px-5 py-3 sm:py-2.5 text-sm font-medium text-white transition-all duration-200 active:scale-95 hover:-translate-y-0.5`}
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>
      </div>

      <footer className="border-t border-stone-200 bg-stone-50">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="grid gap-12 md:grid-cols-4">

            {/* Brand info + story */}
            <div className="md:col-span-1">
              {logoUrlDark ? (
                <span className="relative inline-block h-8 w-[140px] mb-5">
                  <Image src={logoUrlDark} alt={brandName} fill style={{ objectFit: "contain", objectPosition: "left" }} />
                </span>
              ) : logoUrl ? (
                <span className="relative inline-block h-8 w-[140px] mb-5">
                  <Image src={logoUrl} alt={brandName} fill style={{ objectFit: "contain", objectPosition: "left" }} />
                </span>
              ) : (
                <p className="text-lg font-bold text-stone-950 mb-3">{brandName}</p>
              )}
              <p className="text-sm text-stone-500 leading-relaxed mb-5">
                Fresh from the farm to your family. We grow and deliver premium produce with care you can taste and trust.
              </p>
              {/* Social links */}
              <div className="flex items-center gap-4">
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 transition-colors ${accentClass}`}
                  aria-label="Instagram"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                </a>
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 transition-colors ${accentClass}`}
                  aria-label="Facebook"
                >
                  <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </a>
              </div>
              {contactPhone && (
                <a
                  href={`tel:${contactPhone.replace(/\D/g, "")}`}
                  className="mt-5 block text-sm text-stone-500 hover:text-stone-900 transition-colors"
                >
                  {contactPhone}
                </a>
              )}
              {contactEmail && (
                <a
                  href={`mailto:${contactEmail}`}
                  className="mt-1.5 block text-sm text-stone-500 hover:text-stone-900 transition-colors"
                >
                  {contactEmail}
                </a>
              )}
            </div>

            {/* Navigation */}
            <div>
              <p className="mb-5 text-xs font-semibold uppercase tracking-widest text-stone-400">Shop</p>
              <nav className="space-y-3">
                <Link href={`/${brandSlug}`} className="block text-sm text-stone-500 hover:text-stone-900 transition-colors">
                  Home
                </Link>
                <Link href={`/${brandSlug}#stops`} className="block text-sm text-stone-500 hover:text-stone-900 transition-colors">
                  Upcoming Stops
                </Link>
                <Link href={`/${brandSlug}#products`} className="block text-sm text-stone-500 hover:text-stone-900 transition-colors">
                  Products
                </Link>
                <Link href={`/${brandSlug}/about`} className="block text-sm text-stone-500 hover:text-stone-900 transition-colors">
                  Our Story
                </Link>
              </nav>
            </div>

            {/* Help */}
            <div>
              <p className="mb-5 text-xs font-semibold uppercase tracking-widest text-stone-400">Help</p>
              <nav className="space-y-3">
                <Link href="/cart" className="block text-sm text-stone-500 hover:text-stone-900 transition-colors">
                  Cart
                </Link>
                <Link href="/wholesale/login" className="block text-sm text-stone-500 hover:text-stone-900 transition-colors">
                  Wholesale Portal
                </Link>
                <Link href={`/${brandSlug}/contact`} className="block text-sm text-stone-500 hover:text-stone-900 transition-colors">
                  Contact Us
                </Link>
                <Link href={`/${brandSlug}/faq`} className="block text-sm text-stone-500 hover:text-stone-900 transition-colors">
                  FAQ
                </Link>
              </nav>
            </div>

            {/* Fresh & contact */}
            <div>
              <p className="mb-5 text-xs font-semibold uppercase tracking-widest text-stone-400">Fresh &amp; Local</p>
              <nav className="space-y-3">
                <Link href={`/${brandSlug}/about`} className="block text-sm text-stone-500 hover:text-stone-900 transition-colors">
                  Our Farm
                </Link>
                <Link href={`/${brandSlug}#products`} className="block text-sm text-stone-500 hover:text-stone-900 transition-colors">
                  What's in Season
                </Link>
                <Link href={`/${brandSlug}/contact`} className="block text-sm text-stone-500 hover:text-stone-900 transition-colors">
                  Visit Us
                </Link>
                <Link href="/wholesale/register" className="block text-sm text-stone-500 hover:text-stone-900 transition-colors">
                  Sell With Us
                </Link>
              </nav>
            </div>
          </div>

          {customFooterText && (
            <p className="mt-12 text-sm text-stone-500 leading-relaxed max-w-2xl">{customFooterText}</p>
          )}

          <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-stone-200 pt-8 sm:flex-row">
            <p className="text-sm text-stone-400">
              © {new Date().getFullYear()} {brandName}. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              {isAdmin && (
                <Link href="/admin" className="text-sm text-stone-400 hover:text-stone-600 transition-colors">
                  Admin Dashboard
                </Link>
              )}
              <Link href="/privacy-policy" className="text-sm text-stone-400 hover:text-stone-600 transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms-and-conditions" className="text-sm text-stone-400 hover:text-stone-600 transition-colors">
                Terms &amp; Conditions
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
