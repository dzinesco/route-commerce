"use client";

import Link from "next/link";
import { ReactNode } from "react";

type AdminPageHeaderProps = {
  breadcrumb?: { label: string; href?: string }[];
  title: string;
  description?: string;
  actions?: ReactNode;
};

export default function AdminPageHeader({ breadcrumb, title, description, actions }: AdminPageHeaderProps) {
  return (
    <div className="mb-6">
      {breadcrumb && breadcrumb.length > 0 && (
        <nav className="flex items-center gap-2 text-xs text-[var(--admin-text-muted)] mb-4">
          {breadcrumb.map((item, i) => (
            <span key={i} className="flex items-center gap-2">
              {item.href ? (
                <Link href={item.href} className="hover:text-[var(--admin-text-secondary)] transition-colors">{item.label}</Link>
              ) : (
                <span className="text-[var(--admin-text-secondary)]">{item.label}</span>
              )}
              {i < breadcrumb.length - 1 && <span>/</span>}
            </span>
          ))}
        </nav>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--admin-text-primary)] tracking-tight">{title}</h1>
          {description && <p className="mt-1 text-sm text-[var(--admin-text-muted)]">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-3">{actions}</div>}
      </div>
    </div>
  );
}