"use client";

type StatusOption = "all" | "active" | "inactive" | string;

type AdminFilterBarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  statusFilter?: StatusOption;
  onStatusChange?: (value: StatusOption) => void;
  statusOptions?: { value: StatusOption; label: string }[];
  count?: number;
  countLabel?: string;
  viewMode?: "table" | "cards";
  onViewModeChange?: (mode: "table" | "cards") => void;
  children?: React.ReactNode;
  onAddClick?: () => void;
  addLabel?: string;
};

export default function AdminFilterBar({
  search,
  onSearchChange,
  searchPlaceholder = "Search...",
  statusFilter,
  onStatusChange,
  statusOptions,
  count,
  countLabel = "items",
  viewMode,
  onViewModeChange,
  children,
  onAddClick,
  addLabel = "Add",
}: AdminFilterBarProps) {
  const defaultOptions = [
    { value: "all", label: "All" },
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
  ];

  const options = statusOptions ?? defaultOptions;

  return (
    <div className="rounded-2xl border border-[var(--admin-border)] bg-white p-4 shadow-[var(--admin-shadow-sm)]">
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[12rem]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--admin-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="search"
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full rounded-xl border border-[var(--admin-border)] bg-white py-2 pl-10 pr-4 text-sm text-[var(--admin-text-primary)] outline-none focus:border-[var(--admin-accent)] placeholder:text-[var(--admin-text-muted)]"
          />
        </div>

        {/* Status Tabs */}
        {onStatusChange && (
          <div className="flex gap-1 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-bg-subtle)] p-1">
            {options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => onStatusChange(opt.value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  statusFilter === opt.value
                    ? "bg-white text-[var(--admin-accent-text)] shadow-[var(--admin-shadow-sm)] border border-[var(--admin-accent-light)]"
                    : "text-[var(--admin-text-muted)] hover:text-[var(--admin-text-secondary)] hover:bg-white/50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {/* Count */}
        {count !== undefined && (
          <span className="text-xs text-[var(--admin-text-muted)]">
            {count} {countLabel}
          </span>
        )}

        {/* View Toggle */}
        {onViewModeChange && viewMode && (
          <div className="flex gap-1 rounded-xl border border-[var(--admin-border)] bg-white p-1">
            <button
              onClick={() => onViewModeChange("table")}
              className={`rounded-lg p-1.5 transition-all ${
                viewMode === "table"
                  ? "bg-[var(--admin-accent-light)] text-[var(--admin-accent-text)] border border-[var(--admin-accent)] shadow-[var(--admin-shadow-sm)]"
                  : "text-[var(--admin-text-muted)] hover:text-[var(--admin-text-secondary)] hover:bg-[var(--admin-bg-subtle)]"
              }`}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
            <button
              onClick={() => onViewModeChange("cards")}
              className={`rounded-lg p-1.5 transition-all ${
                viewMode === "cards"
                  ? "bg-[var(--admin-accent-light)] text-[var(--admin-accent-text)] border border-[var(--admin-accent)] shadow-[var(--admin-shadow-sm)]"
                  : "text-[var(--admin-text-muted)] hover:text-[var(--admin-text-secondary)] hover:bg-[var(--admin-bg-subtle)]"
              }`}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
          </div>
        )}

        {/* Custom children (e.g. extra filters) */}
        {children}

        {/* Add Button */}
        {onAddClick && (
          <button
            onClick={onAddClick}
            className="ml-auto rounded-xl bg-[var(--admin-accent)] px-4 py-2 text-xs font-bold text-white hover:bg-[var(--admin-accent-hover)] transition-colors shadow-[var(--admin-shadow-sm)]"
          >
            + {addLabel}
          </button>
        )}
      </div>
    </div>
  );
}