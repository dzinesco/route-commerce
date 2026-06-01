import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="glass border-t border-white/10 mt-auto">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-zinc-500">
            © {new Date().getFullYear()} Route Commerce. All rights reserved.
          </p>
          <nav className="flex gap-6 text-sm text-zinc-500">
            <Link href="/privacy-policy" className="hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms-and-conditions" className="hover:text-white transition-colors">
              Terms & Conditions
            </Link>
            <a
              href="https://cielohermosa.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              Powered by Route Commerce
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
}