"use client";

import { useState } from "react";
import { formatDate } from "@/lib/format-date";
import { toggleOrderPickupComplete } from "@/actions/orders";

type Order = {
  id: string;
  customer_name: string;
  customer_email: string | null;
  stop_id: string;
  status: string;
  subtotal: number;
  pickup_complete: boolean;
  created_at: string;
};

export default function OrderTableBody({ orders }: { orders: Order[] }) {
  const [pickupToggles, setPickupToggles] = useState<Record<string, boolean>>(
    () => Object.fromEntries(orders.map((o) => [o.id, o.pickup_complete]))
  );
  const [error, setError] = useState<string | null>(null);

  async function togglePickup(orderId: string, current: boolean) {
    const next = !current;
    setPickupToggles((prev) => ({ ...prev, [orderId]: next }));
    setError(null);
    const result = await toggleOrderPickupComplete({ orderId, pickupComplete: next });
    if (!result.success) {
      // Revert optimistic update on failure
      setPickupToggles((prev) => ({ ...prev, [orderId]: current }));
      setError(result.error);
    }
  }

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    confirmed: "bg-blue-900/40 text-blue-700",
    paid: "bg-green-900/40 text-green-400",
    cancelled: "bg-red-900/40 text-red-400",
    completed: "bg-zinc-950 text-zinc-400",
  };

  return (
    <tbody className="divide-y divide-slate-200">
      {error && (
        <tr>
          <td colSpan={6} className="px-3 py-2 text-sm text-red-400">
            {error}
          </td>
        </tr>
      )}
      {orders.map((order) => (
        <tr key={order.id} className="hover:bg-zinc-800">
          <td className="px-3 py-2">
            <span className="font-mono text-sm text-zinc-500">
              {order.id.slice(0, 8)}
            </span>
          </td>

          <td className="px-3 py-2">
            <div className="font-medium text-zinc-100">
              {order.customer_name}
            </div>
            <div className="text-sm text-zinc-500">
              {order.customer_email}
            </div>
          </td>

          <td className="px-3 py-2">
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                statusColors[order.status] ?? "bg-zinc-950 text-zinc-400"
              }`}
            >
              {order.status ?? "pending"}
            </span>
          </td>

          <td className="px-3 py-2 font-semibold text-zinc-100">
            ${Number(order.subtotal).toFixed(2)}
          </td>

          <td className="px-3 py-2">
            <button
              onClick={() => togglePickup(order.id, pickupToggles[order.id])}
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                pickupToggles[order.id]
                  ? "bg-green-900/40 text-green-400"
                  : "bg-zinc-950 text-zinc-500"
              }`}
            >
              {pickupToggles[order.id] ? "Picked up" : "Pending"}
            </button>
          </td>

          <td className="px-3 py-2 text-sm text-zinc-500">
            {formatDate(new Date(order.created_at))}
          </td>
        </tr>
      ))}
    </tbody>
  );
}
