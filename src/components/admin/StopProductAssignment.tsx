"use client";

import { useState } from "react";
import { logAuditEvent } from "@/actions/audit";

type Product = {
  id: string;
  name: string;
  type: string;
  price: number;
};

type AssignedProduct = {
  id: string;
  product_id: string;
  products: { name: string; type: string; price: number } | null;
};

type StopProductAssignmentProps = {
  stopId: string;
  allProducts: Product[];
  assignedProducts: AssignedProduct[];
  callerUid: string | null;
};

export default function StopProductAssignment({
  stopId,
  allProducts,
  assignedProducts,
  callerUid,
}: StopProductAssignmentProps) {
  const [products, setProducts] = useState(assignedProducts);
  const [selected, setSelected] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const assignedIds = new Set(products.map((p) => p.product_id));
  const availableProducts = allProducts.filter((p) => !assignedIds.has(p.id));

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;

    setAssigning(true);
    setError(null);

    // First run diagnostic to understand the actual state
    const diagRes = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/debug_stop_product_assignment`,
      {
        method: "POST",
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          p_stop_id: stopId,
          p_product_id: selected,
          p_caller_uid: callerUid,
        }),
      }
    );
    const diag = await diagRes.json();

    // Now attempt the actual assignment
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
          p_caller_uid: callerUid,
        }),
      }
    );

    const data = await res.json();

    if (!res.ok || data.success === false) {
      const diagInfo = diag && typeof diag === 'object' && 'reason' in diag
        ? `[${(diag as any).reason}] (admin_found=${(diag as any).admin_found}, role=${(diag as any).admin_role}, admin_brand=${(diag as any).admin_brand_id}, stop_brand=${(diag as any).stop_brand_id}, product_brand=${(diag as any).product_brand_id})`
        : '';
      const errMsg = data?.error ?? data?.message ?? `HTTP ${res.status}`;
      const errDetail = data?.details ?? data?.hint ?? data?.code ?? '';
      const fullError = diagInfo
        ? `Failed to assign: ${errMsg} ${diagInfo}${errDetail ? ' | ' + errDetail : ''}`
        : `Failed to assign: ${errMsg}${errDetail ? ' — ' + errDetail : ''}`;
      setError(fullError);
      setAssigning(false);
      return;
    }

    // Refresh product list from get_stop_products RPC
    const refreshRes = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/get_stop_products`,
      {
        method: "POST",
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ p_stop_id: stopId }),
      }
    );
    const refreshData = await refreshRes.json();
    setProducts(refreshData.products ?? []);
    setSelected("");
    setAssigning(false);

    logAuditEvent({
      table_name: "product_stops",
      record_id: data.id,
      action: "INSERT",
      old_data: null,
      new_data: { stop_id: stopId, product_id: selected },
      brand_id: null,
    });
  }

  async function handleRemove(productId: string) {
    const entry = products.find((p) => p.product_id === productId);
    if (!entry) return;

    setRemoving(productId);
    setError(null);

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
          p_caller_uid: callerUid,
        }),
      }
    );

    const data = await res.json();

    if (!res.ok || data.success === false) {
      const errMsg = data?.error ?? data?.message ?? `HTTP ${res.status}`;
      const errDetail = data?.details ?? data?.hint ?? data?.code ?? '';
      setError(`Failed to remove: ${errMsg}${errDetail ? ' — ' + errDetail : ''}`);
      setRemoving(null);
      return;
    }

    setProducts(products.filter((p) => p.product_id !== productId));
    setRemoving(null);

    logAuditEvent({
      table_name: "product_stops",
      record_id: entry.id,
      action: "DELETE",
      old_data: { stop_id: stopId, product_id: productId },
      new_data: null,
      brand_id: null,
    });
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl bg-red-900/30 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {products.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm font-medium text-zinc-300">
            Assigned Products ({products.length})
          </p>
          {products.map((ap) => (
            <div
              key={ap.id}
              className="flex items-center justify-between rounded-xl border border-zinc-800 bg-slate-50 px-4 py-3"
            >
              <div>
                <p className="font-medium text-zinc-100">
                  {ap.products?.name ?? "Unknown"}
                </p>
                <p className="text-xs text-zinc-500">
                  {ap.products?.type} ·{" "}
                  ${Number(ap.products?.price ?? 0).toFixed(2)}
                </p>
              </div>
              <button
                onClick={() => handleRemove(ap.product_id)}
                disabled={removing === ap.product_id}
                className="shrink-0 rounded-lg px-3 py-1 text-sm font-medium text-red-400 hover:bg-red-900/30 disabled:opacity-50"
              >
                {removing === ap.product_id ? "..." : "Remove"}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-zinc-500">No products assigned yet.</p>
      )}

      {availableProducts.length > 0 && (
        <form onSubmit={handleAssign} className="flex gap-3">
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="flex-1 rounded-xl border border-zinc-600 bg-zinc-900 px-4 py-3 text-base outline-none focus:border-slate-900"
          >
            <option value="">Select a product...</option>
            {availableProducts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.type})
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={!selected || assigning}
            className="rounded-xl bg-slate-900 px-5 py-3 font-medium text-white disabled:opacity-50"
          >
            {assigning ? "..." : "Assign"}
          </button>
        </form>
      )}
    </div>
  );
}