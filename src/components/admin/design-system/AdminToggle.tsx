"use client";

type AdminToggleProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: "sm" | "md";
  label?: string;
  description?: string;
  className?: string;
};

export function AdminToggle({
  checked,
  onChange,
  disabled = false,
  size = "md",
  label,
  description,
  className = "",
}: AdminToggleProps) {
  const sizeClasses = {
    sm: {
      track: "h-6 w-11",
      thumb: "h-4 w-4",
      translate: checked ? "translate-x-5" : "translate-x-1",
    },
    md: {
      track: "h-7 w-12",
      thumb: "h-5 w-5",
      translate: checked ? "translate-x-6" : "translate-x-1",
    },
  };

  const classes = sizeClasses[size];

  return (
    <label className={`flex items-start gap-3 ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"} ${className}`}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative inline-flex shrink-0 items-center rounded-full transition-all duration-200 ease-out ${
          checked
            ? "bg-[var(--admin-accent)] shadow-[0_0_8px_rgba(202,117,67,0.4)]"
            : "bg-[var(--admin-text-muted)]"
        } ${classes.track}`}
      >
        <span
          className={`inline-block rounded-full bg-white shadow-md transition-transform duration-200 ease-out ${classes.thumb} ${classes.translate}`}
        />
      </button>
      {(label || description) && (
        <div className="flex flex-col">
          {label && (
            <span className="text-sm font-medium text-[var(--admin-text-primary)]">{label}</span>
          )}
          {description && (
            <span className="text-xs text-[var(--admin-text-muted)]">{description}</span>
          )}
        </div>
      )}
    </label>
  );
}

// Compact toggle for use within form rows (no label, smaller)
export function AdminToggleCompact({
  checked,
  onChange,
  disabled = false,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
          checked ? "bg-[var(--admin-accent)]" : "bg-[var(--admin-text-muted)]"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-1"
          }`}
        />
      </button>
      {label && (
        <span className="text-sm text-[var(--admin-text-secondary)]">{label}</span>
      )}
    </div>
  );
}

export default AdminToggle;