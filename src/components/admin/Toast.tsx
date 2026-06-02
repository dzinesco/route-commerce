"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export type ToastType = "success" | "error" | "info" | "warning";

export type Toast = {
  id: string;
  type: ToastType;
  message: string;
  description?: string;
};

type ToastContextType = {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
  success: (message: string, description?: string) => void;
  error: (message: string, description?: string) => void;
  info: (message: string, description?: string) => void;
  warning: (message: string, description?: string) => void;
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    setToasts((prev) => [...prev, { ...toast, id }]);

    // Auto-dismiss after 4 seconds for success/info, 6 seconds for error/warning
    const duration = toast.type === "success" || toast.type === "info" ? 4000 : 6000;
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const success = useCallback((message: string, description?: string) => {
    addToast({ type: "success", message, description });
  }, [addToast]);

  const error = useCallback((message: string, description?: string) => {
    addToast({ type: "error", message, description });
  }, [addToast]);

  const info = useCallback((message: string, description?: string) => {
    addToast({ type: "info", message, description });
  }, [addToast]);

  const warning = useCallback((message: string, description?: string) => {
    addToast({ type: "warning", message, description });
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, info, warning }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

// Hook for simpler usage when you only need success/error
export function useToastActions() {
  const { success, error, info, warning } = useToast();
  return { success, error, info, warning };
}