"use client";

import { useState, useEffect, useRef } from "react";
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

  // Same year — show mon/day
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

  const activeStopFilter = stopFilter;

  const filteredPending = pendingOrders.filter((o) => {
    const matchesSearch =
      !search ||
      o.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      (o.customer_phone ?? "").includes(search) ||
      o.id.includes(search.toUpperCase().slice(0, 8));

    const matchesStop = !activeStopFilter || o.stop_id === activeStopFilter;

    return matchesSearch && matchesStop;
  });

  const filteredPickedUp = pickedUpOrders.filter((o) => {
    const matchesSearch =
      !search ||
      o.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      (o.customer_phone ?? "").includes(search) ||
      o.id.includes(search.toUpperCase().slice(0, 8));

    const matchesStop = !activeStopFilter || o.stop_id === activeStopFilter;

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
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <div className="bg-slate-900 px-4 py-5">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Driver Pickup</h1>
              <p className="mt-1 text-sm text-slate-400">
                {filteredPending.length} pending
                {hasAnyPickedUp && ` · ${pickedUpOrders.length} picked up`}
              </p>
            </div>
            <Link
              href="/admin/orders"
              className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-600"
            >
              All Orders
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-4 space-y-4">
        {/* Stop Filter */}
        <select
          value={stopFilter}
          onChange={(e) => setStopFilter(e.target.value)}
          className="w-full rounded-xl border border-zinc-600 bg-zinc-900 px-4 py-4 text-base font-medium outline-none focus:border-slate-900"
        >
          <option value="">All Stops</option>
          {stops.map((s) => (
            <option key={s.id} value={s.id}>
              {s.city}, {s.state} · {s.date}
            </option>
          ))}
        </select>

        {/* Search */}
        <input
          type="search"
          placeholder="Search name, phone, or order #..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-zinc-600 bg-zinc-900 px-4 py-4 text-base outline-none focus:border-slate-900"
        />

        {/* Pending Orders */}
        <div className="space-y-3">
          {filteredPending.length === 0 ? (
            <div className="rounded-xl bg-zinc-900 py-12 text-center text-slate-400">
              No pending orders
            </div>
          ) : (
            filteredPending.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                canManagePickup={canManagePickup}
                onMarkPickup={handleMarkPickup}
                pickingUp={pickingUp}
                shortId={shortId(order.id)}
              />
            ))
          )}
        </div>

        {/* Picked Up Toggle */}
        {hasAnyPickedUp && (
          <button
            onClick={() => setShowPickedUp((v) => !v)}
            className="w-full rounded-xl border border-green-200 bg-green-900/30 px-4 py-3 text-sm font-medium text-green-400 hover:bg-green-900/40"
          >
            {showPickedUp ? "▲ Hide" : "▼"} {pickedUpOrders.length} picked up
          </button>
        )}

        {showPickedUp && (
          <div className="space-y-3">
            {filteredPickedUp.length === 0 && activeStopFilter ? (
              <div className="rounded-xl border border-green-200 bg-green-900/30 py-6 text-center text-sm text-green-600">
                No picked-up orders for this stop. {pickedUpOrders.length} picked up at other stops.
              </div>
            ) : (
              filteredPickedUp.map((order) => (
                <PickedUpCard
                  key={order.id}
                  order={order}
                  shortId={shortId(order.id)}
                />
              ))
            )}
          </div>
        )}

        {/* Success toast */}
        {pickupToast && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-xl bg-green-600 px-6 py-3 text-sm font-semibold text-white shadow-lg animate-in fade-in slide-in-from-bottom-2">
            ✓ Order picked up
          </div>
        )}
      </div>
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
    <div className="rounded-2xl bg-zinc-900 p-5 shadow-black/20 ring-1 ring-zinc-700">
      {/* Top row: name + order # */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xl font-bold text-zinc-100">{order.customer_name}</p>
          {order.customer_phone && (
            <p className="mt-1 text-base text-zinc-400">{order.customer_phone}</p>
          )}
          <p className="mt-1 font-mono text-xs text-slate-400 uppercase">{shortId}</p>
        </div>
        <div className="text-right shrink-0 flex flex-col items-end gap-1">
          <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-bold text-yellow-800">
            Pending
          </span>
          {isMixed && (
            <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-700">
              Mixed order
            </span>
          )}
        </div>
      </div>

      {/* Products list — pickup items only */}
      {pickupItems.length > 0 && (
        <div className="mt-4 rounded-lg bg-slate-50 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Pickup items ({pickupItems.reduce((s, i) => s + i.quantity, 0)} total)
          </p>
          <ul className="space-y-1">
            {pickupItems.map((item) => (
              <li key={item.id} className="flex items-center justify-between text-sm">
                <span className="text-zinc-300">
                  {item.quantity > 1 && (
                    <span className="font-semibold text-zinc-100">{item.quantity}× </span>
                  )}
                  {item.products?.name ?? "Unknown Product"}
                </span>
                <span className="text-zinc-500">
                  ${(Number(item.price) * item.quantity).toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-2 border-t border-zinc-800 pt-2 flex justify-between">
            <span className="text-sm font-medium text-zinc-400">Pickup subtotal</span>
            <span className="text-sm font-bold text-zinc-100">${pickupTotal.toFixed(2)}</span>
          </div>
        </div>
      )}

      {/* Shipping items note */}
      {isMixed && (
        <div className="mt-3 rounded-lg bg-purple-50 border border-purple-100 px-3 py-2 text-sm text-purple-700">
          ⚠ {shippingItems.length} shipping item{shippingItems.length > 1 ? "s" : ""} — will also be marked picked up
        </div>
      )}

      {/* Middle: stop + items count */}
      <div className="mt-4 flex items-center justify-between">
        <div>
          {order.stops ? (
            <p className="font-medium text-zinc-300">
              {order.stops.city}, {order.stops.state}
            </p>
          ) : (
            <p className="text-slate-400">No stop</p>
          )}
          <p className="text-sm text-slate-400">
            {pickupItems.length} pickup {pickupItems.length === 1 ? "item" : "items"}
            {isMixed && ` · ${shippingItems.length} shipping`}
          </p>
        </div>
        <p className="text-3xl font-bold text-zinc-100">
          ${pickupTotal.toFixed(2)}
        </p>
      </div>

      {/* Pickup Button */}
      {canManagePickup ? (
        <div className="mt-4 flex gap-2">
          <a
            href={`/admin/orders/${order.id}`}
            className="flex-1 rounded-xl border border-zinc-600 bg-zinc-900 px-4 py-4 text-center text-base font-semibold text-zinc-300 active:bg-slate-50"
            style={{ minHeight: "56px", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            View Details
          </a>
          <button
            onClick={() => onMarkPickup(order.id)}
            disabled={pickingUp === order.id}
            className="flex-1 rounded-xl bg-green-600 px-4 py-5 text-xl font-bold text-white active:bg-green-700 disabled:opacity-50"
            style={{ minHeight: "56px" }}
          >
            {pickingUp === order.id ? "..." : "✓ Pick Up"}
          </button>
        </div>
      ) : (
        <div className="mt-4 rounded-xl bg-zinc-950 px-4 py-3 text-center text-sm text-zinc-500">
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
    <div className="rounded-xl border border-green-200 bg-green-900/30 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold text-green-900">{order.customer_name}</p>
          {order.customer_phone && (
            <p className="text-sm text-green-400">{order.customer_phone}</p>
          )}
          <p className="mt-1 text-xs text-green-600">
            {shortId} · {order.stops?.city}, {order.stops?.state}
          </p>
          {pickupItems.length > 0 && (
            <ul className="mt-2 space-y-0.5">
              {pickupItems.map((item) => (
                <li key={item.id} className="text-xs text-green-400">
                  {item.quantity > 1 && <span className="font-semibold">{item.quantity}× </span>}
                  {item.products?.name ?? "Unknown"}
                  <span className="ml-1 text-green-500">${(Number(item.price) * item.quantity).toFixed(2)}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs font-semibold text-green-400">
            {pickupItems.reduce((s, i) => s + i.quantity, 0)} pickup items · ${pickupTotal.toFixed(2)}
            {isMixed && <span className="text-purple-600 ml-1">· mixed</span>}
          </p>
        </div>
        <div className="text-right shrink-0">
          <span className="rounded-full bg-green-200 px-3 py-1 text-xs font-bold text-green-800">
            Picked Up
          </span>
          {order.pickup_completed_at && (
            <p className="mt-1 text-xs text-green-600">
              {formatPickupTime(order.pickup_completed_at)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}