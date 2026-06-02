// Error Boundary Component for catching and displaying errors

"use client";

import React, { Component, ReactNode } from "react";
import { captureError } from "@/lib/sentry";
import { Button } from "@/components/ui/button";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to Sentry
    captureError(error, {
      componentStack: errorInfo.componentStack,
      boundary: "ErrorBoundary",
    });

    // Call custom error handler
    this.props.onError?.(error, errorInfo);

    this.setState({ errorInfo });
  }

  resetError = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h1>
            <p className="text-gray-600 mb-6">
              We encountered an unexpected error. Please try refreshing the page.
            </p>
            <div className="space-y-3">
              <Button onClick={this.resetError} className="w-full">
                Try Again
              </Button>
              <Button 
                variant="outline" 
                onClick={() => window.location.href = "/"}
                className="w-full"
              >
                Go to Homepage
              </Button>
            </div>
            {process.env.NODE_ENV === "development" && this.state.error && (
              <div className="mt-6 p-4 bg-gray-100 rounded-lg text-left">
                <p className="text-sm font-mono text-red-600 break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Loading skeleton component
export function LoadingSkeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
  );
}

// Full page loading state
export function LoadingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
}

// Loading spinner for buttons
export function LoadingSpinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  return (
    <div className={`${sizeClasses[size]} border-2 border-current border-t-transparent rounded-full animate-spin`} />
  );
}

// Async button wrapper with loading state
interface AsyncButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  loading?: boolean;
  loadingText?: string;
}

export function AsyncButton({ 
  children, 
  loading, 
  loadingText = "Loading...",
  disabled,
  ...props 
}: AsyncButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`relative ${props.className || ""}`}
    >
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <LoadingSpinner size="sm" />
        </span>
      )}
      <span className={loading ? "opacity-0" : ""}>
        {children}
      </span>
      {loading && loadingText && (
        <span className="sr-only">{loadingText}</span>
      )}
    </button>
  );
}

// Optimistic update wrapper
interface OptimisticState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

export function useOptimistic<T>(initialData: T | null = null) {
  const [state, setState] = React.useState<OptimisticState<T>>({
    data: initialData,
    loading: false,
    error: null,
  });

  const optimisticUpdate = React.useCallback((updater: (prev: T | null) => T) => {
    setState(prev => ({
      ...prev,
      data: updater(prev.data),
    }));
  }, []);

  const setLoading = React.useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, loading }));
  }, []);

  const setError = React.useCallback((error: Error | null) => {
    setState(prev => ({ ...prev, error }));
  }, []);

  const reset = React.useCallback(() => {
    setState({ data: initialData, loading: false, error: null });
  }, [initialData]);

  return {
    ...state,
    optimisticUpdate,
    setLoading,
    setError,
    reset,
    setData: (data: T) => setState(prev => ({ ...prev, data })),
  };
}

// Toast notifications
interface Toast {
  id: string;
  type: "success" | "error" | "info" | "warning";
  message: string;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const addToast = React.useCallback((toast: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).substring(7);
    setToasts(prev => [...prev, { ...toast, id }]);

    // Auto remove after duration
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, toast.duration || 5000);
  }, []);

  const removeToast = React.useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({ 
  toasts, 
  onRemove 
}: { 
  toasts: Toast[]; 
  onRemove: (id: string) => void 
}) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`flex items-center gap-3 p-4 rounded-lg shadow-lg animate-slide-in ${
            toast.type === "success" ? "bg-green-600" :
            toast.type === "error" ? "bg-red-600" :
            toast.type === "warning" ? "bg-yellow-600" :
            "bg-blue-600"
          } text-white`}
        >
          <span>{toast.message}</span>
          <button 
            onClick={() => onRemove(toast.id)}
            className="p-1 hover:bg-white/20 rounded"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}