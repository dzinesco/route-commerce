"use client";

import { useState } from "react";
import { markPickupComplete } from "@/actions/pickup";

type OrderItem = {
  id: string;
  product_id: string;
  quantity: number;
  price: number;
  products: { name: string } | null;
};

type Order = {
  id: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  stop_id: string | null;
  status: string;
  subtotal: number;
  pickup_complete: boolean;
  pickup_completed_at: string | null;
  pickup_completed_by: string | null;
  created_at: string;
  payment_processor: string | null;
  stops: {
    id?: string;
    city: string;
    state: string;
    date: string;
    brand_id?: string;
  } | null;
  order_items?: OrderItem[];
};

type Stop = {
  id: string;
  city: string;
  state: string;
  date: string;
  brand_id?: string;
};

type AdminOrdersPanelProps = {
  initialOrders: Order[];
  initialStops: Stop[];
  brandId: string | null;
};

function shortId(id: string) {
  return id.slice(0, 8).toUpperCase();
}

function formatDate(iso: string | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export { formatDate };

export default function AdminOrdersPanel({
  initialOrders,
  initialStops,
  brandId,
}: AdminOrdersPanelProps) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [stops] = useState<Stop[]>(initialStops);
  const [search, setSearch] = useState("");
  const [stopFilter, setStopFilter] = useState("");
  const [pickingUp, setPickingUp] = useState<string | null>(null);
  const [squareFilter, setSquareFilter] = useState<"all" | "square" | "other">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "picked_up">("all");
  const [page, setPage] = useState(0);
  const [pickupToast, setPickupToast] = useState<string | null>(null);
  const PAGE_SIZE = 50;

  async function handleMarkPickup(orderId: string) {
    setPickingUp(orderId);
    const result = await markPickupComplete(orderId, brandId);
    if (result.success) {
      setPickupToast(orderId);
      setTimeout(() => setPickupToast(null), 3000);
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                pickup_complete: true,
                pickup_completed_at: result.pickup_completed_at,
                pickup_completed_by: result.pickup_completed_by,
              }
            : o
        )
      );
    }
    setPickingUp(null);
  }

  const filtered = orders.filter((o) => {
    const matchesSearch =
      !search ||
      o.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      (o.customer_phone ?? "").includes(search) ||
      o.id.includes(search.toUpperCase().slice(0, 8));

    const matchesStop = !stopFilter || o.stop_id === stopFilter;

    const matchesSquare =
      squareFilter === "all" ||
      (squareFilter === "square" && o.payment_processor === "square") ||
      (squareFilter === "other" && o.payment_processor !== "square");

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "pending" && !o.pickup_complete) ||
      (statusFilter === "picked_up" && o.pickup_complete);

    return matchesSearch && matchesStop && matchesSquare && matchesStatus;
  });

  const totalFiltered = filtered.length;
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(totalFiltered / PAGE_SIZE);

  const pendingCount = filtered.filter((o) => !o.pickup_complete).length;
  const pickedUpCount = filtered.filter((o) => o.pickup_complete).length;

  return (
    <div className="bg-transparent">
      {/* Header */}
      <div className="border-b border-stone-200 bg-white px-6 py-5">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-stone-950 tracking-tight">Orders</h1>
              <p className="mt-0.5 text-sm text-stone-500">
                {pendingCount} pending
                {pickedUpCount > 0 && ` · ${pickedUpCount} picked up`}
                {brandId && (
                  <span className="ml-2 text-xs text-stone-400">(brand-scoped)</span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-4">
        {/* Status filter + pagination */}
        <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex gap-1 rounded-lg border border-stone-200 bg-white p-1">
            {(["all", "pending", "picked_up"] as const).map((f) => (
              <button
                key={f}
                onClick={() => { setStatusFilter(f); setPage(0); }}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  statusFilter === f
                    ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                    : "text-stone-500 hover:text-stone-700 hover:bg-stone-50"
                }`}
              >
                {f === "all" ? "All" : f === "pending" ? "Pending" : "Picked Up"}
              </button>
            ))}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="flex h-7 w-7 items-center justify-center rounded border border-stone-200 text-stone-500 hover:border-stone-300 hover:text-stone-700 hover:bg-stone-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                aria-label="Previous page"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="px-2 text-xs text-stone-500">{page + 1} / {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="flex h-7 w-7 items-center justify-center rounded border border-stone-200 text-stone-500 hover:border-stone-300 hover:text-stone-700 hover:bg-stone-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                aria-label="Next page"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Search + Stop + Square filter */}
        <div className="mb-4 flex gap-3 flex-wrap">
          <input
            type="search"
            placeholder="Search name, phone, order #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-48 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 outline-none focus:border-emerald-500 placeholder:text-stone-400 font-mono transition-colors"
          />
          <select
            value={stopFilter}
            onChange={(e) => setStopFilter(e.target.value)}
            className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 outline-none focus:border-emerald-500 transition-colors"
          >
            <option value="">All Stops</option>
            {stops.map((s) => (
              <option key={s.id} value={s.id}>
                {s.city}, {s.state} · {formatDate(s.date)}
              </option>
            ))}
          </select>
          <div className="flex gap-1 rounded-lg border border-stone-200 bg-white p-1">
            {(["all", "square", "other"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setSquareFilter(f)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  squareFilter === f
                    ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                    : "text-stone-500 hover:text-stone-700 hover:bg-stone-50"
                }`}
              >
                {f === "all" ? "All" : f === "square" ? "Square" : "Other"}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {paginated.length === 0 ? (
          <div className="rounded-lg bg-white border border-stone-200 py-12 text-center text-sm text-stone-500 shadow-sm">
            No orders found
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg bg-white border border-stone-200 shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 text-left">
                  <th className="px-4 py-3 font-semibold text-stone-500">Order</th>
                  <th className="px-4 py-3 font-semibold text-stone-500">Customer</th>
                  <th className="px-4 py-3 font-semibold text-stone-500 hidden md:table-cell">Stop</th>
                  <th className="px-4 py-3 font-semibold text-stone-500 hidden lg:table-cell">Date</th>
                  <th className="px-4 py-3 font-semibold text-stone-500 text-center">Items</th>
                  <th className="px-4 py-3 font-semibold text-stone-500 text-right">Total</th>
                  <th className="px-4 py-3 font-semibold text-stone-500 text-center">Status</th>
                  <th className="px-4 py-3 font-semibold text-stone-500 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((order) => (
                  <OrderRow
                    key={order.id}
                    order={order}
                    onMarkPickup={handleMarkPickup}
                    pickingUp={pickingUp}
                    shortId={shortId(order.id)}
                    showToast={pickupToast === order.id}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

type OrderRowProps = {
  order: Order;
  onMarkPickup: (orderId: string) => void;
  pickingUp: string | null;
  shortId: string;
  showToast?: boolean;
};

function OrderRow({ order, onMarkPickup, pickingUp, shortId, showToast }: OrderRowProps) {
  const itemCount = order.order_items?.length ?? 0;

  return (
    <tr className="border-b border-stone-100 last:border-0 hover:bg-stone-50 transition-colors">
      {/* Order ID */}
      <td className="px-4 py-3">
        <span className="font-mono text-xs text-stone-500">{shortId}</span>
      </td>

      {/* Customer */}
      <td className="px-4 py-3">
        <div className="font-medium text-stone-900">{order.customer_name}</div>
        {order.customer_phone && (
          <div className="font-mono text-xs text-stone-400">{order.customer_phone}</div>
        )}
      </td>

      {/* Stop */}
      <td className="px-4 py-3 hidden md:table-cell">
        {order.stops ? (
          <span className="text-stone-600">{order.stops.city}, {order.stops.state}</span>
        ) : (
          <span className="text-stone-300">—</span>
        )}
      </td>

      {/* Date */}
      <td className="px-4 py-3 hidden lg:table-cell">
        <span className="font-mono text-stone-500">{formatDate(order.created_at)}</span>
      </td>

      {/* Items */}
      <td className="px-4 py-3 text-center">
        <span className="font-mono text-stone-600">{itemCount}</span>
      </td>

      {/* Total */}
      <td className="px-4 py-3 text-right">
        <span className="font-mono font-semibold text-stone-900">
          ${Number(order.subtotal).toFixed(2)}
        </span>
      </td>

      {/* Status */}
      <td className="px-4 py-3 text-center">
        <span
          className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
            order.pickup_complete
              ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
              : "bg-amber-100 text-amber-700 border border-amber-200"
          }`}
        >
          {order.pickup_complete ? "Picked Up" : "Pending"}
        </span>
        {order.payment_processor === "square" && (
          <span className="ml-1.5 inline-block rounded-full bg-purple-100 border border-purple-200 px-1.5 py-0.5 text-xs font-semibold text-purple-700">
            Square
          </span>
        )}
      </td>

      {/* Actions */}
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-2">
          <a
            href={`/admin/orders/${order.id}`}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors"
          >
            View / Edit
          </a>
          {!order.pickup_complete && (
            <button
              onClick={() => onMarkPickup(order.id)}
              disabled={pickingUp === order.id}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              {pickingUp === order.id ? "..." : "Pick Up"}
            </button>
          )}
          {showToast && (
            <div className="fixed bottom-6 right-6 z-50 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-700 shadow-lg">
              Done
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}