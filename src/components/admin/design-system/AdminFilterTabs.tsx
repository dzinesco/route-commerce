"use client";

type TabItem = {
  /** Unique value for the tab */
  value: string;
  /** Display label for the tab */
  label: string;
  /** Optional count badge */
  count?: number;
  /** Optional icon element */
  icon?: React.ReactNode;
  /** Disable this tab */
  disabled?: boolean;
};

type AdminFilterTabsProps = {
  /** Currently active tab value */
  activeTab: string;
  /** Callback when tab changes */
  onTabChange: (value: string) => void;
  /** Array of tab items */
  tabs: TabItem[];
  /** CSS class for the tabs container */
  className?: string;
  /** Size variant */
  size?: "sm" | "md";
  /** Show count badges */
  showCounts?: boolean;
};

const sizeClasses = {
  sm: {
    container: "p-0.5 gap-0.5",
    tab: "px-2.5 py-1.5 text-[10px]",
  },
  md: {
    container: "p-1 gap-0.5",
    tab: "px-3 py-1.5 text-xs",
  },
};

export default function AdminFilterTabs({
  activeTab,
  onTabChange,
  tabs,
  className = "",
  size = "md",
  showCounts = true,
}: AdminFilterTabsProps) {
  const sizes = sizeClasses[size];

  return (
    <div 
      className={`
        flex rounded-lg border border-[var(--admin-border)] bg-[var(--admin-card-bg-alt)]
        ${sizes.container} ${className}
      `}
      role="tablist"
      aria-label="Filter tabs"
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.value;
        const isDisabled = tab.disabled ?? false;

        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            disabled={isDisabled}
            onClick={() => !isDisabled && onTabChange(tab.value)}
            className={`
              flex items-center gap-1.5 rounded-lg font-semibold transition-all duration-150
              disabled:opacity-50 disabled:cursor-not-allowed
              ${sizes.tab}
              ${isActive
                ? `
                  bg-white text-emerald-700 
                  border border-emerald-200 
                  shadow-sm
                `
                : `
                  text-stone-600 
                  hover:text-emerald-700 
                  hover:bg-emerald-50/50
                `
              }
            `}
          >
            {/* Tab Icon */}
            {tab.icon && (
              <span className={`flex-shrink-0 ${isActive ? "text-emerald-600" : "text-stone-400"}`}>
                {tab.icon}
              </span>
            )}
            
            {/* Tab Label */}
            <span>{tab.label}</span>

            {/* Count Badge */}
            {showCounts && tab.count !== undefined && (
              <span
                className={`
                  ml-0.5 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1
                  text-[10px] font-bold
                  ${isActive
                    ? "bg-[var(--admin-accent)] text-white"
                    : "bg-[var(--admin-border)] text-[var(--admin-text-muted)]"
                  }
                `}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// Convenience components for common tab configurations

export type StatusFilter = "all" | "active" | "inactive" | "pending" | "draft" | string;

type StatusFilterTabsProps = {
  activeTab: StatusFilter;
  onTabChange: (value: StatusFilter) => void;
  counts?: {
    all?: number;
    active?: number;
    inactive?: number;
    pending?: number;
    draft?: number;
  };
  className?: string;
  size?: "sm" | "md";
};

export function AdminStatusFilterTabs({
  activeTab,
  onTabChange,
  counts,
  className = "",
  size = "md",
}: StatusFilterTabsProps) {
  const defaultTabs: TabItem[] = [
    { value: "all", label: "All", count: counts?.all },
    { value: "active", label: "Active", count: counts?.active },
    { value: "pending", label: "Pending", count: counts?.pending },
    { value: "draft", label: "Draft", count: counts?.draft },
    { value: "inactive", label: "Inactive", count: counts?.inactive },
  ];

  return (
    <AdminFilterTabs
      activeTab={activeTab}
      onTabChange={onTabChange}
      tabs={defaultTabs}
      className={className}
      size={size}
    />
  );
}

// View mode tabs (table/card view)
type ViewMode = "table" | "cards" | "list" | string;

type ViewModeTabsProps = {
  activeTab: ViewMode;
  onTabChange: (value: ViewMode) => void;
  showTable?: boolean;
  showCards?: boolean;
  showList?: boolean;
  className?: string;
};

const TableIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const CardsIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
  </svg>
);

const ListIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
  </svg>
);

export function AdminViewModeTabs({
  activeTab,
  onTabChange,
  showTable = true,
  showCards = true,
  showList = false,
  className = "",
}: ViewModeTabsProps) {
  const tabs: TabItem[] = [];
  
  if (showTable) tabs.push({ value: "table", label: "Table", icon: <TableIcon /> });
  if (showCards) tabs.push({ value: "cards", label: "Cards", icon: <CardsIcon /> });
  if (showList) tabs.push({ value: "list", label: "List", icon: <ListIcon /> });

  return (
    <div 
      className={`
        flex rounded-lg border border-[var(--admin-border)] bg-white p-1
        ${className}
      `}
      role="tablist"
      aria-label="View mode"
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.value;

        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onTabChange(tab.value)}
            className={`
              flex items-center justify-center rounded-lg p-1.5 transition-all duration-150
              ${isActive
                ? `
                  bg-[var(--admin-accent-light)] text-[var(--admin-accent-text)] 
                  border border-[var(--admin-accent)] 
                  shadow-[var(--admin-shadow-sm)]
                `
                : `
                  text-[var(--admin-text-muted)] 
                  hover:text-[var(--admin-text-secondary)] 
                  hover:bg-[var(--admin-bg-subtle)]
                `
              }
            `}
          >
            {tab.icon}
          </button>
        );
      })}
    </div>
  );
}