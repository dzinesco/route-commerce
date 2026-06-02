"use client";

import { useState } from "react";
import Link from "next/link";
import { markPickupComplete } from "@/actions/pickup";

type OrderItem = {
  id: string;
  product_id: string;
  quantity: number;
  price: number;
  fulfillment?: string;
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
  stops: { id?: string; city: string; state: string; date: string; brand_id?: string } | null;
  order_items?: OrderItem[];
};

type Stop = {
  id: string;
  city: string;
  state: string;
  date: string;
  brand_id?: string;
};

type DriverPickupPanelProps = {
  initialPendingOrders: Order[];
  initialPickedUpOrders: Order[];
  initialStops: Stop[];
  brandId: string | null;
  canManagePickup: boolean;
};

function formatPickupTime(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h ago`;

  if (d.getFullYear() === now.getFullYear()) {
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function shortId(id: string) {
  return id.slice(0, 8).toUpperCase();
}

export default function DriverPickupPanel({
  initialPendingOrders,
  initialPickedUpOrders,
  initialStops,
  brandId,
  canManagePickup,
}: DriverPickupPanelProps) {
  const [pendingOrders, setPendingOrders] = useState<Order[]>(initialPendingOrders);
  const [pickedUpOrders, setPickedUpOrders] = useState<Order[]>(initialPickedUpOrders);
  const [stops] = useState<Stop[]>(initialStops);
  const [search, setSearch] = useState("");
  const [stopFilter, setStopFilter] = useState("");
  const [pickingUp, setPickingUp] = useState<string | null>(null);
  const [showPickedUp, setShowPickedUp] = useState(true);
  const [pickupToast, setPickupToast] = useState<string | null>(null);

  const filteredPending = pendingOrders.filter((o) => {
    const matchesSearch =
      !search ||
      o.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      (o.customer_phone ?? "").includes(search) ||
      o.id.includes(search.toUpperCase().slice(0, 8));
    const matchesStop = !stopFilter || o.stop_id === stopFilter;
    return matchesSearch && matchesStop;
  });

  const filteredPickedUp = pickedUpOrders.filter((o) => {
    const matchesSearch =
      !search ||
      o.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      (o.customer_phone ?? "").includes(search) ||
      o.id.includes(search.toUpperCase().slice(0, 8));
    const matchesStop = !stopFilter || o.stop_id === stopFilter;
    return matchesSearch && matchesStop;
  });

  const hasAnyPickedUp = pickedUpOrders.length > 0;

  async function handleMarkPickup(orderId: string) {
    if (!canManagePickup) return;
    setPickingUp(orderId);

    const result = await markPickupComplete(orderId, brandId);

    if (result.success) {
      const order = pendingOrders.find((o) => o.id === orderId);
      if (order) {
        setPendingOrders((prev) => prev.filter((o) => o.id !== orderId));
        setPickedUpOrders((prev) => [
          {
            ...order,
            pickup_complete: true,
            pickup_completed_at: result.pickup_completed_at,
            pickup_completed_by: result.pickup_completed_by,
          },
          ...prev,
        ]);
        setPickupToast(orderId);
        setTimeout(() => setPickupToast(null), 3000);
      }
    }

    setPickingUp(null);
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-stone-950 tracking-tight">Driver Pickup</h1>
              <p className="mt-1 text-sm text-stone-500">
                {filteredPending.length} pending
                {hasAnyPickedUp && ` · ${pickedUpOrders.length} picked up`}
              </p>
            </div>
            <Link
              href="/admin/orders"
              className="rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors"
            >
              All Orders
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-6 space-y-5">
        {/* Filters */}
        <div className="flex gap-3">
          <select
            value={stopFilter}
            onChange={(e) => setStopFilter(e.target.value)}
            className="rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-700 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          >
            <option value="">All Stops</option>
            {stops.map((s) => (
              <option key={s.id} value={s.id}>
                {s.city}, {s.state} · {s.date}
              </option>
            ))}
          </select>
          <div className="relative flex-1">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="search"
              placeholder="Search name, phone, or order #..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-white pl-11 pr-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Pending Orders */}
        {filteredPending.length === 0 ? (
          <div className="rounded-2xl bg-white border border-stone-200 py-16 text-center">
            <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-stone-100 flex items-center justify-center">
              <svg className="h-6 w-6 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-lg font-medium text-stone-600">No pending orders</p>
            <p className="mt-1 text-sm text-stone-400">Orders awaiting pickup will appear here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPending.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                canManagePickup={canManagePickup}
                onMarkPickup={handleMarkPickup}
                pickingUp={pickingUp}
                shortId={shortId(order.id)}
              />
            ))}
          </div>
        )}

        {/* Picked Up Toggle */}
        {hasAnyPickedUp && (
          <button
            onClick={() => setShowPickedUp((v) => !v)}
            className="w-full rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
          >
            {showPickedUp ? "▼ Hide" : "▶ Show"} {pickedUpOrders.length} picked up
          </button>
        )}

        {showPickedUp && filteredPickedUp.length > 0 && (
          <div className="space-y-3">
            {filteredPickedUp.map((order) => (
              <PickedUpCard
                key={order.id}
                order={order}
                shortId={shortId(order.id)}
              />
            ))}
          </div>
        )}

        {showPickedUp && filteredPickedUp.length === 0 && stopFilter && (
          <div className="rounded-xl border border-stone-200 bg-stone-50 py-6 text-center text-sm text-stone-500">
            No picked-up orders for this stop
          </div>
        )}

        {/* Toast */}
        {pickupToast && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-200/50">
            ✓ Order picked up
          </div>
        )}
      </main>
    </div>
  );
}

type OrderCardProps = {
  order: Order;
  canManagePickup: boolean;
  onMarkPickup: (orderId: string) => void;
  pickingUp: string | null;
  shortId: string;
};

function OrderCard({ order, canManagePickup, onMarkPickup, pickingUp, shortId }: OrderCardProps) {
  const allItems = order.order_items ?? [];
  const pickupItems = allItems.filter((i) => i.fulfillment !== "shipping");
  const shippingItems = allItems.filter((i) => i.fulfillment === "shipping");
  const isMixed = pickupItems.length > 0 && shippingItems.length > 0;
  const pickupTotal = pickupItems.reduce((sum, i) => sum + Number(i.price) * i.quantity, 0);

  return (
    <div className="rounded-2xl bg-white border border-stone-200 p-6 shadow-sm">
      {/* Header row */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-lg font-semibold text-stone-950">{order.customer_name}</p>
          {order.customer_phone && (
            <p className="mt-0.5 text-sm text-stone-500">{order.customer_phone}</p>
          )}
          <p className="mt-1 font-mono text-xs text-stone-400 uppercase">{shortId}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
            Pending
          </span>
          {isMixed && (
            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700">
              Mixed
            </span>
          )}
        </div>
      </div>

      {/* Items */}
      {pickupItems.length > 0 && (
        <div className="mt-5 rounded-xl bg-stone-50 border border-stone-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">
              Pickup Items
            </span>
            <span className="text-xs text-stone-400">
              {pickupItems.reduce((s, i) => s + i.quantity, 0)} total
            </span>
          </div>
          <ul className="space-y-2">
            {pickupItems.map((item) => (
              <li key={item.id} className="flex items-center justify-between text-sm">
                <span className="text-stone-700">
                  {item.quantity > 1 && (
                    <span className="font-semibold text-stone-900">{item.quantity}× </span>
                  )}
                  {item.products?.name ?? "Unknown Product"}
                </span>
                <span className="text-stone-500 font-medium">
                  ${(Number(item.price) * item.quantity).toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-3 border-t border-stone-200 pt-3 flex justify-between">
            <span className="text-sm font-medium text-stone-600">Subtotal</span>
            <span className="text-sm font-bold text-stone-900">${pickupTotal.toFixed(2)}</span>
          </div>
        </div>
      )}

      {/* Shipping warning */}
      {isMixed && (
        <div className="mt-4 rounded-lg bg-violet-50 border border-violet-100 px-4 py-3 text-sm text-violet-700">
          {shippingItems.length} shipping item{shippingItems.length > 1 ? "s" : ""} will also be marked picked up
        </div>
      )}

      {/* Footer */}
      <div className="mt-5 flex items-center justify-between">
        <div>
          {order.stops ? (
            <>
              <p className="font-medium text-stone-700">{order.stops.city}, {order.stops.state}</p>
              <p className="text-sm text-stone-400">
                {pickupItems.length} pickup {pickupItems.length === 1 ? "item" : "items"}
              </p>
            </>
          ) : (
            <p className="text-stone-400">No stop assigned</p>
          )}
        </div>
        <p className="text-2xl font-bold text-stone-950">${pickupTotal.toFixed(2)}</p>
      </div>

      {/* Actions */}
      {canManagePickup ? (
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Link
            href={`/admin/orders/${order.id}`}
            className="flex items-center justify-center rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors"
          >
            View Details
          </Link>
          <button
            onClick={() => onMarkPickup(order.id)}
            disabled={pickingUp === order.id}
            className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {pickingUp === order.id ? (
              "..."
            ) : (
              <>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Pick Up
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="mt-5 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-center text-sm text-stone-400">
          No pickup permission
        </div>
      )}
    </div>
  );
}

type PickedUpCardProps = {
  order: Order;
  shortId: string;
};

function PickedUpCard({ order, shortId }: PickedUpCardProps) {
  const allItems = order.order_items ?? [];
  const pickupItems = allItems.filter((i) => i.fulfillment === "pickup");
  const pickupTotal = pickupItems.reduce((s, i) => s + Number(i.price) * i.quantity, 0);
  const isMixed = allItems.some((i) => i.fulfillment === "shipping");

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-stone-900">{order.customer_name}</p>
          {order.customer_phone && (
            <p className="mt-0.5 text-sm text-stone-500">{order.customer_phone}</p>
          )}
          <p className="mt-1 text-xs text-stone-400">
            {shortId} · {order.stops?.city}, {order.stops?.state}
          </p>
          {pickupItems.length > 0 && (
            <ul className="mt-3 space-y-1">
              {pickupItems.map((item) => (
                <li key={item.id} className="text-sm text-stone-600">
                  {item.quantity > 1 && <span className="font-semibold">{item.quantity}× </span>}
                  {item.products?.name ?? "Unknown"}
                  <span className="ml-2 text-stone-400">${(Number(item.price) * item.quantity).toFixed(2)}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs text-stone-500">
            {pickupItems.reduce((s, i) => s + i.quantity, 0)} items · ${pickupTotal.toFixed(2)}
            {isMixed && <span className="ml-2 text-violet-600">· mixed</span>}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
            Picked Up
          </span>
          {order.pickup_completed_at && (
            <p className="text-xs text-stone-400">{formatPickupTime(order.pickup_completed_at)}</p>
          )}
        </div>
      </div>
    </div>
  );
}