"use client";

import Link from "next/link";

type PageHeaderProps = {
  breadcrumb?: { label: string; href?: string }[];
  title: string;
  description?: string;
  action?: React.ReactNode;
};

export default function PageHeader({ breadcrumb, title, description, action }: PageHeaderProps) {
  return (
    <div className="mb-8">
      {breadcrumb && breadcrumb.length > 0 && (
        <nav className="flex items-center gap-2 text-xs text-stone-500 mb-4">
          {breadcrumb.map((crumb, i) => (
            <span key={i} className="flex items-center gap-2">
              {crumb.href ? (
                <Link href={crumb.href} className="hover:text-stone-700 transition-colors">
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-stone-600">{crumb.label}</span>
              )}
              {i < breadcrumb.length - 1 && <span>/</span>}
            </span>
          ))}
        </nav>
      )}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-950 tracking-tight">{title}</h1>
          {description && (
            <p className="mt-1.5 text-sm text-stone-500">{description}</p>
          )}
        </div>
        {action && <div>{action}</div>}
      </div>
    </div>
  );
}