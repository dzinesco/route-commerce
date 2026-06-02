"use client";

import { ReactNode } from "react";

type AdminLayoutProps = {
  children: ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  className?: string;
};

const maxWidthClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-6xl",
  full: "max-w-full",
};

export default function AdminLayout({ children, maxWidth = "2xl", className = "" }: AdminLayoutProps) {
  return (
    <main className="min-h-screen admin-section" style={{ backgroundColor: "var(--admin-bg)" }}>
      <div className={`mx-auto px-4 sm:px-6 py-6 sm:py-10 ${maxWidthClasses[maxWidth]} ${className}`}>
        {children}
      </div>
    </main>
  );
}