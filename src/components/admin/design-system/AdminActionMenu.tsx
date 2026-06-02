"use client";

import { useState, useRef, useEffect } from "react";
import { ReactNode } from "react";

type Action = {
  label: string;
  onClick: () => void;
  variant?: "default" | "danger" | "success";
  disabled?: boolean;
};

type AdminActionMenuProps = {
  actions: Action[];
  triggerLabel?: string;
  className?: string;
};

export default function AdminActionMenu({ actions, triggerLabel, className = "" }: AdminActionMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAction = (action: Action) => {
    action.onClick();
    setOpen(false);
  };

  return (
    <div ref={menuRef} className={`relative inline-flex items-center justify-end ${className}`}>
      <button
        onClick={() => setOpen(!open)}
        className="rounded-lg px-2 py-1.5 text-xs text-[var(--admin-text-muted)] hover:text-[var(--admin-text-secondary)] hover:bg-[var(--admin-bg-subtle)] transition-colors"
      >
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
          <circle cx="10" cy="4" r="1.5"/><circle cx="10" cy="10" r="1.5"/><circle cx="10" cy="16" r="1.5"/>
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 w-44 rounded-xl bg-white border border-[var(--admin-border)] shadow-[var(--admin-shadow-lg)] overflow-hidden">
            {actions.map((action, i) => (
              <button
                key={i}
                onClick={() => handleAction(action)}
                disabled={action.disabled}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                  action.variant === "danger"
                    ? "text-[var(--admin-danger)] hover:bg-[var(--admin-danger-light)]"
                    : action.variant === "success"
                    ? "text-[var(--admin-accent-text)] hover:bg-[var(--admin-accent-light)]"
                    : "text-[var(--admin-text-secondary)] hover:bg-[var(--admin-bg-subtle)]"
                } ${action.disabled ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {action.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Simple inline action button
type AdminActionButtonProps = {
  children: ReactNode;
  onClick: () => void;
  variant?: "default" | "primary" | "danger";
  size?: "sm" | "md";
  className?: string;
};

export function AdminActionButton({ 
  children, 
  onClick, 
  variant = "default",
  size = "sm",
  className = "" 
}: AdminActionButtonProps) {
  const baseClasses = "rounded-lg font-medium transition-colors";
  const sizeClasses = size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm";
  
  const variantClasses = {
    default: "text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] hover:bg-[var(--admin-bg-subtle)]",
    primary: "bg-[var(--admin-accent)] text-white hover:opacity-90",
    danger: "text-[var(--admin-danger)] hover:bg-[var(--admin-danger-light)]",
  };

  return (
    <button
      onClick={onClick}
      className={`${baseClasses} ${sizeClasses} ${variantClasses[variant]} ${className}`}
    >
      {children}
    </button>
  );
}