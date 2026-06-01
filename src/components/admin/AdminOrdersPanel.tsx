"use client";

import { useState, useMemo, useCallback } from "react";
import { markPickupComplete } from "@/actions/pickup";
import { formatDate } from "@/lib/format-date";

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

type StatusTab = "all" | "pending" | "picked_up";

function shortId(id: string) {
  return id.slice(0, 8).toUpperCase();
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
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
  const [activeTab, setActiveTab] = useState<StatusTab>("all");
  const [selectedStops, setSelectedStops] = useState<string[]>([]);
  const [showStopDropdown, setShowStopDropdown] = useState(false);
  const [pickingUp, setPickingUp] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [pickupToast, setPickupToast] = useState<string | null>(null);
  const PAGE_SIZE = 20;

  // Filter orders based on all criteria
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Status filter
      if (activeTab === "pending" && order.pickup_complete) return false;
      if (activeTab === "picked_up" && !order.pickup_complete) return false;

      // Stop filter
      if (selectedStops.length > 0 && order.stop_id && !selectedStops.includes(order.stop_id)) {
        return false;
      }

      // Search filter
      if (search.trim()) {
        const searchLower = search.toLowerCase();
        const matchesName = order.customer_name.toLowerCase().includes(searchLower);
        const matchesPhone = (order.customer_phone ?? "").toLowerCase().includes(searchLower);
        const matchesId = order.id.toLowerCase().includes(searchLower);
        if (!matchesName && !matchesPhone && !matchesId) return false;
      }

      return true;
    });
  }, [orders, activeTab, selectedStops, search]);

  // Pagination
  const totalFiltered = filteredOrders.length;
  const totalPages = Math.ceil(totalFiltered / PAGE_SIZE);
  const paginatedOrders = filteredOrders.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Stats
  const pendingCount = orders.filter((o) => !o.pickup_complete).length;
  const pickedUpCount = orders.filter((o) => o.pickup_complete).length;

  // Toggle stop selection
  const toggleStop = useCallback((stopId: string) => {
    setSelectedStops((prev) =>
      prev.includes(stopId) ? prev.filter((id) => id !== stopId) : [...prev, stopId]
    );
    setPage(0);
  }, []);

  // Clear all stop filters
  const clearStopFilters = useCallback(() => {
    setSelectedStops([]);
    setPage(0);
  }, []);

  // Handle tab change
  const handleTabChange = useCallback((tab: StatusTab) => {
    setActiveTab(tab);
    setPage(0);
  }, []);

  // Handle search
  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    setPage(0);
  }, []);

  // Handle pickup
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

  return (
    <div className="min-h-screen bg-stone-50 px-6 py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-stone-950">Orders</h1>
              <div className="mt-2 flex items-center gap-4">
                <span className="text-sm text-stone-500">
                  <span className="font-medium text-stone-700">{pendingCount}</span> pending
                </span>
                <span className="text-sm text-stone-500">
                  <span className="font-medium text-stone-700">{pickedUpCount}</span> picked up
                </span>
                {brandId && (
                  <span className="rounded-full bg-violet-50 border border-violet-200 px-2.5 py-0.5 text-xs font-medium text-violet-700">
                    Brand scoped
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-4">
            {/* Status Tabs */}
            <div className="flex items-center gap-1 rounded-xl border border-stone-200 bg-stone-50 p-1">
              {(["all", "pending", "picked_up"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => handleTabChange(tab)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                    activeTab === tab
                      ? "bg-white text-emerald-700 shadow-sm border border-emerald-200"
                      : "text-stone-600 hover:text-stone-900 hover:bg-white/50"
                  }`}
                >
                  {tab === "all" ? "All" : tab === "pending" ? "Pending" : "Picked Up"}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative flex-1 min-w-64">
              <svg
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="search"
                placeholder="Search by name, phone, or order #..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full rounded-xl border border-stone-200 bg-white pl-10 pr-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
              />
            </div>

            {/* Stop Multi-Select */}
            <div className="relative">
              <button
                onClick={() => setShowStopDropdown(!showStopDropdown)}
                className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
                  selectedStops.length > 0
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-stone-200 bg-white text-stone-600 hover:border-stone-300"
                }`}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
                <span>Stops</span>
                {selectedStops.length > 0 && (
                  <span className="rounded-full bg-emerald-600 text-white px-1.5 py-0.5 text-xs font-semibold">
                    {selectedStops.length}
                  </span>
                )}
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showStopDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowStopDropdown(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 z-20 w-72 rounded-xl border border-stone-200 bg-white shadow-lg">
                    <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
                      <span className="text-sm font-semibold text-stone-700">Filter by Stop</span>
                      <button
                        onClick={clearStopFilters}
                        className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                      >
                        Clear all
                      </button>
                    </div>
                    <div className="max-h-64 overflow-y-auto p-2">
                      {stops.map((stop) => (
                        <label
                          key={stop.id}
                          className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-stone-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedStops.includes(stop.id)}
                            onChange={() => toggleStop(stop.id)}
                            className="h-4 w-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
                          />
                          <div className="flex-1">
                            <span className="text-sm font-medium text-stone-700">
                              {stop.city}, {stop.state}
                            </span>
                            <span className="ml-2 text-xs text-stone-400">
                              {formatDate(stop.date)}
                            </span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Results count */}
            <div className="ml-auto text-sm text-stone-500">
              {totalFiltered} order{totalFiltered !== 1 ? "s" : ""}
            </div>
          </div>

          {/* Selected stop chips */}
          {selectedStops.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs text-stone-500">Selected:</span>
              {selectedStops.map((stopId) => {
                const stop = stops.find((s) => s.id === stopId);
                if (!stop) return null;
                return (
                  <span
                    key={stopId}
                    className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-200 px-3 py-1 text-xs font-medium text-emerald-700"
                  >
                    {stop.city}, {stop.state}
                    <button
                      onClick={() => toggleStop(stopId)}
                      className="ml-1 hover:text-emerald-900"
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* Orders Table */}
        {paginatedOrders.length === 0 ? (
          <div className="rounded-2xl border border-stone-200 bg-white py-16 text-center shadow-sm">
            <svg
              className="mx-auto h-12 w-12 text-stone-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.801 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"
              />
            </svg>
            <p className="mt-4 text-sm font-medium text-stone-500">No orders found</p>
            <p className="mt-1 text-xs text-stone-400">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
            <table className="w-full">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50">
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                    Order
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                    Customer
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-stone-500 hidden md:table-cell">
                    Stop
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-stone-500 hidden lg:table-cell">
                    Date
                  </th>
                  <th className="px-5 py-4 text-center text-xs font-semibold uppercase tracking-wide text-stone-500">
                    Items
                  </th>
                  <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-stone-500">
                    Total
                  </th>
                  <th className="px-5 py-4 text-center text-xs font-semibold uppercase tracking-wide text-stone-500">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {paginatedOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="hover:bg-stone-50 transition-colors"
                  >
                    {/* Order ID */}
                    <td className="px-5 py-4">
                      <span className="font-mono text-sm text-stone-600">{shortId(order.id)}</span>
                    </td>

                    {/* Customer */}
                    <td className="px-5 py-4">
                      <div className="font-medium text-stone-900">{order.customer_name}</div>
                      {order.customer_phone && (
                        <div className="font-mono text-xs text-stone-400">{order.customer_phone}</div>
                      )}
                    </td>

                    {/* Stop */}
                    <td className="px-5 py-4 hidden md:table-cell">
                      {order.stops ? (
                        <span className="text-sm text-stone-600">
                          {order.stops.city}, {order.stops.state}
                        </span>
                      ) : (
                        <span className="text-stone-300">—</span>
                      )}
                    </td>

                    {/* Date */}
                    <td className="px-5 py-4 hidden lg:table-cell">
                      <span className="text-sm text-stone-500">{formatDate(order.created_at)}</span>
                    </td>

                    {/* Items */}
                    <td className="px-5 py-4 text-center">
                      <span className="font-mono text-sm text-stone-600">
                        {order.order_items?.length ?? 0}
                      </span>
                    </td>

                    {/* Total */}
                    <td className="px-5 py-4 text-right">
                      <span className="font-mono font-semibold text-stone-900">
                        {formatCurrency(order.subtotal)}
                      </span>
                    </td>

                    {/* Status & Actions */}
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            order.pickup_complete
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : "bg-amber-100 text-amber-800 border border-amber-200"
                          }`}
                        >
                          {order.pickup_complete ? "Picked Up" : "Pending"}
                        </span>
                        {order.payment_processor === "square" && (
                          <span className="rounded-full bg-violet-100 border border-violet-200 px-1.5 py-0.5 text-xs font-semibold text-violet-700">
                            Square
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-stone-500">
              Showing {(page * PAGE_SIZE) + 1} to {Math.min((page + 1) * PAGE_SIZE, totalFiltered)} of {totalFiltered}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 text-stone-500 hover:border-stone-300 hover:text-stone-700 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                aria-label="Previous page"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="px-3 text-sm font-medium text-stone-700">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 text-stone-500 hover:border-stone-300 hover:text-stone-700 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                aria-label="Next page"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Pickup Toast */}
        {pickupToast && (
          <div className="fixed bottom-6 right-6 z-50 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100">
                <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="font-medium text-emerald-800">Pickup confirmed!</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}