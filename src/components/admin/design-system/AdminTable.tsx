"use client";

import { ReactNode } from "react";

type Column<T> = {
  key: string;
  header: string;
  render?: (item: T) => ReactNode;
  className?: string;
};

type AdminTableProps<T> = {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  className?: string;
};

export default function AdminTable<T extends Record<string, unknown>>({
  data,
  columns,
  keyExtractor,
  onRowClick,
  emptyMessage = "No items found",
  className = "",
}: AdminTableProps<T>) {
  return (
    <div className={`overflow-x-auto rounded-2xl border border-[var(--admin-border)] bg-white shadow-[var(--admin-shadow-sm)] transition-shadow duration-200 hover:shadow-[var(--admin-shadow-md)] ${className}`}>
      <table className="w-full text-left text-sm min-w-[600px]">
        <thead>
          <tr className="border-b border-[var(--admin-border)] bg-[var(--admin-bg-subtle)]">
            {columns.map((col) => (
              <th key={col.key} className={`px-2 sm:px-3 py-2 text-xs sm:text-[10px] font-bold uppercase tracking-widest text-[var(--admin-text-muted)] whitespace-nowrap ${col.className ?? ""}`}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--admin-border-light)]">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-5 py-16 text-center text-sm text-[var(--admin-text-muted)]">
                <div className="flex flex-col items-center gap-2">
                  <svg className="w-8 h-8 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  {emptyMessage}
                </div>
              </td>
            </tr>
          ) : (
            data.map((item, index) => (
              <tr
                key={keyExtractor(item)}
                className={`group hover:bg-[var(--admin-bg-subtle)]/40 transition-all duration-150 ${onRowClick ? "cursor-pointer" : ""}`}
                onClick={() => onRowClick?.(item)}
                style={{ animationDelay: `${index * 30}ms` }}
              >
                {columns.map((col) => (
                  <td key={col.key} className={`px-3 py-2 ${col.className ?? ""}`}>
                    {col.render ? col.render(item) : String(item[col.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// Helper for status badges
export function TableStatusBadge({ status }: { status: "active" | "inactive" | "pending" | "completed" }) {
  const config = {
    active: { bg: "bg-[var(--admin-accent-light)]", text: "text-[var(--admin-accent-text)]", dot: "bg-[var(--admin-accent)]" },
    inactive: { bg: "bg-[var(--admin-border-light)]", text: "text-[var(--admin-text-muted)]", dot: "bg-[var(--admin-text-muted)]" },
    pending: { bg: "bg-[var(--admin-warning-light)]", text: "text-[var(--admin-warning)]", dot: "bg-[var(--admin-warning)]" },
    completed: { bg: "bg-[var(--admin-border)]", text: "text-[var(--admin-text-secondary)]", dot: "bg-[var(--admin-info)]" },
  };
  const { bg, text, dot } = config[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${bg} ${text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}