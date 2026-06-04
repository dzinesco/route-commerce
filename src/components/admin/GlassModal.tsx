"use client";

import { useEffect } from "react";

type Props = {
  title: string;
  titleIcon?: React.ReactNode;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
  /** Compact mode: tighter padding, smaller title, no accent bar — for dense forms. */
  compact?: boolean;
  /** Optional eyebrow text rendered above the title in compact mode. */
  eyebrow?: string;
};

export default function GlassModal({
  title,
  titleIcon,
  subtitle,
  onClose,
  children,
  maxWidth = "max-w-lg",
  compact = false,
  eyebrow,
}: Props) {
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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6"
      onClick={handleBackdropClick}
      style={{
        backgroundColor: "rgba(60, 56, 37, 0.45)",
        backdropFilter: "blur(2px)",
        WebkitBackdropFilter: "blur(2px)",
      }}
    >
      <div
        className={`relative w-full ${maxWidth} ${
          compact
            ? "max-h-[min(640px,calc(100vh-2rem))]"
            : "max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)] md:max-h-[calc(100vh-4rem)]"
        } rounded-2xl bg-white shadow-[0_25px_50px_-12px_rgba(0,0,0,0.18),0_8px_16px_-4px_rgba(0,0,0,0.05)] flex flex-col overflow-hidden`}
      >
        {/* Accent bar — only for non-compact (compact forms have their own internal accent) */}
        {!compact && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--admin-accent)] to-[var(--admin-accent-hover)] rounded-t-2xl" />
        )}

        {/* Header */}
        <div
          className={`flex items-center justify-between shrink-0 ${
            compact ? "px-5 pt-4 pb-3" : "px-4 sm:px-6 md:px-8 py-4 sm:py-6"
          }`}
          style={{ borderBottom: "1px solid var(--admin-border-light)" }}
        >
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {titleIcon && !compact && (
              <div
                className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl shrink-0"
                style={{ backgroundColor: "var(--admin-accent-light)" }}
              >
                {titleIcon}
              </div>
            )}
            <div className="min-w-0">
              {compact && eyebrow && (
                <p className="ha-eyebrow mb-0.5 truncate">{eyebrow}</p>
              )}
              <h2
                className={`${
                  compact
                    ? "ha-display text-lg truncate"
                    : "text-lg sm:text-xl font-semibold truncate"
                } text-[var(--admin-text-primary)]`}
                style={compact ? undefined : { letterSpacing: "-0.02em" }}
              >
                {title}
              </h2>
              {subtitle && !compact && (
                <p className="mt-0.5 text-xs sm:text-sm text-[var(--admin-text-muted)] hidden sm:block">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className={`flex shrink-0 items-center justify-center rounded-full transition-all duration-150 ml-2 ${
              compact
                ? "h-7 w-7 text-[var(--admin-text-muted)] hover:bg-[var(--admin-bg-subtle)] hover:text-[var(--admin-text-primary)]"
                : "h-8 w-8 sm:h-9 sm:w-9"
            }`}
            style={
              compact
                ? undefined
                : { backgroundColor: "var(--admin-bg-subtle)", color: "var(--admin-text-muted)" }
            }
            aria-label="Close modal"
          >
            <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div
          className={`relative overflow-y-auto flex-1 ${
            compact ? "px-5 pb-5 pt-3" : "px-4 sm:px-6 md:px-8 py-4 sm:py-6 md:py-8"
          }`}
        >
          {children}
        </div>
      </div>
    </div>
  );
}