"use client";

import { InputHTMLAttributes, forwardRef } from "react";

type AdminSearchInputProps = InputHTMLAttributes<HTMLInputElement> & {
  /** Search icon element (defaults to magnifying glass) */
  icon?: React.ReactNode;
  /** Icon position */
  iconPosition?: "left" | "right";
  /** Callback when clear button is clicked */
  onClear?: () => void;
  /** Show clear button when value exists */
  showClear?: boolean;
  /** Container CSS class */
  containerClassName?: string;
  /** Input wrapper CSS class */
  inputClassName?: string;
};

const SearchIcon = () => (
  <svg 
    className="h-5 w-5" 
    fill="none" 
    viewBox="0 0 24 24" 
    stroke="currentColor" 
    strokeWidth={2}
  >
    <path 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
    />
  </svg>
);

const ClearIcon = () => (
  <svg 
    className="h-4 w-4" 
    fill="none" 
    viewBox="0 0 24 24" 
    stroke="currentColor" 
    strokeWidth={2}
  >
    <path 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      d="M6 18L18 6M6 6l12 12" 
    />
  </svg>
);

const AdminSearchInput = forwardRef<HTMLInputElement, AdminSearchInputProps>(({
  icon,
  iconPosition = "left",
  onClear,
  showClear = true,
  containerClassName = "",
  inputClassName = "",
  value,
  className = "",
  ...props
}, ref) => {
  const searchIcon = icon ?? <SearchIcon />;
  const hasValue = value !== undefined && value !== "";
  const shouldShowClear = showClear && hasValue && onClear;

  const inputBaseClasses = `
    w-full rounded-xl border border-[var(--admin-border)] bg-white 
    py-2 pl-10 pr-4 text-sm text-[var(--admin-text-primary)] 
    outline-none transition-colors duration-150
    placeholder:text-[var(--admin-text-muted)]
    focus:border-[var(--admin-accent)]
    disabled:bg-[var(--admin-bg-subtle)] disabled:cursor-not-allowed
  `;

  return (
    <div className={`relative flex-1 min-w-[12rem] ${containerClassName}`}>
      {/* Left Icon */}
      {iconPosition === "left" && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--admin-text-muted)] pointer-events-none">
          {searchIcon}
        </div>
      )}

      {/* Input */}
      <input
        ref={ref}
        type="search"
        value={value}
        className={`${inputBaseClasses} ${inputClassName} ${className}`}
        {...props}
      />

      {/* Right Icon (Clear button or custom) */}
      {iconPosition === "right" && !shouldShowClear && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--admin-text-muted)] pointer-events-none">
          {searchIcon}
        </div>
      )}

      {/* Clear Button */}
      {shouldShowClear && (
        <button
          type="button"
          onClick={onClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--admin-text-muted)] hover:text-[var(--admin-text-secondary)] transition-colors p-0.5"
          aria-label="Clear search"
        >
          <ClearIcon />
        </button>
      )}
    </div>
  );
});

AdminSearchInput.displayName = "AdminSearchInput";

export default AdminSearchInput;