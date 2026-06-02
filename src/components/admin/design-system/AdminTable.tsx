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
    <div className={`overflow-hidden rounded-2xl border border-[var(--admin-border)] bg-white shadow-[var(--admin-shadow-sm)] ${className}`}>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-[var(--admin-border)] bg-[var(--admin-bg-subtle)]">
            {columns.map((col) => (
              <th key={col.key} className={`px-5 py-3.5 text-[10px] font-bold uppercase tracking-widest text-[var(--admin-text-muted)] ${col.className ?? ""}`}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--admin-border-light)]">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-5 py-16 text-center text-sm text-[var(--admin-text-muted)]">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((item) => (
              <tr
                key={keyExtractor(item)}
                className={`hover:bg-[var(--admin-bg-subtle)]/40 transition-colors ${onRowClick ? "cursor-pointer" : ""}`}
                onClick={() => onRowClick?.(item)}
              >
                {columns.map((col) => (
                  <td key={col.key} className={`px-5 py-3.5 ${col.className ?? ""}`}>
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