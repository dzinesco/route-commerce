"use client";

import Link from "next/link";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

export type BreadcrumbNavProps = {
  /** Array of breadcrumb items. Last item is the current page (no href). */
  items: BreadcrumbItem[];
  /** Optional brand accent for styling: 'green' (Tuxedo) or 'blue' (Indian River) */
  brandAccent?: "green" | "blue";
  /** Optional additional CSS classes */
  className?: string;
};

/**
 * Breadcrumb navigation component following Apple HIG.
 * Uses semantic <nav> with aria-label and ordered list for accessibility.
 */
export default function BreadcrumbNav({
  items,
  brandAccent = "green",
  className = "",
}: BreadcrumbNavProps) {
  if (!items || items.length === 0) {
    return null;
  }

  const accentColor = brandAccent === "blue"
    ? "text-blue-600 hover:text-blue-700"
    : "text-emerald-600 hover:text-emerald-700";

  const separatorColor = "text-stone-400";

  return (
    <nav
      aria-label="Breadcrumb"
      className={`w-full ${className}`}
    >
      <ol className="flex items-center flex-wrap gap-2 text-sm">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li
              key={index}
              className="flex items-center"
            >
              {index > 0 && (
                <span
                  className={`mx-2 ${separatorColor}`}
                  aria-hidden="true"
                >
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8.25 4.5l7.5 7.5-7.5 7.5"
                    />
                  </svg>
                </span>
              )}

              {isLast ? (
                <span
                  className="font-medium text-stone-700"
                  aria-current="page"
                >
                  {item.label}
                </span>
              ) : item.href ? (
                <Link
                  href={item.href}
                  className={`font-medium transition-colors ${accentColor}`}
                >
                  {item.label}
                </Link>
              ) : (
                <span className={`font-medium ${accentColor}`}>
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}