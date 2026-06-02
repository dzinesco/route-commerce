"use client";

import { ReactNode, CSSProperties } from "react";

type AdminCardProps = {
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
  style?: CSSProperties;
};

export default function AdminCard({ children, className = "", noPadding = false, style }: AdminCardProps) {
  return (
    <div 
      className={`rounded-xl border bg-white shadow-[var(--admin-shadow-sm)] transition-all duration-200 hover:shadow-[var(--admin-shadow-md)] ${noPadding ? "" : "p-4"} ${className}`}
      style={{
        borderColor: 'var(--admin-border)',
        ...style
      }}
    >
      {children}
    </div>
  );
}

type AdminCardHeaderProps = {
  title: string;
  action?: ReactNode;
};

export function AdminCardHeader({ title, action }: AdminCardHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-sm font-bold text-[var(--admin-text-primary)]">{title}</h3>
      {action}
    </div>
  );
}

type AdminCardFooterProps = {
  children: ReactNode;
};

export function AdminCardFooter({ children }: AdminCardFooterProps) {
  return (
    <div className="mt-4 pt-4 border-t border-[var(--admin-border-light)]">{children}</div>
  );
}