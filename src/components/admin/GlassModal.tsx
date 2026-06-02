"use client";

import { useEffect } from "react";

type Props = {
  title: string;
  titleIcon?: React.ReactNode;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
};

export default function GlassModal({ title, titleIcon, subtitle, onClose, children, maxWidth = "max-w-lg" }: Props) {
  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-8"
      onClick={handleBackdropClick}
      style={{ backgroundColor: "rgba(60, 56, 37, 0.5)" }}
    >
      {/* Modal card - solid white with shadow for high contrast */}
      <div
        className={`relative w-full ${maxWidth} max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)] md:max-h-[calc(100vh-4rem)] rounded-2xl bg-white shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)] flex flex-col`}
      >
        {/* Subtle top border accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--admin-accent)] to-[var(--admin-accent-hover)] rounded-t-2xl" />

        {/* Header */}
        <div 
          className="flex items-center justify-between px-4 sm:px-6 md:px-8 py-4 sm:py-6 shrink-0"
          style={{ borderBottom: "1px solid var(--admin-border-light)" }}
        >
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {titleIcon && (
              <div 
                className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl shrink-0"
                style={{ backgroundColor: "var(--admin-accent-light)" }}
              >
                {titleIcon}
              </div>
            )}
            <div className="min-w-0">
              <h2 
                className="text-lg sm:text-xl font-semibold text-[var(--admin-text-primary)] truncate" 
                style={{ letterSpacing: "-0.02em" }}
              >
                {title}
              </h2>
              {subtitle && (
                <p className="mt-0.5 text-xs sm:text-sm text-[var(--admin-text-muted)] hidden sm:block">{subtitle}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full transition-all duration-150 shrink-0 ml-2"
            style={{ backgroundColor: "var(--admin-bg-subtle)", color: "var(--admin-text-muted)" }}
          >
            <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content - scrollable */}
        <div className="relative px-4 sm:px-6 md:px-8 py-4 sm:py-6 md:py-8 overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}