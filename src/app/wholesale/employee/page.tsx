"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  type WholesaleOrder,
  getWholesalePickupOrders,
  markWholesaleOrderFulfilled,
} from "@/actions/wholesale";
import DepositModal from "@/components/wholesale/DepositModal";
import OrderDetailsModal from "@/components/wholesale/OrderDetailsModal";

type Queue = "past_due" | "today" | "upcoming";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    awaiting_deposit: "bg-purple-100 text-purple-700",
    confirmed: "bg-blue-100 text-blue-700",
    fulfilled: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${map[status] ?? "bg-slate-100 text-slate-600"}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

export default function EmployeePortalPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<WholesaleOrder[]>([]);
  const [activeTab, setActiveTab] = useState<Queue>("today");
  const [showViewOrder, setShowViewOrder] = useState<WholesaleOrder | null>(null);
  const [showDepForm, setShowDepForm] = useState<string | null>(null);
  const [fulfilling, setFulfilling] = useState<string | null>(null);
  const [openActions, setOpenActions] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [brandName, setBrandName] = useState("");
  const [employeeName, setEmployeeName] = useState("");

  useEffect(() => {
    // Auth check via employee_session cookie — dedicated for store employees
    const cookies = document.cookie.split(";").reduce((acc, c) => {
      const [k, v] = c.trim().split("=");
      acc[k] = decodeURIComponent(v);
      return acc;
    }, {} as Record<string, string>);

    const session = cookies["employee_session"];
    if (!session) {
      router.push("/wholesale/login");
      return;
    }

    let userId: string;
    let brandId: string;
    let empName: string;
    let brandNameVal = "Pickup Portal";
    try {
      const parsed = JSON.parse(session);
      userId = parsed.user_id;
      brandId = parsed.brand_id;
      empName = parsed.name || parsed.email || "Employee";
      brandNameVal = parsed.brand_name || "Pickup Portal";
    } catch {
      router.push("/wholesale/login");
      return;
    }

    setBrandName(brandNameVal);
    setEmployeeName(empName);

    getWholesalePickupOrders(brandId).then((data) => {
      setOrders(data);
      setLoading(false);
    });
  }, [router]);

  async function handleSignOut() {
    document.cookie = "employee_session=; path=/; max-age=0";
    document.cookie = "dev_session=; path=/; max-age=0";
    router.push("/wholesale/login");
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!(e.target as Element).closest(".actions-cell")) {
        setOpenActions(null);
      }
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  const today = new Date().toISOString().split("T")[0];

  const pastDue = orders.filter((o) => o.anticipated_pickup_date && o.anticipated_pickup_date < today);
  const todayOrders = orders.filter((o) => o.anticipated_pickup_date === today);
  const upcoming = orders.filter((o) => o.anticipated_pickup_date && o.anticipated_pickup_date > today);

  const tabData: Record<Queue, { label: string; orders: WholesaleOrder[]; color: string; bg: string }> = {
    past_due: { label: "Past Due", orders: pastDue, color: "text-red-700", bg: "bg-red-50 border-red-200" },
    today: { label: "Today", orders: todayOrders, color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200" },
    upcoming: { label: "Upcoming", orders: upcoming, color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
  };

  const currentTab = tabData[activeTab];

  async function handleFulfill(orderId: string) {
    setFulfilling(orderId);
    const result = await markWholesaleOrderFulfilled(orderId);
    setFulfilling(null);
    if (result.success) {
      setMsg({ kind: "success", text: "Order marked as fulfilled." });
      // Reload orders using employee_session brand_id
      const cookies = document.cookie.split(";").reduce((acc, c) => {
        const [k, v] = c.trim().split("=");
        acc[k] = decodeURIComponent(v);
        return acc;
      }, {} as Record<string, string>);
      const session = cookies["employee_session"];
      if (session) {
        const { brand_id } = JSON.parse(session);
        const data = await getWholesalePickupOrders(brand_id);
        setOrders(data);
      }
    } else {
      setMsg({ kind: "error", text: result.error ?? "Failed to fulfill order." });
    }
    setTimeout(() => setMsg(null), 4000);
  }

  if (loading) {
    return <EmployeePortalSkeleton />;
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 sm:px-6 sm:py-4">
        <div className="mx-auto max-w-5xl flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 truncate">Pickup Portal</h1>
            <p className="mt-0.5 text-xs sm:text-sm text-slate-500 truncate">{brandName}</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs sm:text-sm text-slate-500 hidden sm:inline">{employeeName}</span>
            <button
              onClick={handleSignOut}
              className="rounded-xl border border-slate-300 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors min-h-[40px]"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Queue tabs */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <nav className="flex gap-1 -mb-px overflow-x-auto">
            {(["past_due", "today", "upcoming"] as Queue[]).map((tab) => {
              const data = tabData[tab];
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                    isActive
                      ? tab === "past_due" ? "border-red-500 text-red-700" :
                        tab === "today" ? "border-yellow-500 text-yellow-700" :
                        "border-blue-500 text-blue-700"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {data.label}
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                    tab === "past_due" ? "bg-red-100 text-red-700" :
                    tab === "today" ? "bg-yellow-100 text-yellow-700" :
                    "bg-blue-100 text-blue-700"
                  }`}>
                    {data.orders.length}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-6">
        {msg && (
          <div className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
            msg.kind === "success" ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700"
          }`}>
            {msg.text}
          </div>
        )}

        {currentTab.orders.length === 0 ? (
          <EmptyQueueState
            label={currentTab.label === "Past Due" ? "No past due orders" :
                   currentTab.label === "Today" ? "No pickups scheduled today" :
                   "No upcoming pickups"}
            description={currentTab.label === "Past Due" ?
              "All orders are on schedule. Great work!" :
              currentTab.label === "Today" ?
              "There are no wholesale orders scheduled for pickup today." :
              "You have no upcoming pickups scheduled."}
          />
        ) : (
          <div className="space-y-3">
            {currentTab.orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                fulfilling={fulfilling}
                openActions={openActions}
                onToggleActions={() => {
                  setOpenActions(openActions === order.id ? null : order.id);
                }}
                onFulfill={handleFulfill}
                onRecordDeposit={() => setShowDepForm(order.id)}
                onViewDetails={() => setShowViewOrder(order)}
                onGenerateManifest={() => {
                  const w = window.open("", "_blank");
                  if (w) {
                    const cookies = document.cookie.split(";").reduce((acc, c) => {
                      const [k, v] = c.trim().split("=");
                      acc[k] = decodeURIComponent(v);
                      return acc;
                    }, {} as Record<string, string>);
                    const session = cookies["employee_session"];
                    const parsed = session ? JSON.parse(session) : {};
                    const bId = parsed.brand_id ?? "";
                    fetch("/api/wholesale/manifest", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ brandId: bId, orders: [order] }),
                    }).then(r => r.text()).then(html => { w.document.write(html); w.document.close(); });
                  }
                }}
                onSendPriceSheet={() => {
                  fetch("/api/wholesale/price-sheet", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ customerIds: [order.customer_id], brandId: "" }),
                  }).then(r => r.json()).then(d => {
                    setMsg({ kind: "success", text: `Price sheet sent to ${order.company_name}.` });
                  }).catch(() => setMsg({ kind: "error", text: "Failed to send price sheet." }));
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showViewOrder && (
        <OrderDetailsModal
          order={showViewOrder}
          onClose={() => setShowViewOrder(null)}
          onFulfill={handleFulfill}
          onRecordDeposit={(id) => { setShowViewOrder(null); setShowDepForm(id); }}
          fulfilling={fulfilling}
        />
      )}

      {showDepForm && (() => {
        const order = orders.find(o => o.id === showDepForm);
        if (!order) return null;
        return (
          <DepositModal
            order={order}
            onClose={() => setShowDepForm(null)}
            onFulfilled={async () => {
              setMsg({ kind: "success", text: "Deposit recorded." });
              const cookies = document.cookie.split(";").reduce((acc, c) => {
                const [k, v] = c.trim().split("=");
                acc[k] = decodeURIComponent(v);
                return acc;
              }, {} as Record<string, string>);
              const session = cookies["employee_session"];
              if (session) {
                const { brand_id } = JSON.parse(session);
                const data = await getWholesalePickupOrders(brand_id);
                setOrders(data);
              }
            }}
          />
        );
      })()}
    </div>
  );
}

// ── Loading Skeleton ──────────────────────────────────────────────────────────
function EmployeePortalSkeleton() {
  return (
    <div className="min-h-screen bg-slate-100">
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="mx-auto max-w-5xl flex items-center justify-between">
          <div className="space-y-2 animate-pulse">
            <div className="h-7 w-40 bg-slate-200 rounded" />
            <div className="h-4 w-32 bg-slate-100 rounded" />
          </div>
          <div className="h-10 w-24 bg-slate-200 rounded-xl" />
        </div>
      </div>
      <div className="bg-white border-b border-slate-200 px-6">
        <div className="mx-auto max-w-5xl">
          <div className="flex gap-1 -mb-px py-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-9 w-20 bg-slate-200 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-5xl px-6 py-6 space-y-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 animate-pulse">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2 flex-1">
                <div className="h-5 w-40 bg-slate-200 rounded" />
                <div className="h-4 w-56 bg-slate-100 rounded" />
                <div className="h-3 w-32 bg-slate-100 rounded" />
              </div>
              <div className="flex gap-2">
                <div className="h-9 w-16 bg-slate-200 rounded-xl" />
                <div className="h-9 w-16 bg-slate-200 rounded-xl" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Empty State ──────────────────────────────────────────────────────────────
function EmptyQueueState({ label, description }: { label: string; description: string }) {
  return (
    <div className="rounded-2xl bg-white p-12 text-center shadow-sm ring-1 ring-slate-200">
      <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
        </svg>
      </div>
      <p className="text-lg font-semibold text-slate-700 mb-2">{label}</p>
      <p className="text-sm text-slate-500 max-w-xs mx-auto">{description}</p>
    </div>
  );
}

// ── Order Card ────────────────────────────────────────────────────────────────

function OrderCard({
  order,
  fulfilling,
  openActions,
  onToggleActions,
  onFulfill,
  onRecordDeposit,
  onViewDetails,
  onGenerateManifest,
  onSendPriceSheet,
}: {
  order: WholesaleOrder;
  fulfilling: string | null;
  openActions: string | null;
  onToggleActions: () => void;
  onFulfill: (id: string) => void;
  onRecordDeposit: () => void;
  onViewDetails: () => void;
  onGenerateManifest: () => void;
  onSendPriceSheet?: () => void;
}) {
  const hasPhone = Boolean(order.customer_phone);

  return (
    <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 overflow-hidden hover:ring-slate-300 transition-shadow">
      {/* Card header */}
      <div className="px-4 py-4 sm:px-5 sm:py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex-1 min-w-0 w-full">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-900 text-sm sm:text-base">{order.company_name}</span>
            <StatusBadge status={order.status} />
            <span className={`text-xs font-medium ${order.payment_status === "paid" ? "text-green-600" : "text-orange-600"}`}>
              {order.payment_status === "paid" ? "Paid" : `$${Number(order.balance_due).toFixed(2)} due`}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {order.contact_name ?? ""}
            {hasPhone ? (
              <> · <a href={`tel:${order.customer_phone}`} className="hover:underline">{order.customer_phone}</a></>
            ) : (
              <> · <a href={`mailto:${order.customer_email}`} className="hover:underline">{order.customer_email}</a></>
            )}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            {order.invoice_number ?? order.id.slice(0, 8)} · Pickup: {order.anticipated_pickup_date ?? "—"}
          </p>
        </div>

        {/* Inline action buttons */}
        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
          {order.fulfillment_status !== "fulfilled" && (
            <button
              onClick={() => !fulfilling && onFulfill(order.id)}
              disabled={fulfilling === order.id}
              title="Mark as fulfilled"
              className="inline-flex items-center gap-1.5 rounded-xl bg-green-600 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-green-700 disabled:opacity-40 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              {fulfilling === order.id ? "..." : "Fulfill"}
            </button>
          )}
          {Number(order.balance_due) > 0 && order.fulfillment_status !== "fulfilled" && (
            <button
              onClick={onRecordDeposit}
              title="Record deposit"
              className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-purple-700 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-9-9h18" /></svg>
              Deposit
            </button>
          )}
          <a
            href={`/api/wholesale/invoice/${order.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            title="Download Invoice (PDF)"
            className="inline-flex items-center justify-center rounded-xl w-9 h-9 text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h9m-9-6h6m-3 12a9 9 0 110 12H15M6 2h9l4 4v14a2 2 0 01-2 2H6a2 2 0 01-2-2V4a2 2 0 012-2z"/></svg>
          </a>
          <div className="relative">
            <button
              onClick={onToggleActions}
              title="More actions"
              className="inline-flex items-center justify-center rounded-xl w-9 h-9 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><circle cx="10" cy="4" r="1.5"/><circle cx="10" cy="10" r="1.5"/><circle cx="10" cy="16" r="1.5"/></svg>
            </button>
            {openActions === order.id && (
              <div
                className="absolute bottom-full right-0 mb-1 z-30 w-56 rounded-xl bg-white shadow-xl ring-1 ring-slate-200 py-1 text-sm"
                onClick={e => e.stopPropagation()}
              >
                <button onClick={() => { onToggleActions(); onViewDetails(); }} className="w-full text-left px-4 py-3 text-slate-700 hover:bg-slate-50 flex items-center gap-3">
                  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                  View Details
                </button>
                <button onClick={() => { onToggleActions(); onGenerateManifest(); }} className="w-full text-left px-4 py-3 text-slate-700 hover:bg-slate-50 flex items-center gap-3">
                  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h9m-9-6h6m-3 12a9 9 0 01-18 0 9 9 0 0118 0z"/></svg>
                  Generate Manifest
                </button>
                <div className="my-1 border-t border-slate-100" />
                <button
                  onClick={() => { onToggleActions(); onSendPriceSheet?.(); }}
                  className="w-full text-left px-4 py-3 text-slate-700 hover:bg-slate-50 flex items-center gap-3"
                >
                  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                  Send Price Sheet
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Line items summary */}
      {order.items && order.items.length > 0 && (
        <div className="px-4 pb-4 sm:px-5 sm:pb-4">
          <div className="rounded-xl bg-slate-50 border border-slate-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-slate-500">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-xs">Product</th>
                  <th className="px-4 py-2 text-right font-medium text-xs">Qty</th>
                  <th className="px-4 py-2 text-right font-medium text-xs">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {order.items.map((item, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2 text-slate-700 text-xs">{item.product_name}</td>
                    <td className="px-4 py-2 text-right text-slate-600 text-xs">{item.quantity}</td>
                    <td className="px-4 py-2 text-right font-medium text-slate-900 text-xs">${Number(item.line_total).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
