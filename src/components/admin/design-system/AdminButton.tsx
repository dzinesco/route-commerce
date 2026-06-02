"use client";

import { ReactNode, ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

type AdminButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  iconPosition?: "left" | "right";
  isLoading?: boolean;
  fullWidth?: boolean;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: `
    bg-[var(--admin-accent)] text-white border border-transparent
    hover:bg-[var(--admin-accent-hover)]
    active:bg-[var(--admin-accent-hover)]
  `,
  secondary: `
    bg-[var(--admin-card-bg)] text-[var(--admin-text-secondary)] border border-[var(--admin-border)]
    hover:bg-[var(--admin-bg)] hover:border-[var(--admin-text-muted)]
    active:bg-[var(--admin-bg)]
  `,
  danger: `
    bg-[var(--admin-danger)] text-white border border-transparent
    hover:bg-[var(--admin-danger-hover)]
    active:bg-[var(--admin-danger-hover)]
  `,
  ghost: `
    bg-transparent text-[var(--admin-text-secondary)] border border-transparent
    hover:bg-[var(--admin-bg-subtle)] hover:text-[var(--admin-text-primary)]
    active:bg-[var(--admin-bg-subtle)]
  `,
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-2.5 py-1 text-xs rounded-lg gap-1",
  md: "px-4 py-2 text-sm rounded-xl gap-2",
  lg: "px-5 py-3 text-base rounded-xl gap-2",
};

export default function AdminButton({
  children,
  variant = "primary",
  size = "sm",
  icon,
  iconPosition = "left",
  isLoading = false,
  fullWidth = false,
  className = "",
  disabled,
  ...props
}: AdminButtonProps) {
  const baseClasses = `
    inline-flex items-center justify-center font-semibold
    transition-all duration-200 cursor-pointer
    disabled:opacity-50 disabled:cursor-not-allowed
    focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
    active:scale-[0.98]
  `;

  const variantClass = variantClasses[variant];
  const sizeClass = sizeClasses[size];
  const widthClass = fullWidth ? "w-full" : "";

  const content = (
    <>
      {isLoading && (
        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {!isLoading && icon && iconPosition === "left" && (
        <span className="flex-shrink-0">{icon}</span>
      )}
      {children && <span>{children}</span>}
      {!isLoading && icon && iconPosition === "right" && (
        <span className="flex-shrink-0">{icon}</span>
      )}
    </>
  );

  return (
    <button
      className={`${baseClasses} ${variantClass} ${sizeClass} ${widthClass} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {content}
    </button>
  );
}

// Icon Button variant for icon-only buttons
type AdminIconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  label: string; // For accessibility
};

const iconSizeClasses: Record<ButtonSize, string> = {
  sm: "p-1.5",
  md: "p-2",
  lg: "p-2.5",
};

export function AdminIconButton({
  variant = "ghost",
  size = "md",
  label,
  className = "",
  ...props
}: AdminIconButtonProps) {
  const baseClasses = `
    inline-flex items-center justify-center rounded-lg
    transition-all duration-150 cursor-pointer
    disabled:opacity-50 disabled:cursor-not-allowed
  `;

  const variantClass = variantClasses[variant];
  const sizeClass = iconSizeClasses[size];

  return (
    <button
      className={`${baseClasses} ${variantClass} ${sizeClass} ${className}`}
      aria-label={label}
      title={label}
      {...props}
    />
  );
}