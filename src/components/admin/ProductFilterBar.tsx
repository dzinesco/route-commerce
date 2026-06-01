"use client";

import { useState } from "react";
import { Product } from "@/types";

type Props = {
  products: Product[];
  onSearchChange: (s: string) => void;
  onStatusChange: (f: "all" | "active" | "inactive") => void;
  search: string;
  statusFilter: "all" | "active" | "inactive";
  count: number;
};

export default function ProductFilterBar({
  products,
  onSearchChange,
  onStatusChange,
  search,
  statusFilter,
  count,
}: Props) {
  return (
    <div className="border-b border-slate-100 px-5 py-3 flex gap-3 flex-wrap items-center">
      <input
        type="search"
        placeholder="Search products..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="flex-1 min-w-40 rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-slate-900"
      />
      <div className="flex gap-1 rounded-lg border border-zinc-600 bg-zinc-900 p-1">
        {(["all", "active", "inactive"] as const).map((f) => (
          <button
            key={f}
            onClick={() => onStatusChange(f)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              statusFilter === f
                ? "bg-slate-900 text-white"
                : "text-zinc-400 hover:bg-zinc-950"
            }`}
          >
            {f === "all" ? "All" : f === "active" ? "Active" : "Inactive"}
          </button>
        ))}
      </div>
      <span className="text-xs text-slate-400">{count}</span>
    </div>
  );
}