"use client";

import { useState } from "react";
import Link from "next/link";
import { updateShippingStatus } from "@/actions/shipping";
import { getFedExRates, type FedExRate, type FedExServiceType } from "@/actions/shipping/fedex-rates";
import { createFedExShipment } from "@/actions/shipping/fedex-labels";

type OrderItem = {
  id: string;
  product_id: string;
  quantity: number;
  price: number;
  fulfillment: string;
  products: { name: string; is_perishable: boolean } | null;
};

type ShippingOrder = {
  id: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  status: string;
  subtotal: number;
  shipping_status: string;
  tracking_number: string | null;
  created_at: string;
  brand_id: string | null;
  order_items: OrderItem[];
};

type ShippingFulfillmentPanelProps = {
  initialOrders: ShippingOrder[];
  canManageOrders: boolean;
};

const SHIPPING_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "label_created", label: "Label Created" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "returned", label: "Returned" },
];

const SERVICE_LABELS: Record<FedExServiceType, string> = {
  FEDEX_OVERNIGHT: "FedEx Overnight",
  FEDEX_2_DAY_AIR: "FedEx 2-Day Air",
  FEDEX_EXPRESS_SAVER: "FedEx Express Saver",
  FEDEX_GROUND: "FedEx Ground",
};

function shortId(id: string) {
  return id.slice(0, 8).toUpperCase();
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    label_created: "bg-blue-900/40 text-blue-800",
    shipped: "bg-indigo-100 text-indigo-800",
    delivered: "bg-green-900/40 text-green-800",
    returned: "bg-red-900/40 text-red-800",
  };
  const cls = map[status] ?? "bg-zinc-950 text-zinc-300";
  const label = SHIPPING_STATUSES.find((s) => s.value === status)?.label ?? status;
  return { cls, label };
}

// ── Rate Modal ────────────────────────────────────────────────────────────────

function RateModal({
  order,
  onClose,
}: {
  order: ShippingOrder;
  onClose: () => void;
}) {
  const [rates, setRates] = useState<FedExRate[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState<FedExServiceType | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [result, setResult] = useState<{ labelUrl: string; trackingNumber: string } | null>(null);

  const loadRates = async () => {
    setLoading(true);
    setError(null);
    const res = await getFedExRates(order.id);
    setLoading(false);
    if (res.success) {
      setRates(res.rates);
    } else {
      setError(res.error ?? "Failed to load rates");
    }
  };

  const handleSelectRate = async (rate: FedExRate) => {
    setCreating(rate.serviceType);
    setCreateError(null);
    const res = await createFedExShipment(
      order.id,
      rate.serviceType,
      rate.totalCharge,
      rate.deliveryDate
    );
    setCreating(null);
    if (res.success) {
      setResult({ labelUrl: res.labelUrl, trackingNumber: res.trackingNumber });
    } else {
      setCreateError(res.error ?? "Failed to create shipment");
    }
  };

  // Auto-load on mount
  if (rates === null && !loading && !error) {
    loadRates();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-2xl bg-zinc-900 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4 sticky top-0 bg-zinc-900 rounded-t-2xl">
          <div>
            <h2 className="text-lg font-semibold text-zinc-100">Shipping Rates</h2>
            <p className="text-sm text-zinc-500">
              {order.customer_name} · {shortId(order.id)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-zinc-400 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Perishable warning */}
          {rates !== null && rates[0]?.isPerishableOnly && (
            <div className="rounded-lg bg-blue-900/30 border border-blue-200 px-4 py-3 text-sm text-blue-700">
              <strong>Perishable shipment.</strong> Only Overnight and 2-Day Air are available
              for fresh produce (sweet corn, onions, etc.). Ground and Express Saver are not
              offered for temperature-sensitive items.
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
              <span className="ml-3 text-zinc-500">Fetching FedEx rates...</span>
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-900/30 border border-red-200 px-4 py-3 text-sm text-red-400">
              {error}
              <button
                onClick={loadRates}
                className="ml-2 underline hover:no-underline"
              >
                Retry
              </button>
            </div>
          )}

          {rates !== null && rates.length === 0 && !loading && (
            <div className="text-center py-8 text-zinc-500">
              No FedEx rates available for this address. Please verify the shipping address.
            </div>
          )}

          {rates !== null && rates.length > 0 && (
            <div className="space-y-2">
              {rates.map((rate) => (
                <button
                  key={rate.serviceType}
                  onClick={() => handleSelectRate(rate)}
                  disabled={creating !== null}
                  className="w-full flex items-center justify-between rounded-xl border border-zinc-800 px-4 py-3 text-left hover:border-blue-400 hover:bg-blue-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div>
                    <div className="font-semibold text-zinc-100">
                      {SERVICE_LABELS[rate.serviceType] ?? rate.serviceType}
                    </div>
                    <div className="text-sm text-zinc-500">
                      {rate.deliveryDateLabel
                        ? `Arrives ${rate.deliveryDateLabel}`
                        : rate.deliveryDayOfWeek}
                    </div>
                    {rate.isPerishableOnly && (
                      <span className="mt-1 inline-block rounded-full bg-blue-900/40 text-blue-700 px-2 py-0.5 text-xs font-medium">
                        Required for perishable
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-zinc-100">
                      ${(rate.totalCharge / 100).toFixed(2)}
                    </div>
                    {creating === rate.serviceType && (
                      <div className="h-4 w-4 rounded-full border-2 border-blue-600 border-t-transparent animate-spin mt-1 mx-auto" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {createError && (
            <div className="rounded-lg bg-red-900/30 border border-red-200 px-4 py-3 text-sm text-red-400">
              {createError}
            </div>
          )}

          {result && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-4 space-y-3">
              <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                <span className="text-lg">✓</span> Label Created
              </div>
              <div className="text-sm text-emerald-600">
                <div>Tracking: <span className="font-mono font-medium">{result.trackingNumber}</span></div>
              </div>
              <div className="flex gap-2">
                {result.labelUrl && (
                  <a
                    href={result.labelUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                  >
                    Download Label
                  </a>
                )}
                <button
                  onClick={onClose}
                  className="inline-flex items-center rounded-lg border border-zinc-600 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Panel ────────────────────────────────────────────────────────────────

export default function ShippingFulfillmentPanel({
  initialOrders,
  canManageOrders,
}: ShippingFulfillmentPanelProps) {
  const [orders, setOrders] = useState<ShippingOrder[]>(initialOrders);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);
  const [trackingInputs, setTrackingInputs] = useState<Record<string, string>>({});
  const [rateModalOrder, setRateModalOrder] = useState<ShippingOrder | null>(null);

  const filtered = orders.filter((o) => {
    const matchesSearch =
      !search ||
      o.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      (o.customer_phone ?? "").includes(search) ||
      o.id.includes(search.toUpperCase().slice(0, 8));

    const matchesStatus = !statusFilter || o.shipping_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const counts = SHIPPING_STATUSES.reduce(
    (acc, s) => {
      acc[s.value] = orders.filter((o) => o.shipping_status === s.value).length;
      return acc;
    },
    {} as Record<string, number>
  );

  async function handleStatusChange(orderId: string, newStatus: string) {
    if (!canManageOrders) return;
    setUpdating(orderId);

    const trackingNumber =
      newStatus === "shipped" ? trackingInputs[orderId] ?? null : null;

    const result = await updateShippingStatus(orderId, newStatus, trackingNumber ?? undefined);

    if (result.success) {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, shipping_status: newStatus, tracking_number: trackingNumber ?? o.tracking_number }
            : o
        )
      );
    }

    setUpdating(null);
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <div className="bg-slate-900 px-4 py-5">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Shipping Fulfillment</h1>
              <p className="mt-1 text-sm text-slate-400">
                {orders.length} shipping order{orders.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/admin/orders"
                className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-600"
              >
                All Orders
              </Link>
              <Link
                href="/admin/pickup"
                className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-600"
              >
                Pickup
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-4 space-y-4">
        {/* Status filter pills */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setStatusFilter("")}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              !statusFilter ? "bg-slate-900 text-white" : "bg-zinc-900 text-zinc-400"
            }`}
          >
            All ({orders.length})
          </button>
          {SHIPPING_STATUSES.map((s) => (
            <button
              key={s.value}
              onClick={() => setStatusFilter(s.value)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                statusFilter === s.value ? "bg-slate-900 text-white" : "bg-zinc-900 text-zinc-400"
              }`}
            >
              {s.label} ({counts[s.value] ?? 0})
            </button>
          ))}
        </div>

        {/* Search */}
        <input
          type="search"
          placeholder="Search name, phone, or order #..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-zinc-600 bg-zinc-900 px-4 py-4 text-base outline-none focus:border-slate-900"
        />

        {/* Orders */}
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="rounded-xl bg-zinc-900 py-12 text-center text-slate-400">
              No shipping orders
            </div>
          ) : (
            filtered.map((order) => {
              const { cls, label } = statusBadge(order.shipping_status);
              const hasShipItems = order.order_items.some((i) => i.fulfillment === "ship");
              const hasPerishableItems = order.order_items.some(
                (i) => i.fulfillment === "ship" && i.products?.is_perishable
              );
              const isPending = order.shipping_status === "pending" || order.shipping_status === "label_created";

              return (
                <div key={order.id} className="rounded-2xl bg-zinc-900 p-5 shadow-black/20 ring-1 ring-zinc-700">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xl font-bold text-zinc-100">{order.customer_name}</p>
                      {order.customer_phone && (
                        <p className="mt-1 text-base text-zinc-400">{order.customer_phone}</p>
                      )}
                      <p className="mt-1 font-mono text-xs text-slate-400 uppercase">{shortId(order.id)}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${cls}`}>
                      {label}
                    </span>
                  </div>

                  {/* Perishable indicator */}
                  {hasPerishableItems && isPending && (
                    <div className="mt-3 rounded-lg bg-blue-900/30 border border-blue-200 px-3 py-2 text-xs text-blue-700 font-medium">
                      🌽 Perishable — Overnight or 2-Day Air only
                    </div>
                  )}

                  {/* Tracking number */}
                  {order.tracking_number && (
                    <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm flex items-center justify-between">
                      <div>
                        <span className="text-zinc-500">Tracking: </span>
                        <span className="font-mono font-medium text-zinc-300">{order.tracking_number}</span>
                      </div>
                      {order.shipping_status === "label_created" && (
                        <button
                          onClick={() => handleStatusChange(order.id, "shipped")}
                          disabled={updating === order.id}
                          className="text-xs rounded-lg bg-indigo-600 px-3 py-1.5 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                        >
                          {updating === order.id ? "..." : "Mark Shipped"}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Items */}
                  {order.order_items.filter((i) => i.fulfillment === "ship").length > 0 && (
                    <div className="mt-4 rounded-lg bg-slate-50 p-3">
                      <ul className="space-y-1">
                        {order.order_items
                          .filter((i) => i.fulfillment === "ship")
                          .map((item) => (
                            <li key={item.id} className="flex items-center justify-between text-sm">
                              <span className="text-zinc-300">
                                {item.quantity > 1 && (
                                  <span className="font-semibold text-zinc-100">{item.quantity}× </span>
                                )}
                                {item.products?.name ?? "Unknown Product"}
                                {item.products?.is_perishable && (
                                  <span className="ml-1.5 text-xs text-blue-400">🌽 perishable</span>
                                )}
                              </span>
                              <span className="text-zinc-500">
                                ${(Number(item.price) * item.quantity).toFixed(2)}
                              </span>
                            </li>
                          ))}
                      </ul>
                      <div className="mt-2 border-t border-zinc-800 pt-2 flex justify-between">
                        <span className="text-sm font-medium text-zinc-400">Subtotal</span>
                        <span className="text-sm font-bold text-zinc-100">${Number(order.subtotal).toFixed(2)}</span>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  {canManageOrders && hasShipItems && isPending && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {/* Get Rates / Create Label */}
                      {order.shipping_status === "pending" && (
                        <button
                          onClick={() => setRateModalOrder(order)}
                          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                        >
                          Get FedEx Rates
                        </button>
                      )}

                      {/* Manual tracking input (fallback) */}
                      {(order.shipping_status === "pending" ||
                        order.shipping_status === "label_created") && (
                        <input
                          type="text"
                          placeholder="Enter tracking manually"
                          value={trackingInputs[order.id] ?? ""}
                          onChange={(e) =>
                            setTrackingInputs((prev) => ({ ...prev, [order.id]: e.target.value }))
                          }
                          className="flex-1 min-w-[160px] rounded-lg border border-zinc-600 px-3 py-2 text-sm outline-none focus:border-slate-900"
                        />
                      )}

                      {/* Status transitions */}
                      {SHIPPING_STATUSES.filter(
                        (s) =>
                          s.value !== order.shipping_status &&
                          s.value !== "label_created" // handled by create label flow
                      ).map((s) => (
                        <button
                          key={s.value}
                          onClick={() => handleStatusChange(order.id, s.value)}
                          disabled={updating === order.id}
                          className="rounded-xl border border-zinc-600 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
                        >
                          {updating === order.id ? "..." : `Mark ${s.label}`}
                        </button>
                      ))}
                    </div>
                  )}

                  {!canManageOrders && (
                    <div className="mt-4 rounded-xl bg-zinc-950 px-4 py-3 text-center text-sm text-zinc-500">
                      No order management permission
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Rate Modal */}
      {rateModalOrder && (
        <RateModal order={rateModalOrder} onClose={() => setRateModalOrder(null)} />
      )}
    </div>
  );
}