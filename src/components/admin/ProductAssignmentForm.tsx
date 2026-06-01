"use client";

import { useState } from "react";

type Product = {
  id: string;
  name: string;
  type: string;
  price: number;
};

export default function ProductAssignmentForm({
  stopId,
  allProducts,
  assignedProductIds,
}: {
  stopId: string;
  allProducts: Product[];
  assignedProductIds: string[];
}) {
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(false);
  const [assignedIds, setAssignedIds] = useState<Set<string>>(new Set(assignedProductIds));
  const [error, setError] = useState<string | null>(null);

  const availableProducts = allProducts.filter(
    (p) => !assignedIds.has(p.id)
  );

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;

    setLoading(true);
    setError(null);

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/assign_product_to_stop`,
      {
        method: "POST",
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          p_stop_id: stopId,
          p_product_id: selected,
        }),
      }
    );

    const data = await res.json();

    if (!res.ok || data.success === false) {
      setError(data.error ?? "Failed to assign product");
      setLoading(false);
      return;
    }

    setAssignedIds((prev) => new Set(prev).add(selected));
    setSelected("");
    setLoading(false);
  }

  async function handleRemove(productId: string) {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/unassign_product_from_stop`,
      {
        method: "POST",
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          p_stop_id: stopId,
          p_product_id: productId,
        }),
      }
    );

    const data = await res.json();

    if (!res.ok || data.success === false) {
      setError(data.error ?? "Failed to remove");
      return;
    }

    setAssignedIds((prev) => {
      const next = new Set(prev);
      next.delete(productId);
      return next;
    });
  }

  const assignedProducts = allProducts.filter((p) => assignedIds.has(p.id));

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl bg-red-900/30 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Assigned products list */}
      {assignedProducts.length > 0 && (
        <div>
          <p className="text-sm font-medium text-zinc-300 mb-3">
            Currently assigned
          </p>
          <div className="space-y-2">
            {assignedProducts.map((product) => (
              <div
                key={product.id}
                className="flex items-center justify-between rounded-xl border border-zinc-800 p-4"
              >
                <div>
                  <p className="font-medium text-zinc-100">{product.name}</p>
                  <p className="text-sm text-zinc-500">
                    {product.type} · ${product.price}
                  </p>
                </div>
                <button
                  onClick={() => handleRemove(product.id)}
                  className="text-sm text-red-400 hover:text-red-800"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Assign form */}
      <form onSubmit={handleAssign} className="flex gap-3">
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          required
          className="flex-1 rounded-xl border border-zinc-600 px-4 py-3 outline-none focus:border-slate-900"
        >
          <option value="">Select a product...</option>
          {availableProducts.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name} — {product.type} (${product.price})
            </option>
          ))}
        </select>

        <button
          type="submit"
          disabled={!selected || loading}
          className="rounded-xl bg-slate-900 px-5 py-3 font-medium text-white disabled:opacity-50"
        >
          {loading ? "Assigning..." : "Assign Product"}
        </button>
      </form>

      {availableProducts.length === 0 && assignedProducts.length > 0 && (
        <p className="text-sm text-zinc-500">All products already assigned.</p>
      )}

      {allProducts.length === 0 && (
        <p className="text-sm text-zinc-500">
          No active products for this brand yet.
        </p>
      )}
    </div>
  );
}