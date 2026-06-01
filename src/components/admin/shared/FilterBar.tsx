"use client";

type FilterOption = {
  value: string;
  label: string;
};

type FilterBarProps = {
  searchPlaceholder?: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  filters?: {
    label?: string;
    options: FilterOption[];
    value: string;
    onChange: (value: string) => void;
  }[];
  tabs?: {
    label: string;
    value: string;
    count?: number;
  }[];
  activeTab?: string;
  onTabChange?: (value: string) => void;
  actions?: React.ReactNode;
  resultCount?: number;
  showCount?: boolean;
};

export default function FilterBar({
  searchPlaceholder = "Search...",
  searchValue,
  onSearchChange,
  filters = [],
  tabs = [],
  activeTab,
  onTabChange,
  actions,
  resultCount,
  showCount = true,
}: FilterBarProps) {
  return (
    <div className="space-y-3">
      {/* Search + Filters Row */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-48">
          <input
            type="search"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 outline-none focus:border-emerald-500 placeholder:text-stone-400 transition-colors"
          />
        </div>

        {filters.map((filter, i) => (
          <div key={i} className="space-y-1">
            {filter.label && (
              <label className="text-xs text-stone-500 font-medium pl-1">{filter.label}</label>
            )}
            <select
              value={filter.value}
              onChange={(e) => filter.onChange(e.target.value)}
              className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 outline-none focus:border-emerald-500 transition-colors min-w-[140px]"
            >
              {filter.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        ))}

        {actions && <div className="flex items-center gap-2">{actions}</div>}

        {showCount && resultCount !== undefined && (
          <span className="text-sm text-stone-500 px-2 py-2">{resultCount} results</span>
        )}
      </div>

      {/* Tabs Row */}
      {tabs.length > 0 && (
        <div className="flex gap-1 border-b border-stone-200 pb-0">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => onTabChange?.(tab.value)}
              className={`
                px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px
                ${activeTab === tab.value
                  ? "text-emerald-600 border-emerald-600"
                  : "text-stone-500 border-transparent hover:text-stone-700 hover:border-stone-300"
                }
              `}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className={`ml-2 text-xs ${activeTab === tab.value ? "text-emerald-500" : "text-stone-400"}`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}