"use client";

import { useEffect } from "react";

type Props = {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
};

export default function AdminModal({ title, subtitle, onClose, children, maxWidth = "max-w-md" }: Props) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{ backgroundColor: "rgba(60, 56, 37, 0.5)" }}
    >
      <div
        className={`relative w-full ${maxWidth} rounded-2xl`}
        style={{
          backgroundColor: "var(--admin-card-bg)",
          border: "1px solid var(--admin-border)",
          boxShadow: "0 25px 50px -12px rgba(60, 56, 37, 0.35), 0 12px 24px -8px rgba(60, 56, 37, 0.2)",
        }}
      >
        {/* Accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl overflow-hidden"
          style={{ background: "linear-gradient(90deg, var(--admin-accent) 0%, var(--admin-accent-hover) 100%)" }}
        />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: "1px solid var(--admin-border-light)" }}>
          <div>
            <h2 className="text-xl font-semibold text-[var(--admin-text-primary)]" style={{ letterSpacing: "-0.02em" }}>{title}</h2>
            {subtitle && <p className="mt-0.5 text-sm text-[var(--admin-text-muted)]">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full transition-all hover:bg-[var(--admin-bg-subtle)]"
            style={{ backgroundColor: "rgba(60, 56, 37, 0.04)" }}
          >
            <svg className="h-5 w-5 text-[var(--admin-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}