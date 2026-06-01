"use client";

import { useState } from "react";
import { formatDate } from "@/lib/format-date";

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

  async function togglePickup(orderId: string, current: boolean) {
    setPickupToggles((prev) => ({ ...prev, [orderId]: !current }));
    await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/orders?id=eq.${orderId}`,
      {
        method: "PATCH",
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({ pickup_complete: !current }),
      }
    );
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
      {orders.map((order) => (
        <tr key={order.id} className="hover:bg-zinc-800">
          <td className="px-5 py-4">
            <span className="font-mono text-sm text-zinc-500">
              {order.id.slice(0, 8)}
            </span>
          </td>

          <td className="px-5 py-4">
            <div className="font-medium text-zinc-100">
              {order.customer_name}
            </div>
            <div className="text-sm text-zinc-500">
              {order.customer_email}
            </div>
          </td>

          <td className="px-5 py-4">
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                statusColors[order.status] ?? "bg-zinc-950 text-zinc-400"
              }`}
            >
              {order.status ?? "pending"}
            </span>
          </td>

          <td className="px-5 py-4 font-semibold text-zinc-100">
            ${Number(order.subtotal).toFixed(2)}
          </td>

          <td className="px-5 py-4">
            <button
              onClick={() => togglePickup(order.id, pickupToggles[order.id])}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                pickupToggles[order.id]
                  ? "bg-green-900/40 text-green-400"
                  : "bg-zinc-950 text-zinc-500"
              }`}
            >
              {pickupToggles[order.id] ? "Picked up" : "Pending"}
            </button>
          </td>

          <td className="px-5 py-4 text-sm text-zinc-500">
            {formatDate(new Date(order.created_at))}
          </td>
        </tr>
      ))}
    </tbody>
  );
}