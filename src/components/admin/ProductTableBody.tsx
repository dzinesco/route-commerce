"use client";

import { useState } from "react";
import Link from "next/link";
import { deleteProduct } from "@/actions/products";

type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  type: string;
  active: boolean;
  deleted_at?: string | null;
  brands: { name: string } | { name: string }[];
  is_taxable?: boolean;
};

type ProductTableBodyProps = {
  products: Product[];
  search: string;
  statusFilter: "all" | "active" | "inactive";
  onSearchChange: (v: string) => void;
  onStatusChange: (v: "all" | "active" | "inactive") => void;
  onDeleted: (productId: string) => void;
};

export default function ProductTableBody({
  products,
  search,
  statusFilter,
  onSearchChange,
  onStatusChange,
  onDeleted,
}: ProductTableBodyProps) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const filtered = products.filter((p) => {
    const matchesSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && p.active) ||
      (statusFilter === "inactive" && !p.active);
    return matchesSearch && matchesStatus;
  });

  async function handleDelete(productId: string) {
    setDeletingId(productId);
    setDeleteError(null);
    const result = await deleteProduct(productId, null);
    setDeletingId(null);
    setConfirmDelete(null);
    setOpenMenu(null);
    if (result.success) {
      onDeleted(productId);
    } else {
      setDeleteError(result.error ?? "Delete failed");
    }
  }

  return (
    <>
      {/* Filter bar — sits outside <table> in the parent */}
      <div className="border-b border-slate-100 px-5 py-3 flex gap-3 flex-wrap items-center">
        <input
          type="search"
          placeholder="Search products..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="flex-1 min-w-40 rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-slate-900"
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
        <span className="text-xs text-slate-400">{filtered.length}</span>
      </div>

      {/* Delete error banner */}
      {deleteError && (
        <div className="mx-5 mt-3 rounded-lg bg-red-900/30 border border-red-200 px-4 py-3 text-sm text-red-400">
          {deleteError}
          <button
            onClick={() => setDeleteError(null)}
            className="ml-2 underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}

      <tbody className="divide-y divide-slate-200">
        {filtered.length === 0 ? (
          <tr>
            <td colSpan={7} className="px-5 py-10 text-center text-sm text-zinc-500">
              {search || statusFilter !== "all"
                ? "No products match your search."
                : "No products found."}
            </td>
          </tr>
        ) : (
          filtered.map((product) => (
            <tr
              key={product.id}
              className="hover:bg-zinc-800 transition-colors relative"
            >
              <td className="px-5 py-4">
                <Link
                  href={`/admin/products/${product.id}`}
                  className="block font-medium text-zinc-100 hover:text-zinc-400"
                >
                  {product.name}
                </Link>
                <div className="text-zinc-500 line-clamp-1 text-sm">
                  {product.description || <span className="italic text-slate-400">No description</span>}
                </div>
              </td>

              <td className="px-5 py-4 text-zinc-300">
                {Array.isArray(product.brands)
                  ? product.brands[0]?.name
                  : product.brands?.name}
              </td>

              <td className="px-5 py-4 text-zinc-300">{product.type}</td>

              <td className="px-5 py-4 font-semibold text-zinc-100">
                ${Number(product.price).toFixed(2)}
              </td>

              <td className="px-5 py-4">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    product.active
                      ? "bg-green-900/40 text-green-400"
                      : "bg-zinc-950 text-zinc-400"
                  }`}
                >
                  {product.active ? "Active" : "Inactive"}
                </span>
              </td>

              <td className="px-5 py-4">
                {product.is_taxable === false ? (
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">Non-taxable</span>
                ) : (
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">Taxable</span>
                )}
              </td>

              {/* Actions */}
              <td className="px-5 py-4 text-right">
                <div className="relative inline-flex items-center justify-end gap-2">
                  <Link
                    href={`/admin/products/${product.id}`}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-950"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      setOpenMenu(openMenu === product.id ? null : product.id);
                    }}
                    className="rounded-lg px-2 py-1.5 text-xs text-zinc-500 hover:bg-zinc-950"
                  >
                    ⋮
                  </button>

                  {openMenu === product.id && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => { setOpenMenu(null); setConfirmDelete(null); }}
                      />
                      <div className="absolute right-0 top-full mt-1 z-20 w-44 rounded-xl bg-zinc-900 shadow-lg ring-1 ring-zinc-700 overflow-hidden">
                        <button
                          onClick={() => { setOpenMenu(null); setConfirmDelete(product.id); }}
                          className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-900/30"
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}

                  {confirmDelete === product.id && (
                    <>
                      <div
                        className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
                        onClick={() => { setConfirmDelete(null); setOpenMenu(null); }}
                      />
                      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-40 w-80 rounded-xl bg-zinc-900 shadow-xl ring-1 ring-zinc-700 p-6">
                        <p className="text-sm font-semibold text-zinc-100">
                          Delete "{product.name}"?
                        </p>
                        <p className="mt-2 text-xs text-zinc-500">
                          This will remove the product. If it is attached to any
                          orders, it will be hidden instead of deleted.
                        </p>
                        <div className="mt-5 flex gap-3">
                          <button
                            onClick={() => { setConfirmDelete(null); setOpenMenu(null); }}
                            className="flex-1 rounded-lg border border-zinc-600 px-3 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleDelete(product.id)}
                            disabled={deletingId === product.id}
                            className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                          >
                            {deletingId === product.id ? "..." : "Delete"}
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </>
  );
}