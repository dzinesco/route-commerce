"use client";

import { ReactNode } from "react";

type AdminEmptyStateProps = {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export default function AdminEmptyState({ 
  icon, 
  title, 
  description, 
  action,
  className = "" 
}: AdminEmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 px-4 text-center ${className}`}>
      {icon ? (
        <div className="mb-4 text-[var(--admin-text-muted)] opacity-70">{icon}</div>
      ) : (
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--admin-bg-subtle)] transition-transform duration-200 hover:scale-105">
          <svg className="h-8 w-8 text-[var(--admin-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        </div>
      )}
      <h3 className="text-lg font-semibold text-[var(--admin-text-primary)]">{title}</h3>
      {description && <p className="mt-2 text-sm text-[var(--admin-text-muted)] max-w-sm leading-relaxed">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}