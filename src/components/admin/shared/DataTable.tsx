"use client";

import { useState } from "react";

type Column<T> = {
  key: keyof T | string;
  header: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
  align?: "left" | "right" | "center";
};

type DataTableProps<T> = {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
  rowClassName?: string;
  paginate?: boolean;
  pageSize?: number;
};

export default function DataTable<T>({
  data,
  columns,
  keyExtractor,
  emptyMessage = "No data found",
  onRowClick,
  rowClassName,
  paginate = false,
  pageSize = 50,
}: DataTableProps<T>) {
  const [page, setPage] = useState(0);

  const displayed = paginate ? data.slice(page * pageSize, (page + 1) * pageSize) : data;
  const totalPages = Math.ceil(data.length / pageSize);

  const alignClass = (align?: "left" | "right" | "center") => {
    switch (align) {
      case "right": return "text-right";
      case "center": return "text-center";
      default: return "text-left";
    }
  };

  return (
    <div className="overflow-x-auto rounded-lg bg-white border border-stone-200 shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-stone-200 bg-stone-50">
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className={`px-4 py-3 font-semibold text-stone-500 ${alignClass(col.align)} ${col.className ?? ""}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {displayed.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-16 text-center text-sm text-stone-500">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            displayed.map((item) => (
              <tr
                key={keyExtractor(item)}
                className={`border-b border-stone-100 last:border-0 hover:bg-stone-50 transition-colors ${
                  onRowClick ? "cursor-pointer" : ""
                } ${rowClassName ?? ""}`}
                onClick={() => onRowClick?.(item)}
              >
                {columns.map((col) => (
                  <td
                    key={String(col.key)}
                    className={`px-4 py-3 ${alignClass(col.align)} ${col.className ?? ""}`}
                  >
                    {col.render
                      ? col.render(item)
                      : String((item as Record<string, unknown>)[col.key as string] ?? "")}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>

      {paginate && totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-stone-200">
          <span className="text-xs text-stone-500">
            Page {page + 1} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="flex h-7 w-7 items-center justify-center rounded border border-stone-200 text-stone-500 hover:text-stone-700 hover:bg-stone-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="flex h-7 w-7 items-center justify-center rounded border border-stone-200 text-stone-500 hover:text-stone-700 hover:bg-stone-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}