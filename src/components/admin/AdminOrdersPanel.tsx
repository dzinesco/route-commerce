"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import Link from "next/link";
import { markPickupComplete } from "@/actions/pickup";
import { formatDate } from "@/lib/format-date";
import AdminBadge from "./design-system/AdminBadge";
import { AdminButton, AdminSearchInput, AdminFilterTabs, AdminIconButton, useToast } from "./design-system";
import { Skeleton } from "./design-system";

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
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

// Icons
const Icons = {
  mapPin: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"/>
      <path d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0z"/>
    </svg>
  ),
  check: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  x: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  chevronDown: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6"/>
    </svg>
  ),
  chevronLeft: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 18-6-6 6-6"/>
    </svg>
  ),
  chevronRight: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6"/>
    </svg>
  ),
  package: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16.5 9.4 7.55 4.24"/>
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
      <polyline points="3.29 7 12 12 20.71 7"/>
      <line x1="12" y1="22" x2="12" y2="12"/>
    </svg>
  ),
  selectAll: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
      <polyline points="9 11 12 14 22 4"/>
    </svg>
  ),
};

export default function AdminOrdersPanel({
  initialOrders,
  initialStops,
  brandId,
}: AdminOrdersPanelProps) {
  const { success: showSuccess, error: showError } = useToast();
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [stops] = useState<Stop[]>(initialStops);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<StatusTab>("all");
  const [selectedStops, setSelectedStops] = useState<string[]>([]);
  const [showStopDropdown, setShowStopDropdown] = useState(false);
  const [pickingUp, setPickingUp] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [bulkMarkingUp, setBulkMarkingUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const PAGE_SIZE = 20;

  // Simulate loading when orders change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 300);
    return () => clearTimeout(timer);
  }, [page, activeTab, search, selectedStops.length]);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (activeTab === "pending" && order.pickup_complete) return false;
      if (activeTab === "picked_up" && !order.pickup_complete) return false;
      if (selectedStops.length > 0 && order.stop_id && !selectedStops.includes(order.stop_id)) return false;
      if (search.trim()) {
        const s = search.toLowerCase();
        if (!order.customer_name.toLowerCase().includes(s) &&
            !(order.customer_phone ?? "").toLowerCase().includes(s) &&
            !order.id.toLowerCase().includes(s)) return false;
      }
      return true;
    });
  }, [orders, activeTab, selectedStops, search]);

  const totalPages = Math.ceil(filteredOrders.length / PAGE_SIZE);
  const paginatedOrders = filteredOrders.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const pendingCount = orders.filter((o) => !o.pickup_complete).length;
  const pickedUpCount = orders.filter((o) => o.pickup_complete).length;

  // Bulk selection
  const toggleSelectAll = useCallback(() => {
    if (selectedOrders.size === paginatedOrders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(paginatedOrders.map(o => o.id)));
    }
  }, [selectedOrders.size, paginatedOrders]);

  const toggleOrderSelection = useCallback((orderId: string) => {
    setSelectedOrders(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  }, []);

  function toggleStop(stopId: string) {
    setSelectedStops((prev) =>
      prev.includes(stopId) ? prev.filter((id) => id !== stopId) : [...prev, stopId]
    );
    setPage(0);
  }

  function clearStops() {
    setSelectedStops([]);
    setPage(0);
  }

  async function handleMarkPickup(orderId: string) {
    setPickingUp(orderId);
    const result = await markPickupComplete(orderId, brandId);
    if (result.success) {
      showSuccess("Pickup confirmed", `${result.pickup_completed_at ? 'Order marked as picked up' : 'Success'}`);
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, pickup_complete: true, pickup_completed_at: result.pickup_completed_at, pickup_completed_by: result.pickup_completed_by }
            : o
        )
      );
    } else {
      showError("Failed to mark pickup", result.error ?? "Please try again");
    }
    setPickingUp(null);
  }

  async function handleBulkMarkPickup() {
    if (selectedOrders.size === 0) return;
    
    setBulkMarkingUp(true);
    let successCount = 0;
    let failCount = 0;
    
    for (const orderId of selectedOrders) {
      const result = await markPickupComplete(orderId, brandId);
      if (result.success) {
        successCount++;
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId
              ? { ...o, pickup_complete: true, pickup_completed_at: result.pickup_completed_at, pickup_completed_by: result.pickup_completed_by }
              : o
          )
        );
      } else {
        failCount++;
      }
    }
    
    setBulkMarkingUp(false);
    setSelectedOrders(new Set());
    
    if (failCount === 0) {
      showSuccess(`${successCount} order${successCount !== 1 ? 's' : ''} marked as picked up`);
    } else {
      showError("Some orders failed", `${successCount} succeeded, ${failCount} failed`);
    }
  }

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--admin-accent)]">
            {Icons.package("h-5 w-5 text-white")}
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[var(--admin-text-primary)]">Orders</h2>
            <p className="text-[10px] sm:text-xs text-[var(--admin-text-muted)]">
              {filteredOrders.length} order{filteredOrders.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        {brandId && (
          <AdminBadge variant="info">Brand scoped</AdminBadge>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-[var(--admin-border)] p-4">
          <p className="text-[10px] sm:text-xs text-[var(--admin-text-muted)] font-medium">Total</p>
          <p className="text-lg sm:text-xl md:text-2xl font-bold text-[var(--admin-text-primary)] mt-1">{isLoading ? <Skeleton variant="text" className="w-16 h-8" /> : orders.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-[var(--admin-border)] p-4">
          <p className="text-[10px] sm:text-xs text-[var(--admin-text-muted)] font-medium">Pending</p>
          <p className="text-lg sm:text-xl md:text-2xl font-bold text-amber-600 mt-1">{isLoading ? <Skeleton variant="text" className="w-12 h-8" /> : pendingCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-[var(--admin-border)] p-4">
          <p className="text-[10px] sm:text-xs text-[var(--admin-text-muted)] font-medium">Picked Up</p>
          <p className="text-lg sm:text-xl md:text-2xl font-bold text-[var(--admin-accent)] mt-1">{isLoading ? <Skeleton variant="text" className="w-12 h-8" /> : pickedUpCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Status Tabs */}
        <AdminFilterTabs
          activeTab={activeTab}
          onTabChange={(value) => { setActiveTab(value as StatusTab); setPage(0); }}
          tabs={[
            { value: "all", label: "All", count: filteredOrders.length },
            { value: "pending", label: "Pending", count: pendingCount },
            { value: "picked_up", label: "Picked Up", count: pickedUpCount },
          ]}
          size="md"
        />

        {/* Search */}
        <AdminSearchInput
          placeholder="Search name, phone, or order #..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          onClear={() => { setSearch(""); setPage(0); }}
          showClear={true}
        />

        {/* Stop Filter */}
        <div className="relative">
          <button
            onClick={() => setShowStopDropdown(!showStopDropdown)}
            className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors ${
              selectedStops.length > 0
                ? "border-[var(--admin-accent)] bg-[var(--admin-accent-light)] text-[var(--admin-accent-text)]"
                : "border-[var(--admin-border)] bg-white text-stone-600 hover:bg-stone-50"
            }`}
          >
            {Icons.mapPin("h-4 w-4")}
            <span>Stops</span>
            {selectedStops.length > 0 && (
              <span className="rounded-full bg-[var(--admin-accent)] text-white px-1.5 py-0.5 text-xs font-semibold">{selectedStops.length}</span>
            )}
            {Icons.chevronDown("h-4 w-4")}
          </button>

          {showStopDropdown && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowStopDropdown(false)} />
              <div className="absolute right-0 top-full mt-2 z-20 w-72 rounded-xl border border-[var(--admin-border)] bg-white shadow-lg">
                <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
                  <span className="text-sm font-semibold text-stone-700">Filter by Stop</span>
                  <button onClick={clearStops} className="text-xs text-[var(--admin-accent)] hover:text-[var(--admin-accent-hover)] font-medium">Clear all</button>
                </div>
                <div className="max-h-64 overflow-y-auto p-2">
                  {stops.map((stop) => (
                    <label key={stop.id} className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-stone-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedStops.includes(stop.id)}
                        onChange={() => toggleStop(stop.id)}
                        className="h-4 w-4 rounded border-stone-300 text-[var(--admin-accent)] focus:ring-[var(--admin-accent)]"
                      />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-stone-700">{stop.city}, {stop.state}</span>
                        <span className="ml-2 text-xs text-stone-400">{formatDate(stop.date)}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Selected stop chips */}
      {selectedStops.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {selectedStops.map((stopId) => {
            const stop = stops.find((s) => s.id === stopId);
            if (!stop) return null;
            return (
              <span key={stopId} className="inline-flex items-center gap-1 rounded-full bg-[var(--admin-accent-light)] border border-[var(--admin-accent)] px-3 py-1 text-xs font-medium text-[var(--admin-accent-text)]">
                {stop.city}, {stop.state}
                <button onClick={() => toggleStop(stopId)} className="ml-1 hover:text-[var(--admin-accent-hover)]">
                  {Icons.x("h-3 w-3")}
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Bulk actions bar */}
      {selectedOrders.size > 0 && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-[var(--admin-accent)] bg-[var(--admin-accent-light)] px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-[var(--admin-accent-text)]">
              {selectedOrders.size} order{selectedOrders.size !== 1 ? 's' : ''} selected
            </span>
            <button
              onClick={() => setSelectedOrders(new Set())}
              className="text-xs text-[var(--admin-text-muted)] hover:text-[var(--admin-text-secondary)]"
            >
              Clear
            </button>
          </div>
          <AdminButton
            variant="primary"
            size="sm"
            onClick={handleBulkMarkPickup}
            isLoading={bulkMarkingUp}
            icon={Icons.check("h-4 w-4")}
          >
            Mark All as Picked Up
          </AdminButton>
        </div>
      )}

      {/* Orders Table */}
      {isLoading ? (
        <div className="rounded-xl border border-[var(--admin-border)] bg-white p-6">
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton variant="rect" className="h-5 w-5 rounded" />
                <Skeleton variant="text" className="flex-1" />
                <Skeleton variant="text" className="w-24" />
                <Skeleton variant="text" className="w-16" />
              </div>
            ))}
          </div>
        </div>
      ) : paginatedOrders.length === 0 ? (
        <div className="text-center py-12 rounded-xl border border-[var(--admin-border)] bg-white">
          <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-stone-100 mb-4">
            {Icons.package("h-8 w-8 text-stone-400")}
          </div>
          <p className="text-sm font-medium text-stone-600">No orders found</p>
          <p className="text-xs text-stone-400 mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--admin-border)] bg-white">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-stone-50">
              <tr className="border-b border-[var(--admin-border)]">
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedOrders.size === paginatedOrders.length && paginatedOrders.length > 0}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-stone-300 text-[var(--admin-accent)] focus:ring-[var(--admin-accent)] cursor-pointer"
                  />
                </th>
                <th className="text-left px-4 py-3 font-semibold text-[var(--admin-text-muted)] text-xs">Order</th>
                <th className="text-left px-4 py-3 font-semibold text-[var(--admin-text-muted)] text-xs">Customer</th>
                <th className="text-left px-4 py-3 font-semibold text-[var(--admin-text-muted)] text-xs hidden md:table-cell">Stop</th>
                <th className="text-left px-4 py-3 font-semibold text-[var(--admin-text-muted)] text-xs hidden lg:table-cell">Date</th>
                <th className="text-center px-4 py-3 font-semibold text-[var(--admin-text-muted)] text-xs">Items</th>
                <th className="text-right px-4 py-3 font-semibold text-[var(--admin-text-muted)] text-xs">Total</th>
                <th className="text-center px-4 py-3 font-semibold text-[var(--admin-text-muted)] text-xs">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--admin-border)]">
              {paginatedOrders.map((order) => (
                <tr key={order.id} className="hover:bg-stone-50 transition-colors">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedOrders.has(order.id)}
                      onChange={() => toggleOrderSelection(order.id)}
                      className="h-4 w-4 rounded border-stone-300 text-[var(--admin-accent)] focus:ring-[var(--admin-accent)] cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/orders/${order.id}`} className="font-mono text-xs text-[var(--admin-accent)] hover:text-[var(--admin-accent-hover)]">
                      {shortId(order.id)}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-[var(--admin-text-primary)]">{order.customer_name}</div>
                    {order.customer_phone && <div className="font-mono text-xs text-stone-400">{order.customer_phone}</div>}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {order.stops ? (
                      <span className="text-sm text-[var(--admin-text-primary)]">{order.stops.city}, {order.stops.state}</span>
                    ) : (
                      <span className="text-stone-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className="text-sm text-stone-500">{formatDate(order.created_at)}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-mono text-sm text-stone-600">{order.order_items?.length ?? 0}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-mono font-semibold text-[var(--admin-text-primary)]">{formatCurrency(order.subtotal)}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {order.pickup_complete ? (
                        <AdminBadge variant="success" dot>Picked Up</AdminBadge>
                      ) : (
                        <AdminBadge variant="warning" dot>Pending</AdminBadge>
                      )}
                      {order.payment_processor === "square" && (
                        <AdminBadge variant="info">Square</AdminBadge>
                      )}
                      {!order.pickup_complete && (
                        <AdminButton
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMarkPickup(order.id)}
                          disabled={pickingUp === order.id}
                          isLoading={pickingUp === order.id}
                        >
                          {pickingUp === order.id ? "..." : "Pick Up"}
                        </AdminButton>
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
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--admin-border)]">
          <p className="text-xs text-[var(--admin-text-muted)]">
            Showing {(page * PAGE_SIZE) + 1} to {Math.min((page + 1) * PAGE_SIZE, filteredOrders.length)} of {filteredOrders.length}
          </p>
          <div className="flex items-center gap-2">
            <AdminIconButton
              variant="secondary"
              size="sm"
              label="Previous page"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="!rounded-lg"
            >
              {Icons.chevronLeft("h-4 w-4")}
            </AdminIconButton>
            <span className="px-3 text-sm font-medium text-stone-700">{page + 1} / {totalPages}</span>
            <AdminIconButton
              variant="secondary"
              size="sm"
              label="Next page"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="!rounded-lg"
            >
              {Icons.chevronRight("h-4 w-4")}
            </AdminIconButton>
          </div>
        </div>
      )}
    </div>
  );
}
