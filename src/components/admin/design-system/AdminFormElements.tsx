"use client";

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
  children 
}: AdminInputProps) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-xs font-semibold text-[var(--admin-text-secondary)] mb-1.5">
          {label}
          {required && <span className="text-[var(--admin-danger)] ml-1">*</span>}
        </label>
      )}
      {children}
      {helpText && !error && <p className="mt-1 text-[10px] text-[var(--admin-text-muted)]">{helpText}</p>}
      {error && <p className="mt-1 text-xs text-[var(--admin-danger)]">{error}</p>}
    </div>
  );
}

// Styled text input wrapper
type AdminTextInputProps = {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
  className?: string;
};

export function AdminTextInput({ 
  value, 
  onChange, 
  placeholder,
  type = "text",
  disabled,
  className = "" 
}: AdminTextInputProps) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      className={`w-full rounded-xl border border-[var(--admin-border)] bg-white px-3 py-2.5 text-sm text-[var(--admin-text-primary)] outline-none focus:border-[var(--admin-accent)] placeholder:text-[var(--admin-text-muted)] disabled:bg-[var(--admin-bg-subtle)] disabled:text-[var(--admin-text-muted)] ${className}`}
    />
  );
}

// Styled textarea wrapper
type AdminTextareaProps = {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
  className?: string;
};

export function AdminTextarea({ 
  value, 
  onChange, 
  placeholder,
  rows = 3,
  disabled,
  className = "" 
}: AdminTextareaProps) {
  return (
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      disabled={disabled}
      className={`w-full rounded-xl border border-[var(--admin-border)] bg-white px-3 py-2.5 text-sm text-[var(--admin-text-primary)] outline-none focus:border-[var(--admin-accent)] placeholder:text-[var(--admin-text-muted)] resize-none disabled:bg-[var(--admin-bg-subtle)] disabled:text-[var(--admin-text-muted)] ${className}`}
    />
  );
}

// Styled select wrapper
type AdminSelectProps = {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
  className?: string;
};

export function AdminSelect({ 
  value, 
  onChange, 
  options,
  disabled,
  className = "" 
}: AdminSelectProps) {
  return (
    <select
      value={value}
      onChange={onChange}
      disabled={disabled}
      className={`w-full rounded-xl border border-[var(--admin-border)] bg-white px-3 py-2.5 text-sm text-[var(--admin-text-primary)] outline-none focus:border-[var(--admin-accent)] disabled:bg-[var(--admin-bg-subtle)] disabled:text-[var(--admin-text-muted)] ${className}`}
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
        className="h-4 w-4 rounded border-[var(--admin-border)] text-[var(--admin-accent)] focus:ring-[var(--admin-accent)]"
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