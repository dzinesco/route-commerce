"use client";

import Link from "next/link";
import { ReactNode } from "react";

type PageHeaderProps = {
  /** Breadcrumb navigation items */
  breadcrumb?: { label: string; href?: string }[];
  /** Icon displayed before the title */
  icon?: ReactNode;
  /** Main title text */
  title: string;
  /** Optional subtitle/description below the title */
  subtitle?: string;
  /** Optional action buttons/elements to display on the right */
  actions?: ReactNode;
  /** Additional CSS classes */
  className?: string;
};

export default function PageHeader({
  breadcrumb,
  icon,
  title,
  subtitle,
  actions,
  className = "",
}: PageHeaderProps) {
  return (
    <div className={`mb-6 ${className}`}>
      {/* Breadcrumb Navigation */}
      {breadcrumb && breadcrumb.length > 0 && (
        <nav className="flex items-center gap-2 text-xs text-[var(--admin-text-muted)] mb-4">
          {breadcrumb.map((crumb, index) => (
            <span key={index} className="flex items-center gap-2">
              {crumb.href ? (
                <Link 
                  href={crumb.href} 
                  className="hover:text-[var(--admin-text-secondary)] transition-colors duration-150"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-[var(--admin-text-secondary)]">{crumb.label}</span>
              )}
              {index < breadcrumb.length - 1 && (
                <svg className="w-3 h-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              )}
            </span>
          ))}
        </nav>
      )}

      {/* Title Row with Icon and Actions */}
      <div className="flex items-center justify-between">
        {/* Left: Icon + Title + Subtitle */}
        <div className="flex items-center gap-3">
          {icon && (
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[var(--admin-accent-light)] text-[var(--admin-accent)] shadow-[var(--admin-shadow-sm)] transition-transform duration-200 hover:scale-105">
              {icon}
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold text-[var(--admin-text-primary)] tracking-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-0.5 text-xs text-[var(--admin-text-muted)]">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Right: Action Buttons */}
        {actions && (
          <div className="flex items-center gap-3">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}