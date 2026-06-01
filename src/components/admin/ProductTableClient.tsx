"use client";

import React, { useState, useTransition } from "react";
import Image from "next/image";
import { deleteProduct } from "@/actions/products";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  type: string;
  active: boolean;
  deleted_at?: string | null;
  image_url?: string | null;
  brands: { name: string } | { name: string }[];
};

type Props = {
  products: Product[];
};

export default function ProductTableClient({ products }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
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

  function handleDeleted() {
    setDeleteError(null);
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <>
      {/* Filter bar */}
      <div className="px-5 py-4 flex gap-3 flex-wrap items-center border-b border-stone-200">
        <input
          type="search"
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-48 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-900 outline-none focus:border-emerald-500 placeholder:text-stone-400 transition-colors"
        />
        <div className="flex gap-1 rounded-lg border border-stone-200 bg-white p-1">
          {(["all", "active", "inactive"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === f
                  ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                  : "text-stone-500 hover:text-stone-700 hover:bg-stone-50"
              }`}
            >
              {f === "all" ? "All" : f === "active" ? "Active" : "Inactive"}
            </button>
          ))}
        </div>
        <span className="text-sm text-stone-500 px-2">{filtered.length} products</span>
      </div>

      {/* Delete error */}
      {deleteError && (
        <div className="mx-5 my-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {deleteError}{" "}
          <button onClick={() => setDeleteError(null)} className="underline hover:no-underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Table */}
      <table className="w-full text-left text-sm">
        <thead className="border-b border-stone-200 bg-stone-50">
          <tr>
            <th className="px-5 py-4 font-semibold text-stone-500">Product</th>
            <th className="px-5 py-4 font-semibold text-stone-500">Brand</th>
            <th className="px-5 py-4 font-semibold text-stone-500">Type</th>
            <th className="px-5 py-4 font-semibold text-stone-500">Price</th>
            <th className="px-5 py-4 font-semibold text-stone-500">Status</th>
            <th className="px-5 py-4 font-semibold text-stone-500" />
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {filtered.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-5 py-16 text-center text-sm text-stone-500">
                {search || statusFilter !== "all"
                  ? "No products match your search."
                  : "No products found."}
              </td>
            </tr>
          ) : (
            filtered.map((product) => (
              <ProductRow
                key={product.id}
                product={product}
                onDeleted={handleDeleted}
                onDeleteError={setDeleteError}
              />
            ))
          )}
        </tbody>
      </table>
    </>
  );
}

function ProductRowBase({
  product,
  onDeleted,
  onDeleteError,
}: {
  product: Product;
  onDeleted: () => void;
  onDeleteError: (msg: string) => void;
}) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  async function handleDelete(productId: string) {
    setDeletingId(productId);
    const result = await deleteProduct(productId, null);
    setDeletingId(null);
    setConfirmDelete(null);
    setOpenMenu(null);
    if (result.success) {
      onDeleted();
    } else {
      onDeleteError(result.error ?? "Delete failed");
    }
  }

  return (
    <tr className="hover:bg-stone-50 transition-colors relative">
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          {product.image_url ? (
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-stone-200">
              <Image
                src={product.image_url}
                alt={product.name}
                fill
                style={{ objectFit: "cover" }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            </div>
          ) : (
            <div className="h-12 w-12 rounded-lg bg-stone-100 flex items-center justify-center shrink-0 border border-stone-200">
              <span className="text-stone-400 text-lg">□</span>
            </div>
          )}
          <div>
            <Link
              href={`/admin/products/${product.id}`}
              className="block font-medium text-stone-900 hover:text-emerald-600 transition-colors"
            >
              {product.name}
            </Link>
            <div className="text-stone-500 line-clamp-1 text-sm">
              {product.description || (
                <span className="italic text-stone-400">No description</span>
              )}
            </div>
          </div>
        </div>
      </td>

      <td className="px-5 py-4 text-stone-600">
        {Array.isArray(product.brands)
          ? product.brands[0]?.name
          : product.brands?.name}
      </td>

      <td className="px-5 py-4 text-stone-600 font-mono text-xs uppercase tracking-wide">{product.type}</td>

      <td className="px-5 py-4 font-mono font-semibold text-stone-900">
        ${Number(product.price).toFixed(2)}
      </td>

      <td className="px-5 py-4">
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            product.active
              ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
              : "bg-stone-100 text-stone-600 border border-stone-200"
          }`}
        >
          {product.active ? "Active" : "Inactive"}
        </span>
      </td>

      <td className="px-5 py-4 text-right">
        <div className="relative inline-flex items-center justify-end gap-2">
          <Link
            href={`/admin/products/${product.id}`}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors"
          >
            Edit
          </Link>
          <button
            onClick={(e) => {
              e.preventDefault();
              setOpenMenu(openMenu === product.id ? null : product.id);
            }}
            className="rounded-lg px-2 py-1.5 text-xs text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
          >
            ⋮
          </button>

          {openMenu === product.id && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => { setOpenMenu(null); setConfirmDelete(null); }}
              />
              <div className="absolute right-0 top-full mt-1 z-20 w-44 rounded-xl bg-white border border-stone-200 shadow-xl overflow-hidden">
                <button
                  onClick={() => { setOpenMenu(null); setConfirmDelete(product.id); }}
                  className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  Delete
                </button>
              </div>
            </>
          )}

          {confirmDelete === product.id && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => { setConfirmDelete(null); setOpenMenu(null); }}
              />
              <div className="absolute right-0 top-full mt-1 z-40 w-72 rounded-xl bg-white border border-stone-200 shadow-xl p-4">
                <p className="text-sm font-semibold text-stone-900">
                  Delete &quot;{product.name}&quot;?
                </p>
                <p className="mt-2 text-xs text-stone-500">
                  This will remove the product. If it is attached to any orders,
                  it will be hidden instead of deleted.
                </p>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => { setConfirmDelete(null); setOpenMenu(null); }}
                    className="flex-1 rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDelete(product.id)}
                    disabled={deletingId === product.id}
                    className="flex-1 rounded-lg bg-red-600 hover:bg-red-500 px-3 py-2 text-xs font-medium text-white disabled:opacity-50 transition-colors shadow-sm"
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
  );
}

const ProductRow = React.memo(ProductRowBase);