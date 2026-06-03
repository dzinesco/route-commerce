"use client";

import React from "react";

type AdminInputProps = {
  label?: string;
  error?: string;
  helpText?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
};

export function AdminInput({ 
  label, 
  error, 
  helpText, 
  required,
  className = "",
  children,
  id,
}: AdminInputProps & { id?: string }) {
  // Generate a stable id for label association when label is provided
  const generatedId = id || (label ? `admin-input-${label.toLowerCase().replace(/[^a-z0-9]/g, "-")}` : undefined);

  // Clone child to inject id + aria props if it's a valid element (input/textarea/select)
  const enhancedChildren = React.isValidElement(children)
    ? React.cloneElement(children as React.ReactElement<any>, {
        id: (children as any).props?.id || generatedId,
        "aria-required": required ? "true" : undefined,
        required: required ? true : undefined,
        "aria-describedby": error ? `${generatedId}-error` : helpText ? `${generatedId}-help` : undefined,
      })
    : children;

  return (
    <div className={className}>
      {label && (
        <label 
          htmlFor={generatedId} 
          className="block text-xs font-semibold text-[var(--admin-text-secondary)] mb-1.5 cursor-pointer"
        >
          {label}
          {required && <span className="text-[var(--admin-danger)] ml-1" aria-hidden="true">*</span>}
        </label>
      )}
      {enhancedChildren}
      {helpText && !error && (
        <p id={generatedId ? `${generatedId}-help` : undefined} className="mt-1 text-[10px] text-[var(--admin-text-muted)]">
          {helpText}
        </p>
      )}
      {error && (
        <p id={generatedId ? `${generatedId}-error` : undefined} className="mt-1 text-xs text-[var(--admin-danger)]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

// Styled text input wrapper
type AdminTextInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'type'> & {
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
};

export function AdminTextInput({ 
  value, 
  onChange, 
  type = "text",
  disabled,
  className = "",
  maxLength,
  autoComplete,
  step,
  min,
  max,
  ...rest
}: AdminTextInputProps) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      disabled={disabled}
      className={`w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card-bg)] px-3 py-2.5 text-sm text-[var(--admin-text-primary)] outline-none focus:border-[var(--admin-accent)] focus:ring-2 focus:ring-[var(--admin-accent)]/20 placeholder:text-[var(--admin-text-muted)] disabled:opacity-50 transition-all duration-150 ${className}`}
      maxLength={maxLength}
      autoComplete={autoComplete}
      step={step}
      min={min}
      max={max}
      {...rest}
    />
  );
}

// Styled textarea wrapper
type AdminTextareaProps = Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange' | 'value'> & {
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
};

export function AdminTextarea({ 
  value, 
  onChange, 
  disabled,
  className = "",
  ...rest
}: AdminTextareaProps) {
  return (
    <textarea
      value={value}
      onChange={onChange}
      disabled={disabled}
      className={`w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card-bg)] px-3 py-2.5 text-sm text-[var(--admin-text-primary)] outline-none focus:border-[var(--admin-accent)] focus:ring-2 focus:ring-[var(--admin-accent)]/20 placeholder:text-[var(--admin-text-muted)] resize-none disabled:opacity-50 ${className}`}
      {...rest}
    />
  );
}

// Styled select wrapper
type AdminSelectProps = Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'value'> & {
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: { value: string; label: string }[];
};

export function AdminSelect({ 
  value, 
  onChange, 
  options,
  disabled,
  className = "",
  ...rest
}: AdminSelectProps) {
  return (
    <select
      value={value}
      onChange={onChange}
      disabled={disabled}
      className={`w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card-bg)] px-3 py-2.5 text-sm text-[var(--admin-text-primary)] outline-none focus:border-[var(--admin-accent)] focus:ring-2 focus:ring-[var(--admin-accent)]/20 disabled:opacity-50 ${className}`}
      {...rest}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

// Styled checkbox wrapper
type AdminCheckboxProps = {
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  label: string;
  disabled?: boolean;
  className?: string;
};

export function AdminCheckbox({ 
  checked, 
  onChange, 
  label,
  disabled,
  className = "" 
}: AdminCheckboxProps) {
  return (
    <label className={`flex items-center gap-3 cursor-pointer ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="h-4 w-4 rounded border-[var(--admin-border)] text-[var(--admin-accent)] focus:ring-2 focus:ring-[var(--admin-accent)]/30 focus:ring-offset-1 cursor-pointer"
      />
      <span className="text-sm font-medium text-[var(--admin-text-secondary)]">{label}</span>
    </label>
  );
}

// Loading spinner
type AdminSpinnerProps = {
  size?: "sm" | "md" | "lg";
  className?: string;
};

export function AdminSpinner({ size = "md", className = "" }: AdminSpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4 border-2",
    md: "h-6 w-6 border-2",
    lg: "h-8 w-8 border-3",
  };

  return (
    <div 
      className={`animate-spin rounded-full border-[var(--admin-accent)] border-t-transparent ${sizeClasses[size]} ${className}`}
    />
  );
}

// Loading overlay
type AdminLoadingOverlayProps = {
  message?: string;
};

export function AdminLoadingOverlay({ message = "Loading..." }: AdminLoadingOverlayProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-10">
      <div className="flex flex-col items-center gap-3">
        <AdminSpinner size="lg" />
        <span className="text-sm text-[var(--admin-text-muted)]">{message}</span>
      </div>
    </div>
  );
}