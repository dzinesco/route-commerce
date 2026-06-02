"use client";

import { useToast, Toast as ToastType } from "./Toast";
import { useEffect } from "react";

// Icons for each toast type
const ToastIcons = {
  success: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  error: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  info: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  warning: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
};

const toastStyles: Record<ToastType["type"], { bg: string; border: string; icon: string; text: string }> = {
  success: {
    bg: "bg-white",
    border: "border-[var(--admin-accent)]",
    icon: "text-[var(--admin-accent)]",
    text: "text-[var(--admin-text-primary)]",
  },
  error: {
    bg: "bg-white",
    border: "border-[var(--admin-danger)]",
    icon: "text-[var(--admin-danger)]",
    text: "text-[var(--admin-text-primary)]",
  },
  info: {
    bg: "bg-white",
    border: "border-blue-500",
    icon: "text-blue-500",
    text: "text-[var(--admin-text-primary)]",
  },
  warning: {
    bg: "bg-white",
    border: "border-amber-500",
    icon: "text-amber-500",
    text: "text-[var(--admin-text-primary)]",
  },
};

// Individual toast item
function ToastItem({ toast, onDismiss }: { toast: ToastType; onDismiss: () => void }) {
  const styles = toastStyles[toast.type];

  return (
    <div
      className={`
        flex items-start gap-3 rounded-xl border p-4 shadow-lg backdrop-blur-sm
        animate-in slide-in-from-right-5 fade-in duration-300
        ${styles.bg} ${styles.border}
      `}
      role="alert"
    >
      <div className={`shrink-0 ${styles.icon}`}>
        {ToastIcons[toast.type]}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${styles.text}`}>{toast.message}</p>
        {toast.description && (
          <p className="mt-0.5 text-xs text-[var(--admin-text-muted)]">{toast.description}</p>
        )}
      </div>
      <button
        onClick={onDismiss}
        className="shrink-0 rounded-lg p-1 text-[var(--admin-text-muted)] hover:text-[var(--admin-text-secondary)] hover:bg-stone-100 transition-colors"
        aria-label="Dismiss"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// Container component - renders in a fixed position
export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 max-w-sm w-full"
      aria-live="polite"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onDismiss={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
}

// Simple inline toast for use without provider (legacy support)
interface InlineToastProps {
  type: ToastType["type"];
  message: string;
  onDismiss?: () => void;
}

export function InlineToast({ type, message, onDismiss }: InlineToastProps) {
  const styles = toastStyles[type];

  return (
    <div
      className={`
        flex items-center gap-3 rounded-xl border p-4 shadow-lg
        ${styles.bg} ${styles.border}
      `}
      role="alert"
    >
      <div className={`shrink-0 ${styles.icon}`}>
        {ToastIcons[type]}
      </div>
      <p className={`flex-1 text-sm font-semibold ${styles.text}`}>{message}</p>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="shrink-0 rounded-lg p-1 text-[var(--admin-text-muted)] hover:text-[var(--admin-text-secondary)] hover:bg-stone-100 transition-colors"
          aria-label="Dismiss"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}