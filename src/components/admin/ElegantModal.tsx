"use client";

import { useEffect } from "react";

type Props = {
  title: string;
  titleIcon?: React.ReactNode;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
  variant?: "default" | "elegant";
};

export default function ElegantModal({ title, titleIcon, subtitle, onClose, children, maxWidth = "max-w-lg", variant = "default" }: Props) {
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

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const isElegant = variant === "elegant";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-8"
      onClick={handleBackdropClick}
      style={{ backgroundColor: "rgba(60, 56, 37, 0.5)" }}
    >
      <div
        className={`relative w-full ${maxWidth} max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)] md:max-h-[calc(100vh-4rem)] rounded-2xl bg-white shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)] flex flex-col ${isElegant ? "border border-stone-200/60" : ""}`}
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-600 to-amber-500 rounded-t-2xl" />

        <div className={`flex items-center justify-between px-6 sm:px-8 py-5 shrink-0 ${isElegant ? "border-b border-stone-100" : ""}`}>
          <div className="flex items-center gap-3 min-w-0">
            {titleIcon && (
              <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg shrink-0 bg-amber-50">
                {titleIcon}
              </div>
            )}
            <div className="min-w-0">
              {isElegant ? (
                <h2 className="text-sm font-normal tracking-wide text-stone-500 uppercase" style={{ fontFamily: "Georgia, serif" }}>
                  {title}
                </h2>
              ) : (
                <h2 className="text-lg sm:text-xl font-semibold text-stone-800 truncate" style={{ letterSpacing: "-0.02em" }}>
                  {title}
                </h2>
              )}
              {subtitle && (
                <p className={`mt-0.5 text-sm text-stone-400 hidden sm:block ${isElegant ? "font-normal" : ""}`}>{subtitle}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full transition-all duration-150 shrink-0 ml-2 hover:bg-stone-100 text-stone-500"
          >
            <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="relative px-6 sm:px-8 py-6 overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}