"use client";

import { useState, useEffect, useRef } from "react";
import crypto from "crypto";
import {
  type WholesaleOrder,
  type WholesaleCustomer,
  type WholesaleProduct,
  type WholesaleSettings,
  type WholesaleDashboardStats,
  type NotificationRecipient,
  getWholesaleOrders,
  getWholesaleCustomers,
  getWholesaleProducts,
  getWholesaleSettings,
  getWholesaleDashboardStats,
  markWholesaleOrderFulfilled,
  updateWholesaleOrderStatus,
  deleteWholesaleOrder,
  deleteWholesaleCustomer,
  deleteWholesaleProduct,
  saveWholesaleCustomer,
  saveWholesaleProduct,
  saveWholesaleSettings,
  recordWholesaleDeposit,
  bulkFulfillWholesaleOrders,
  bulkRecordWholesaleDeposit,
  enqueueWholesaleNotification,
  getWebhookSettings,
  saveWebhookSettings,
  enqueueWholesaleWebhook,
  getRecentWebhookActivity,
} from "@/actions/wholesale";
import DepositModal from "@/components/wholesale/DepositModal";
import OrderDetailsModal from "@/components/wholesale/OrderDetailsModal";
import { getPendingWholesaleRegistrations, approveWholesaleRegistration, getWholesaleCustomerPricing, upsertWholesaleCustomerPricing, deleteWholesaleCustomerPricing } from "@/actions/wholesale-register";
import { getCurrentAdminUser } from "@/actions/admin-user";
import { type AdminUser } from "@/lib/admin-permissions";
import { formatDate } from "@/lib/format-date";

type Tab = "dashboard" | "customers" | "products" | "orders" | "settings";

export default function WholesaleClient({ brandId }: { brandId: string }) {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [msg, setMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);

  // Data state
  const [orders, setOrders] = useState<WholesaleOrder[]>([]);
  const [customers, setCustomers] = useState<WholesaleCustomer[]>([]);
  const [products, setProducts] = useState<WholesaleProduct[]>([]);
  const [settings, setSettings] = useState<WholesaleSettings | null>(null);
  const [stats, setStats] = useState<WholesaleDashboardStats | null>(null);
  const [registrations, setRegistrations] = useState<Array<{
    id: string; company_name: string | null; contact_name: string | null;
    email: string; phone: string | null; account_status: string; created_at: string;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [webhookActivity, setWebhookActivity] = useState<Array<{
    id: string; event_type: string; order_id: string | null;
    status: string; attempts: number; created_at: string; response: string | null;
  }>>([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [au, o, c, p, s, st, r, wa] = await Promise.all([
        getCurrentAdminUser(),
        getWholesaleOrders(brandId),
        getWholesaleCustomers(brandId),
        getWholesaleProducts(brandId),
        getWholesaleSettings(brandId),
        getWholesaleDashboardStats(brandId),
        getPendingWholesaleRegistrations(brandId),
        getRecentWebhookActivity(brandId, 5),
      ]);
      setAdminUser(au);
      setOrders(o);
      setCustomers(c);
      setProducts(p);
      setSettings(s);
      setStats(st);
      setRegistrations(r as typeof registrations);
      setWebhookActivity(wa);
      setLoading(false);
    }
    load();
  }, [brandId]);

  function showMsg(kind: "success" | "error", text: string) {
    setMsg({ kind, text });
    setTimeout(() => setMsg(null), 4000);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <p className="text-stone-500">Loading wholesale data...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="bg-white border-b border-stone-200 px-6 py-5">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-stone-950 tracking-tight">Wholesale Portal</h1>
            <p className="mt-0.5 text-sm text-stone-500">Manage wholesale orders, customers, and products</p>
          </div>
        </div>
      </div>

      {/* Tab nav */}
      <div className="bg-white border-b border-stone-200 px-6">
        <div className="mx-auto max-w-7xl">
          <nav className="flex gap-1 -mb-px">
            {(["dashboard", "customers", "products", "orders", "settings"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                  tab === t
                    ? "border-emerald-500 text-emerald-700"
                    : "border-transparent text-stone-500 hover:text-stone-700"
                }`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-6">
        {msg && (
          <div className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
            msg.kind === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}>
            {msg.text}
          </div>
        )}

        {tab === "dashboard" && (
          <DashboardTab
            stats={stats!}
            recentOrders={orders.slice(0, 10)}
            brandId={brandId}
            onMsg={showMsg}
            webhookActivity={webhookActivity}
          />
        )}
        {tab === "customers" && (
          <CustomersTab
            customers={customers}
            products={products}
            brandId={brandId}
            onMsg={showMsg}
            registrations={registrations}
            onRefresh={async () => {
              const r = await getPendingWholesaleRegistrations(brandId);
              setRegistrations(r as typeof registrations);
            }}
          />
        )}
        {tab === "products" && (
          <ProductsTab
            products={products}
            brandId={brandId}
            onMsg={showMsg}
            onRefresh={async () => {
              const p = await getWholesaleProducts(brandId);
              setProducts(p);
            }}
          />
        )}
        {tab === "orders" && (
          <OrdersTab
            orders={orders}
            customers={customers}
            brandId={brandId}
            onMsg={showMsg}
            onRefresh={async () => {
              const o = await getWholesaleOrders(brandId);
              setOrders(o);
            }}
          />
        )}
        {tab === "settings" && (
          <SettingsTab
            settings={settings}
            brandId={brandId}
            onMsg={showMsg}
            onRefresh={async () => {
              const s = await getWholesaleSettings(brandId);
              setSettings(s);
            }}
            canManageSettings={adminUser?.can_manage_settings ?? false}
          />
        )}
      </div>
    </div>
  );
}

// ── Dashboard Tab ─────────────────────────────────────────────────────────────

function DashboardTab({ stats, recentOrders, brandId, onMsg, webhookActivity }: {
  stats: WholesaleDashboardStats;
  recentOrders: WholesaleOrder[];
  brandId: string;
  onMsg: (kind: "success" | "error", text: string) => void;
  webhookActivity: Array<{
    id: string; event_type: string; order_id: string | null;
    status: string; attempts: number; created_at: string; response: string | null;
  }>;
}) {
  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Open Orders", value: stats.open_orders, color: "bg-white border-stone-200" },
          { label: "Pickup Today", value: stats.pickup_today, color: "bg-white border-stone-200" },
          { label: "Past Due", value: stats.past_due, color: "bg-red-50 border-red-200" },
          { label: "Total Unpaid", value: `$${stats.total_unpaid.toFixed(2)}`, color: "bg-white border-stone-200" },
          { label: "Awaiting Deposit", value: stats.awaiting_deposit, color: "bg-amber-50 border-amber-200" },
          { label: "Fulfilled Today", value: stats.fulfilled_today, color: "bg-emerald-50 border-emerald-200" },
        ].map((card) => (
          <div key={card.label} className={`rounded-xl border p-4 shadow-sm ${card.color}`}>
            <p className="text-xs text-stone-500">{card.label}</p>
            <p className="mt-1 text-2xl font-bold text-stone-950">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Recent orders */}
      <div className="rounded-2xl bg-white border border-stone-200 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-950 mb-4">Recent Orders</h2>
        {recentOrders.length === 0 ? (
          <p className="text-sm text-stone-400 py-8 text-center">No wholesale orders yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-stone-500 border-b">
                  <th className="pb-3 font-medium">Invoice</th>
                  <th className="pb-3 font-medium">Customer</th>
                  <th className="pb-3 font-medium">Pickup Date</th>
                  <th className="pb-3 font-medium text-right">Total</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-stone-50">
                    <td className="py-3 font-mono text-xs text-stone-500">{order.invoice_number ?? "—"}</td>
                    <td className="py-3 font-medium text-stone-900">{order.company_name}</td>
                    <td className="py-3 text-stone-600">{order.anticipated_pickup_date ?? "—"}</td>
                    <td className="py-3 text-right font-semibold text-stone-950">${Number(order.subtotal).toFixed(2)}</td>
                    <td className="py-3">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="py-3">
                      <span className={`text-xs font-medium ${
                        order.payment_status === "paid" ? "text-emerald-600" : "text-amber-600"
                      }`}>
                        {order.payment_status === "paid" ? "Paid" : order.balance_due > 0 ? `$${Number(order.balance_due).toFixed(2)} due` : "Partial"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent webhook activity */}
      {webhookActivity.length > 0 && (
        <div className="rounded-2xl bg-white border border-stone-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-stone-950 mb-4">Recent Webhook Activity</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-zinc-500 border-b">
                  <th className="pb-3 font-medium">Event</th>
                  <th className="pb-3 font-medium">Order</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Attempts</th>
                  <th className="pb-3 font-medium">Sent At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {webhookActivity.map((entry) => (
                  <tr key={entry.id} className="hover:bg-zinc-800">
                    <td className="py-3">
                      <span className="font-mono text-xs bg-zinc-950 px-2 py-0.5 rounded">{entry.event_type}</span>
                    </td>
                    <td className="py-3 font-mono text-xs text-slate-400">{entry.order_id ? entry.order_id.slice(0, 8) : "—"}</td>
                    <td className="py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        entry.status === "sent" ? "bg-green-100 text-green-400" :
                        entry.status === "failed" ? "bg-red-100 text-red-400" :
                        entry.status === "retrying" ? "bg-yellow-100 text-yellow-700" :
                        "bg-zinc-950 text-zinc-400"
                      }`}>
                        {entry.status}
                      </span>
                    </td>
                    <td className="py-3 text-zinc-500">{entry.attempts}</td>
                    <td className="py-3 text-zinc-500">{new Date(entry.created_at).toLocaleString()}</td>
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

// ── Customers Tab ────────────────────────────────────────────────────────────

function CustomersTab({ customers, products, brandId, onMsg, registrations = [], onRefresh }: {
  customers: WholesaleCustomer[];
  products: WholesaleProduct[];
  brandId: string;
  onMsg: (kind: "success" | "error", text: string) => void;
  registrations?: Array<{
    id: string; company_name: string | null; contact_name: string | null;
    email: string; phone: string | null; account_status: string; created_at: string;
  }>;
  onRefresh: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<WholesaleCustomer | null>(null);
  const [subTab, setSubTab] = useState<"customers" | "registrations">("customers");
  const [form, setForm] = useState({
    companyName: "", contactName: "", email: "", phone: "",
    accountStatus: "active", creditLimit: 0,
    depositsEnabled: false, depositThreshold: "", depositPercentage: "",
    orderEmail: "", invoiceEmail: "", adminNotes: "",
  });
  const [saving, setSaving] = useState(false);
  const [processingReg, setProcessingReg] = useState<string | null>(null);
  const [pricingCustomer, setPricingCustomer] = useState<WholesaleCustomer | null>(null);
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set());
  const [sendingPriceSheet, setSendingPriceSheet] = useState(false);
  const [priceSheetTarget, setPriceSheetTarget] = useState<{
    customerIds: string[];
    defaultSubject: string;
  } | null>(null);
  const [openCustomerActions, setOpenCustomerActions] = useState<string | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<string | null>(null);

  function toggleSelectCustomer(id: string) {
    setSelectedCustomers(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAllCustomers() {
    if (selectedCustomers.size === customers.length) {
      setSelectedCustomers(new Set());
    } else {
      setSelectedCustomers(new Set(customers.map(c => c.id)));
    }
  }

  function openPriceSheetModal(customerIds: string[]) {
    const ids = customerIds;
    if (ids.length === 0) return;
    // Generate default subject from brand name in settings
    const brandName = ""; // will be filled by the API call
    setPriceSheetTarget({
      customerIds: ids,
      defaultSubject: `Wholesale Price Sheet — ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`,
    });
  }

  async function handleSendPriceSheet(customerId?: string) {
    const ids = customerId ? [customerId] : Array.from(selectedCustomers);
    if (ids.length === 0) return;
    openPriceSheetModal(ids);
  }

  async function handleConfirmPriceSheet(subject: string, customNote: string) {
    if (!priceSheetTarget) return;
    setSendingPriceSheet(true);
    setPriceSheetTarget(null);
    try {
      const res = await fetch("/api/wholesale/price-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerIds: priceSheetTarget.customerIds,
          brandId,
          subject,
          customNote: customNote || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        onMsg("success", `Price sheet sent to ${data.enqueued} customer(s).`);
        setSelectedCustomers(new Set());
      } else {
        onMsg("error", data.error ?? "Failed to send price sheet.");
      }
    } catch {
      onMsg("error", "Failed to send price sheet.");
    } finally {
      setSendingPriceSheet(false);
    }
  }

  async function handleApproveReject(regId: string, action: "approve" | "reject") {
    setProcessingReg(regId);
    const result = await approveWholesaleRegistration(regId, brandId, action);
    setProcessingReg(null);
    if (result.success) {
      onMsg("success", action === "approve" ? "Registration approved." : "Registration rejected.");
      onRefresh();
    } else {
      onMsg("error", result.error ?? "Failed to process registration.");
    }
  }

  // Close customer actions dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!(e.target as Element).closest(".customer-actions-cell")) {
        setOpenCustomerActions(null);
      }
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  function toggleCustomerActions(customerId: string, e: React.MouseEvent) {
    e.stopPropagation();
    setOpenCustomerActions(prev => prev === customerId ? null : customerId);
  }

  async function handleDeleteCustomer(customerId: string) {
    if (!confirm("Delete this customer? This cannot be undone. Customers with existing orders cannot be deleted.")) return;
    setDeletingCustomer(customerId);
    const result = await deleteWholesaleCustomer(customerId);
    setDeletingCustomer(null);
    if (result.success) {
      onMsg("success", "Customer deleted.");
      onRefresh();
    } else {
      onMsg("error", result.error ?? "Failed to delete customer.");
    }
  }

  async function handleSave() {
    setSaving(true);
    const result = await saveWholesaleCustomer({
      brandId,
      userId: editing?.user_id ?? undefined,
      companyName: form.companyName || undefined,
      contactName: form.contactName || undefined,
      email: form.email || undefined,
      phone: form.phone || undefined,
      accountStatus: form.accountStatus,
      creditLimit: form.creditLimit,
      depositsEnabled: form.depositsEnabled,
      depositThreshold: form.depositThreshold ? Number(form.depositThreshold) : undefined,
      depositPercentage: form.depositPercentage ? Number(form.depositPercentage) : undefined,
      orderEmail: form.orderEmail || undefined,
      invoiceEmail: form.invoiceEmail || undefined,
      adminNotes: form.adminNotes || undefined,
    });
    setSaving(false);
    if (result.success) {
      onMsg("success", editing ? "Customer updated." : "Customer created.");
      setShowForm(false);
      onRefresh();
    } else {
      onMsg("error", result.error ?? "Failed to save.");
    }
  }

  function openNew() {
    setEditing(null);
    setForm({ companyName: "", contactName: "", email: "", phone: "", accountStatus: "active", creditLimit: 0, depositsEnabled: false, depositThreshold: "", depositPercentage: "", orderEmail: "", invoiceEmail: "", adminNotes: "" });
    setShowForm(true);
  }

  function openEdit(c: WholesaleCustomer) {
    setEditing(c);
    setForm({
      companyName: c.company_name ?? "",
      contactName: c.contact_name ?? "",
      email: c.email ?? "",
      phone: c.phone ?? "",
      accountStatus: c.account_status ?? "active",
      creditLimit: Number(c.credit_limit),
      depositsEnabled: c.deposits_enabled,
      depositThreshold: c.deposit_threshold?.toString() ?? "",
      depositPercentage: c.deposit_percentage?.toString() ?? "",
      orderEmail: c.order_email ?? "",
      invoiceEmail: c.invoice_email ?? "",
      adminNotes: c.admin_notes ?? "",
    });
    setShowForm(true);
  }

  return (
    <div className="space-y-4">
      {/* Sub-tab nav */}
      <div className="flex items-center gap-4">
        <button onClick={() => setSubTab("customers")}
          className={`px-3 py-1.5 text-sm font-medium rounded-lg ${subTab === "customers" ? "bg-green-100 text-green-400" : "bg-zinc-950 text-zinc-400"}`}>
          Customers ({customers.filter(c => c.account_status !== "pending_approval" && c.account_status !== "rejected").length})
        </button>
        <button onClick={() => setSubTab("registrations")}
          className={`px-3 py-1.5 text-sm font-medium rounded-lg ${subTab === "registrations" ? "bg-green-100 text-green-400" : "bg-zinc-950 text-zinc-400"}`}>
          Registrations ({registrations.filter(r => r.account_status === "pending_approval").length})
        </button>
        {subTab === "customers" && (
          <button onClick={openNew}
            className="ml-auto rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700">
            + Add Customer
          </button>
        )}
      </div>

      {subTab === "registrations" && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-zinc-300">Pending Registrations</h3>
          {registrations.filter(r => r.account_status === "pending_approval").length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">No pending registrations.</p>
          ) : (
            <div className="rounded-2xl bg-zinc-900 shadow-black/20 ring-1 ring-zinc-700 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-zinc-400">
                  <tr>
                    <th className="px-5 py-3 font-semibold text-left">Company</th>
                    <th className="px-5 py-3 font-semibold text-left">Contact</th>
                    <th className="px-5 py-3 font-semibold text-left">Status</th>
                    <th className="px-5 py-3 font-semibold text-left">Registered</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {registrations.filter(r => r.account_status === "pending_approval").map(r => (
                    <tr key={r.id} className="hover:bg-zinc-800">
                      <td className="px-5 py-3 font-medium text-zinc-100">{r.company_name ?? "—"}</td>
                      <td className="px-5 py-3 text-zinc-400">{r.contact_name ?? "—"}<br/><span className="text-xs text-slate-400">{r.email}</span></td>
                      <td className="px-5 py-3">
                        <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">Pending</span>
                      </td>
                      <td className="px-5 py-3 text-slate-400 text-xs">{formatDate(new Date(r.created_at))}</td>
                      <td className="px-5 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => handleApproveReject(r.id, "approve")}
                            disabled={processingReg === r.id}
                            className="rounded-lg bg-green-600 px-3 py-1 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50">
                            {processingReg === r.id ? "..." : "Approve"}
                          </button>
                          <button onClick={() => handleApproveReject(r.id, "reject")}
                            disabled={processingReg === r.id}
                            className="rounded-lg bg-red-900/300 px-3 py-1 text-xs font-semibold text-white hover:bg-red-600 disabled:opacity-50">
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {subTab === "customers" && (
        <>
      {showForm && (
        <div className="rounded-2xl bg-zinc-900 p-6 shadow-black/20 ring-1 ring-zinc-700">
          <h3 className="font-semibold text-zinc-100 mb-4">{editing ? "Edit Customer" : "New Customer"}</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Company Name</label>
              <input value={form.companyName} onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))}
                className="w-full rounded-xl border border-zinc-600 px-3 py-2 text-sm outline-none focus:border-slate-900" />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Contact Name</label>
              <input value={form.contactName} onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))}
                className="w-full rounded-xl border border-zinc-600 px-3 py-2 text-sm outline-none focus:border-slate-900" />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Email</label>
              <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full rounded-xl border border-zinc-600 px-3 py-2 text-sm outline-none focus:border-slate-900" />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Phone</label>
              <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className="w-full rounded-xl border border-zinc-600 px-3 py-2 text-sm outline-none focus:border-slate-900" />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Status</label>
              <select value={form.accountStatus} onChange={e => setForm(f => ({ ...f, accountStatus: e.target.value }))}
                className="w-full rounded-xl border border-zinc-600 px-3 py-2 text-sm outline-none focus:border-slate-900">
                <option value="active">Active</option>
                <option value="on_hold">On Hold</option>
                <option value="disabled">Disabled</option>
                <option value="pending_approval">Pending Approval</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Credit Limit ($)</label>
              <input type="number" value={form.creditLimit} onChange={e => setForm(f => ({ ...f, creditLimit: Number(e.target.value) }))}
                className="w-full rounded-xl border border-zinc-600 px-3 py-2 text-sm outline-none focus:border-slate-900" placeholder="0 = unlimited" />
            </div>
          </div>

          <div className="mt-4 p-4 rounded-xl bg-slate-50 space-y-3">
            <p className="text-sm font-semibold text-zinc-300">Deposit Rules</p>
            <div className="flex items-center gap-3">
              <input type="checkbox" checked={form.depositsEnabled}
                onChange={e => setForm(f => ({ ...f, depositsEnabled: e.target.checked }))}
                className="rounded" id="dep-enabled" />
              <label htmlFor="dep-enabled" className="text-sm text-zinc-300">Enable deposit requirement</label>
            </div>
            {form.depositsEnabled && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Threshold ($ order total to trigger)</label>
                  <input type="number" value={form.depositThreshold} onChange={e => setForm(f => ({ ...f, depositThreshold: e.target.value }))}
                    className="w-full rounded-lg border border-zinc-600 px-3 py-2 text-sm outline-none focus:border-slate-900" placeholder="0" />
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Deposit %</label>
                  <input type="number" value={form.depositPercentage} onChange={e => setForm(f => ({ ...f, depositPercentage: e.target.value }))}
                    className="w-full rounded-lg border border-zinc-600 px-3 py-2 text-sm outline-none focus:border-slate-900" placeholder="20" min="1" max="100" />
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 flex gap-3">
            <button onClick={handleSave} disabled={saving}
              className="rounded-xl bg-green-600 px-5 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50">
              {saving ? "Saving..." : "Save Customer"}
            </button>
            <button onClick={() => setShowForm(false)}
              className="rounded-xl border border-zinc-600 px-5 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-zinc-900 shadow-black/20 ring-1 ring-zinc-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-zinc-400">
            <tr>
              <th className="px-5 py-3 font-semibold text-left">
                <input type="checkbox" className="rounded border-slate-400"
                  checked={selectedCustomers.size === customers.length && customers.length > 0}
                  onChange={toggleAllCustomers}
                />
              </th>
              <th className="px-5 py-3 font-semibold text-left">Company</th>
              <th className="px-5 py-3 font-semibold text-left">Contact</th>
              <th className="px-5 py-3 font-semibold text-left">Status</th>
              <th className="px-5 py-3 font-semibold text-left">Credit</th>
              <th className="px-5 py-3 font-semibold text-left">Deposits</th>
              <th className="px-5 py-3 font-semibold text-left">Created</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {customers.length === 0 ? (
              <tr><td colSpan={7} className="py-8 text-center text-slate-400">No customers yet.</td></tr>
            ) : customers.map(c => (
              <tr key={c.id} className="hover:bg-zinc-800">
                <td className="px-5 py-3">
                  <input type="checkbox" className="rounded border-slate-400"
                    checked={selectedCustomers.has(c.id)}
                    onChange={() => toggleSelectCustomer(c.id)}
                  />
                </td>
                <td className="px-5 py-3 font-medium text-zinc-100">{c.company_name ?? "—"}</td>
                <td className="px-5 py-3 text-zinc-400">{c.contact_name ?? "—"}<br/><span className="text-xs text-slate-400">{c.email}</span></td>
                <td className="px-5 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    c.account_status === "active" ? "bg-green-100 text-green-400" :
                    c.account_status === "on_hold" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-400"
                  }`}>{c.account_status}</span>
                </td>
                <td className="px-5 py-3 text-zinc-400">
                  {c.credit_limit <= 0 ? "Unlimited" : `$${Number(c.credit_limit).toFixed(2)}`}
                </td>
                <td className="px-5 py-3 text-zinc-400">
                  {c.deposits_enabled ? `${c.deposit_percentage}%` : "—"}
                </td>
                <td className="px-5 py-3 text-slate-400 text-xs">{formatDate(new Date(c.created_at))}</td>
                <td className="px-5 py-4 customer-actions-cell relative">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openPriceSheetModal([c.id])}
                      title="Send price sheet"
                      className="inline-flex items-center justify-center rounded-xl w-9 h-9 text-blue-600 hover:text-blue-800 hover:bg-blue-50 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                    </button>
                    <div className="relative">
                      <button
                        onClick={(e) => toggleCustomerActions(c.id, e)}
                        title="More actions"
                        className="inline-flex items-center justify-center rounded-xl w-9 h-9 text-slate-400 hover:text-zinc-300 hover:bg-zinc-950 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><circle cx="10" cy="4" r="1.5"/><circle cx="10" cy="10" r="1.5"/><circle cx="10" cy="16" r="1.5"/></svg>
                      </button>
                      {openCustomerActions === c.id && (
                        <div
                          className="absolute bottom-full right-0 mb-1 z-30 w-52 rounded-xl bg-zinc-900 shadow-xl ring-1 ring-zinc-700 py-1 text-sm"
                          onClick={e => e.stopPropagation()}
                        >
                          <button
                            onClick={() => { setOpenCustomerActions(null); openEdit(c); }}
                            className="w-full text-left px-4 py-3 text-green-400 hover:bg-green-900/30 flex items-center gap-3 font-medium"
                          >
                            <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                            Edit Customer
                          </button>
                          <button
                            onClick={() => { setOpenCustomerActions(null); setPricingCustomer(c); }}
                            className="w-full text-left px-4 py-3 text-zinc-300 hover:bg-zinc-800 flex items-center gap-3"
                          >
                            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                            Pricing
                          </button>
                          <a
                            href={`/wholesale/portal?preview_customer_id=${c.id}&_admin_preview=1`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full text-left px-4 py-3 text-zinc-300 hover:bg-zinc-800 flex items-center gap-3"
                          >
                            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                            View Portal As
                          </a>
                          <div className="my-1 border-t border-slate-100" />
                          <button
                            onClick={() => { setOpenCustomerActions(null); handleDeleteCustomer(c.id); }}
                            disabled={deletingCustomer === c.id}
                            className="w-full text-left px-4 py-3 text-red-500 hover:bg-red-900/30 flex items-center gap-3 disabled:opacity-50"
                          >
                            <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                            {deletingCustomer === c.id ? "Deleting..." : "Delete Customer"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          {selectedCustomers.size > 0 && (
            <tfoot className="bg-blue-50 border-t border-blue-200">
              <tr>
                <td colSpan={8} className="px-5 py-3 flex items-center gap-4">
                  <span className="text-sm text-blue-700 font-medium">{selectedCustomers.size} selected</span>
                  <button onClick={() => openPriceSheetModal(Array.from(selectedCustomers))} disabled={sendingPriceSheet}
                    className="rounded-lg bg-blue-600 text-white px-4 py-1.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                    {sendingPriceSheet ? "Sending..." : `Send Price Sheet to ${selectedCustomers.size} Customer(s)`}
                  </button>
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
        </>
      )}

      {/* Customer Pricing Overrides Panel */}
      {pricingCustomer && (
        <CustomerPricingPanel
          customer={pricingCustomer}
          products={products}
          onClose={() => setPricingCustomer(null)}
          onMsg={onMsg}
        />
      )}

      {/* Price Sheet Modal */}
      {priceSheetTarget && (
        <PriceSheetModal
          customerCount={priceSheetTarget.customerIds.length}
          defaultSubject={priceSheetTarget.defaultSubject}
          onConfirm={handleConfirmPriceSheet}
          onClose={() => { setPriceSheetTarget(null); setSendingPriceSheet(false); }}
        />
      )}
    </div>
  );
}

// ── Customer Pricing Panel ──────────────────────────────────────────────────────

function CustomerPricingPanel({ customer, products, onClose, onMsg }: {
  customer: WholesaleCustomer;
  products: WholesaleProduct[];
  onClose: () => void;
  onMsg: (kind: "success" | "error", text: string) => void;
}) {
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getWholesaleCustomerPricing(customer.id).then(pricing => {
      const map: Record<string, string> = {};
      for (const p of pricing) {
        map[p.product_id] = p.custom_unit_price.toString();
      }
      setOverrides(map);
      setLoading(false);
    });
  }, [customer.id]);

  async function handleSave(productId: string, price: string) {
    if (!price || isNaN(Number(price))) {
      await deleteWholesaleCustomerPricing({ customerId: customer.id, productId });
      setOverrides(prev => { const n = { ...prev }; delete n[productId]; return n; });
    } else {
      await upsertWholesaleCustomerPricing({ customerId: customer.id, productId, customUnitPrice: Number(price) });
      setOverrides(prev => ({ ...prev, [productId]: price }));
    }
    onMsg("success", "Pricing updated.");
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-zinc-900 rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-zinc-100">Pricing Overrides</h2>
            <p className="text-sm text-zinc-500">{customer.company_name}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-zinc-400">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-4">
          {loading ? (
            <p className="text-zinc-500 text-sm">Loading...</p>
          ) : products.length === 0 ? (
            <p className="text-slate-400 text-sm">No products available.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-zinc-500 border-b">
                  <th className="pb-2 font-medium">Product</th>
                  <th className="pb-2 font-medium">Standard Price</th>
                  <th className="pb-2 font-medium">Override Price</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map(p => {
                  const standardPrice = p.price_tiers?.[0]?.price ?? 0;
                  const overridePrice = overrides[p.id] ?? "";
                  return (
                    <tr key={p.id}>
                      <td className="py-2.5 font-medium text-zinc-100">{p.name}</td>
                      <td className="py-2.5 text-zinc-500">${standardPrice.toFixed(2)}</td>
                      <td className="py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400">$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={overridePrice}
                            onChange={e => setOverrides(prev => ({ ...prev, [p.id]: e.target.value }))}
                            placeholder={standardPrice.toFixed(2)}
                            className="w-24 rounded-lg border border-zinc-600 px-2 py-1 text-sm outline-none focus:border-green-600"
                          />
                          {overridePrice && overridePrice !== standardPrice.toFixed(2) && (
                            <span className="text-xs text-green-600 font-medium">Custom</span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5">
                        <button
                          onClick={() => handleSave(p.id, overrides[p.id] ?? "")}
                          disabled={saving}
                          className="rounded-lg bg-green-600 px-3 py-1 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                        >
                          Save
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          <p className="mt-3 text-xs text-slate-400">
            Leave override price blank to remove custom pricing and use standard price tiers.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Price Sheet Modal ──────────────────────────────────────────────────────────

function PriceSheetModal({
  customerCount,
  defaultSubject,
  onConfirm,
  onClose,
}: {
  customerCount: number;
  defaultSubject: string;
  onConfirm: (subject: string, customNote: string) => void;
  onClose: () => void;
}) {
  const [subject, setSubject] = useState(defaultSubject);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim()) return;
    setSending(true);
    onConfirm(subject.trim(), note.trim());
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div className="bg-zinc-900 rounded-2xl shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-zinc-100">Send Price Sheet</h2>
            <p className="text-sm text-zinc-500">
              {customerCount === 1 ? "1 customer" : `${customerCount} customers`}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-zinc-400">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Subject</label>
              <input
                value={subject}
                onChange={e => setSubject(e.target.value)}
                required
                className="w-full rounded-xl border border-zinc-600 px-3 py-2 text-sm outline-none focus:border-green-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                Add a Note <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                rows={4}
                placeholder="e.g. 'Check out our new seasonal items on page 2. Place your order by Friday for weekend pickup.'"
                className="w-full rounded-xl border border-zinc-600 px-3 py-2 text-sm outline-none focus:border-green-600 resize-none"
              />
              <p className="mt-1 text-xs text-slate-400">
                This note will appear at the top of the email, above the product table.
              </p>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-zinc-800 flex items-center justify-between bg-slate-50 rounded-b-2xl">
            <div className="text-sm text-zinc-500">
              {customerCount === 1 ? "1 customer" : `${customerCount} customers`} will receive this email.
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={onClose}
                className="rounded-xl border border-zinc-600 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-950">
                Cancel
              </button>
              <button type="submit" disabled={sending || !subject.trim()}
                className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                {sending ? "Sending..." : `Send to ${customerCount === 1 ? "1 Customer" : `${customerCount} Customers`}`}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Products Tab ─────────────────────────────────────────────────────────────

function ProductsTab({ products, brandId, onMsg, onRefresh }: {
  products: WholesaleProduct[];
  brandId: string;
  onMsg: (kind: "success" | "error", text: string) => void;
  onRefresh: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<WholesaleProduct | null>(null);
  const [form, setForm] = useState({
    name: "", description: "", unitType: "each", availability: "available",
    qtyAvailable: 0, priceTiers: "", hpSku: "", hpItemId: "",
    handlingInstructions: "", storageWarning: "", productLabel: "",
  });
  const [saving, setSaving] = useState(false);
  const [openProductActions, setOpenProductActions] = useState<string | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<string | null>(null);

  // Close product actions dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!(e.target as Element).closest(".product-actions-cell")) {
        setOpenProductActions(null);
      }
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  function toggleProductActions(productId: string, e: React.MouseEvent) {
    e.stopPropagation();
    setOpenProductActions(prev => prev === productId ? null : productId);
  }

  async function handleDeleteProduct(productId: string) {
    if (!confirm("Delete this product? Products attached to order items cannot be deleted. Set availability to unavailable instead.")) return;
    setDeletingProduct(productId);
    const result = await deleteWholesaleProduct(productId);
    setDeletingProduct(null);
    if (result.success) {
      onMsg("success", "Product deleted.");
      onRefresh();
    } else {
      onMsg("error", result.error ?? "Failed to delete product.");
    }
  }

  async function handleSave() {
    setSaving(true);
    let tiers: Array<{ min_qty: number; max_qty: number; price: number }> = [];
    try { tiers = JSON.parse(form.priceTiers || "[]"); } catch {}
    const result = await saveWholesaleProduct({
      brandId,
      id: editing?.id,
      name: form.name,
      description: form.description || undefined,
      unitType: form.unitType,
      availability: form.availability,
      qtyAvailable: form.qtyAvailable,
      priceTiers: tiers,
      hpSku: form.hpSku || undefined,
      hpItemId: form.hpItemId || undefined,
      handlingInstructions: form.handlingInstructions || undefined,
      storageWarning: form.storageWarning || undefined,
      productLabel: form.productLabel || undefined,
    });
    setSaving(false);
    if (result.success) {
      onMsg("success", editing ? "Product updated." : "Product created.");
      setShowForm(false);
      onRefresh();
    } else {
      onMsg("error", result.error ?? "Failed to save.");
    }
  }

  function openNew() {
    setEditing(null);
    setForm({ name: "", description: "", unitType: "each", availability: "available", qtyAvailable: 0, priceTiers: "", hpSku: "", hpItemId: "", handlingInstructions: "", storageWarning: "", productLabel: "" });
    setShowForm(true);
  }

  function openEdit(p: WholesaleProduct) {
    setEditing(p);
    setForm({
      name: p.name,
      description: p.description ?? "",
      unitType: p.unit_type,
      availability: p.availability,
      qtyAvailable: Number(p.qty_available),
      priceTiers: JSON.stringify(p.price_tiers),
      hpSku: p.hp_sku ?? "",
      hpItemId: p.hp_item_id ?? "",
      handlingInstructions: p.handling_instructions ?? "",
      storageWarning: p.storage_warning ?? "",
      productLabel: p.product_label ?? "",
    });
    setShowForm(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-100">Wholesale Products ({products.length})</h2>
        <button onClick={openNew} className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700">
          + Add Product
        </button>
      </div>

      {showForm && (
        <div className="rounded-2xl bg-zinc-900 p-6 shadow-black/20 ring-1 ring-zinc-700">
          <h3 className="font-semibold text-zinc-100 mb-4">{editing ? "Edit Product" : "New Product"}</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-zinc-300 mb-1">Product Name</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full rounded-xl border border-zinc-600 px-3 py-2 text-sm outline-none focus:border-slate-900" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-zinc-300 mb-1">Description</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="w-full rounded-xl border border-zinc-600 px-3 py-2 text-sm outline-none focus:border-slate-900" rows={2} />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Unit Type</label>
              <select value={form.unitType} onChange={e => setForm(f => ({ ...f, unitType: e.target.value }))}
                className="w-full rounded-xl border border-zinc-600 px-3 py-2 text-sm outline-none focus:border-slate-900">
                {["each", "48-count box", "bag", "pallet", "bin", "load", "custom"].map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Availability</label>
              <select value={form.availability} onChange={e => setForm(f => ({ ...f, availability: e.target.value }))}
                className="w-full rounded-xl border border-zinc-600 px-3 py-2 text-sm outline-none focus:border-slate-900">
                <option value="available">Available</option>
                <option value="unavailable">Unavailable</option>
                <option value="coming_soon">Coming Soon</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Qty Available</label>
              <input type="number" value={form.qtyAvailable} onChange={e => setForm(f => ({ ...f, qtyAvailable: Number(e.target.value) }))}
                className="w-full rounded-xl border border-zinc-600 px-3 py-2 text-sm outline-none focus:border-slate-900" />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">HP SKU</label>
              <input value={form.hpSku} onChange={e => setForm(f => ({ ...f, hpSku: e.target.value }))}
                className="w-full rounded-xl border border-zinc-600 px-3 py-2 text-sm outline-none focus:border-slate-900" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-zinc-300 mb-1">
                Price Tiers (JSON array of {"{\"min_qty\":1,\"max_qty\":24,\"price\":20}"})
              </label>
              <input value={form.priceTiers} onChange={e => setForm(f => ({ ...f, priceTiers: e.target.value }))}
                placeholder='[{"min_qty":1,"max_qty":24,"price":20},{"min_qty":25,"max_qty":0,"price":18}]'
                className="w-full rounded-xl border border-zinc-600 px-3 py-2 text-sm font-mono outline-none focus:border-slate-900" />
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <button onClick={handleSave} disabled={saving}
              className="rounded-xl bg-green-600 px-5 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50">
              {saving ? "Saving..." : "Save Product"}
            </button>
            <button onClick={() => setShowForm(false)}
              className="rounded-xl border border-zinc-600 px-5 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-zinc-900 shadow-black/20 ring-1 ring-zinc-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-zinc-400">
            <tr>
              <th className="px-5 py-3 font-semibold text-left">Product</th>
              <th className="px-5 py-3 font-semibold text-left">Unit</th>
              <th className="px-5 py-3 font-semibold text-left">Availability</th>
              <th className="px-5 py-3 font-semibold text-left">In Stock</th>
              <th className="px-5 py-3 font-semibold text-left">HP SKU</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {products.length === 0 ? (
              <tr><td colSpan={6} className="py-8 text-center text-slate-400">No products yet.</td></tr>
            ) : products.map(p => (
              <tr key={p.id} className="hover:bg-zinc-800">
                <td className="px-5 py-3 font-medium text-zinc-100">{p.name}</td>
                <td className="px-5 py-3 text-zinc-400">{p.unit_type}</td>
                <td className="px-5 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    p.availability === "available" ? "bg-green-100 text-green-400" :
                    p.availability === "coming_soon" ? "bg-yellow-100 text-yellow-700" : "bg-zinc-950 text-zinc-500"
                  }`}>{p.availability.replace("_", " ")}</span>
                </td>
                <td className="px-5 py-3 text-zinc-400">{p.qty_available}</td>
                <td className="px-5 py-4 font-mono text-xs text-slate-400">{p.hp_sku ?? "—"}</td>
                <td className="px-5 py-4 product-actions-cell relative">
                  <div className="flex items-center gap-1.5">
                    <div className="relative">
                      <button
                        onClick={(e) => toggleProductActions(p.id, e)}
                        title="More actions"
                        className="inline-flex items-center justify-center rounded-xl w-9 h-9 text-slate-400 hover:text-zinc-300 hover:bg-zinc-950 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><circle cx="10" cy="4" r="1.5"/><circle cx="10" cy="10" r="1.5"/><circle cx="10" cy="16" r="1.5"/></svg>
                      </button>
                      {openProductActions === p.id && (
                        <div
                          className="absolute bottom-full right-0 mb-1 z-30 w-48 rounded-xl bg-zinc-900 shadow-xl ring-1 ring-zinc-700 py-1 text-sm"
                          onClick={e => e.stopPropagation()}
                        >
                          <button
                            onClick={() => { setOpenProductActions(null); openEdit(p); }}
                            className="w-full text-left px-4 py-3 text-green-400 hover:bg-green-900/30 flex items-center gap-3 font-medium"
                          >
                            <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                            Edit Product
                          </button>
                          <div className="my-1 border-t border-slate-100" />
                          <button
                            onClick={() => { setOpenProductActions(null); handleDeleteProduct(p.id); }}
                            disabled={deletingProduct === p.id}
                            className="w-full text-left px-4 py-3 text-red-500 hover:bg-red-900/30 flex items-center gap-3 disabled:opacity-50"
                          >
                            <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                            {deletingProduct === p.id ? "Deleting..." : "Delete Product"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Orders Tab ───────────────────────────────────────────────────────────────

function OrdersTab({ orders, customers, brandId, onMsg, onRefresh }: {
  orders: WholesaleOrder[];
  customers: WholesaleCustomer[];
  brandId: string;
  onMsg: (kind: "success" | "error", text: string) => void;
  onRefresh: () => void;
}) {
  const [showDepForm, setShowDepForm] = useState<string | null>(null);
  const [depAmount, setDepAmount] = useState("");
  const [depMethod, setDepMethod] = useState("cash");
  const [fulfilling, setFulfilling] = useState<string | null>(null);
  const [manifestLoading, setManifestLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [bulkDepAmount, setBulkDepAmount] = useState("");
  const [bulkDepMethod, setBulkDepMethod] = useState("cash");
  const [showBulkDep, setShowBulkDep] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);

  const filtered = orders.filter(o => {
    if (statusFilter !== "all" && o.status !== statusFilter) return false;
    if (dateFrom && (!o.anticipated_pickup_date || o.anticipated_pickup_date < dateFrom)) return false;
    if (dateTo && (!o.anticipated_pickup_date || o.anticipated_pickup_date > dateTo)) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!(o.company_name?.toLowerCase().includes(q) || o.invoice_number?.toLowerCase().includes(q) || o.customer_email?.toLowerCase().includes(q))) return false;
    }
    return true;
  });

  function toggleSelect(id: string) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleAll() {
    if (selected.size === filtered.length) { setSelected(new Set()); }
    else { setSelected(new Set(filtered.map(o => o.id))); }
  }

  async function handleBulkFulfill() {
    if (selected.size === 0) return;
    setBulkLoading(true);
    const result = await bulkFulfillWholesaleOrders(Array.from(selected));
    setBulkLoading(false);
    if (result.success) {
      onMsg("success", `${result.count} order(s) marked as fulfilled.`);
      setSelected(new Set());
      onRefresh();
    } else {
      onMsg("error", result.error ?? "Bulk fulfill failed.");
    }
  }

  async function handleBulkDeposit() {
    if (selected.size === 0 || !bulkDepAmount) return;
    setBulkLoading(true);
    const result = await bulkRecordWholesaleDeposit(Array.from(selected), Number(bulkDepAmount), bulkDepMethod);
    setBulkLoading(false);
    if (result.success) {
      onMsg("success", `Deposit recorded on ${result.count} order(s).`);
      setSelected(new Set());
      setShowBulkDep(false);
      setBulkDepAmount("");
      onRefresh();
    } else {
      onMsg("error", result.error ?? "Bulk deposit failed.");
    }
  }

  async function handleFulfill(orderId: string) {
    setFulfilling(orderId);
    const result = await markWholesaleOrderFulfilled(orderId);
    setFulfilling(null);
    if (result.success) {
      onMsg("success", "Order marked as fulfilled.");
      onRefresh();

      // Enqueue order fulfilled notification
      const order = orders.find(o => o.id === orderId);
      const customer = order ? customers.find(c => c.email === order.customer_email) : null;
      if (order && customer) {
        enqueueWholesaleNotification({
          brandId: brandId,
          customerId: customer.id,
          orderId,
          type: "order_fulfilled",
          emailTo: customer.email,
          subject: `Order ${order.invoice_number ?? orderId.slice(0, 8)} Ready for Pickup`,
          bodyHtml: `
            <h2>Your Order is Ready!</h2>
            <p>Hi ${customer.company_name},</p>
            <p>Your wholesale order <strong>${order.invoice_number ?? orderId.slice(0, 8)}</strong> has been fulfilled and is ready for pickup${order.anticipated_pickup_date ? ` on ${order.anticipated_pickup_date}` : ""}.</p>
            <p>Thank you for your business!</p>
          `,
          bodyText: `Order ${order.invoice_number ?? orderId.slice(0, 8)} has been fulfilled and is ready for pickup${order.anticipated_pickup_date ? ` on ${order.anticipated_pickup_date}` : ""}. Thank you!`,
        });

        // Also notify the admin
        const settings = await getWholesaleSettings(brandId);
        const adminEmail = settings?.notification_email ?? settings?.from_email ?? settings?.invoice_business_email ?? null;
        if (adminEmail) {
          enqueueWholesaleNotification({
            brandId: brandId,
            customerId: customer.id,
            orderId,
            type: "order_fulfilled",
            emailTo: adminEmail,
            subject: `[Admin] Order Fulfilled — ${order.invoice_number ?? orderId.slice(0, 8)}`,
            bodyHtml: `
              <h2>Order Fulfilled</h2>
              <p>Order <strong>${order.invoice_number ?? orderId.slice(0, 8)}</strong> for <strong>${customer.company_name}</strong> has been marked as fulfilled.</p>
              ${order.anticipated_pickup_date ? `<p><strong>Pickup Date:</strong> ${order.anticipated_pickup_date}</p>` : ""}
            `,
            bodyText: `Order ${order.invoice_number ?? orderId.slice(0, 8)} for ${customer.company_name} has been fulfilled.`,
          });
        }

        // Trigger notification send (fire-and-forget)
        fetch(`/api/wholesale/notifications/send`, { method: "POST" }).catch(() => {});
      }
    } else {
      onMsg("error", result.error ?? "Failed to fulfill order.");
    }
  }

  const [openActions, setOpenActions] = useState<string | null>(null);
  const [showViewOrder, setShowViewOrder] = useState<WholesaleOrder | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Close actions dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!(e.target as Element).closest(".actions-cell")) {
        setOpenActions(null);
      }
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  function toggleActions(orderId: string, e: React.MouseEvent) {
    e.stopPropagation();
    setOpenActions(prev => prev === orderId ? null : orderId);
  }

  async function handleRecordDeposit(orderId: string) {
    const result = await recordWholesaleDeposit(orderId, Number(depAmount), depMethod);
    setShowDepForm(null);
    setDepAmount("");
    if (result.success) {
      onMsg("success", "Deposit recorded.");
      onRefresh();
    } else {
      onMsg("error", result.error ?? "Failed to record deposit.");
    }
  }

  async function handleCancelOrder(orderId: string) {
    if (!confirm("Cancel this order? This cannot be undone.")) return;
    const { updateWholesaleOrderStatus } = await import("@/actions/wholesale");
    const result = await updateWholesaleOrderStatus(orderId, "cancelled");
    if (result.success) {
      onMsg("success", "Order cancelled.");
      onRefresh();
    } else {
      onMsg("error", result.error ?? "Failed to cancel order.");
    }
  }

  async function handleDeleteOrder(orderId: string) {
    if (!confirm("Delete this order? Fulfilled and paid orders cannot be deleted. This cannot be undone.")) return;
    setDeleting(orderId);
    const { deleteWholesaleOrder } = await import("@/actions/wholesale");
    const result = await deleteWholesaleOrder(orderId);
    setDeleting(null);
    if (result.success) {
      onMsg("success", "Order deleted.");
      onRefresh();
    } else {
      onMsg("error", result.error ?? "Failed to delete order.");
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-zinc-100">Wholesale Orders ({orders.length})</h2>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-zinc-900 shadow-black/20 ring-1 ring-zinc-700 p-4">
        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1">Status</label>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="rounded-lg border border-zinc-600 px-3 py-1.5 text-sm outline-none focus:border-green-600">
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="awaiting_deposit">Awaiting Deposit</option>
            <option value="confirmed">Confirmed</option>
            <option value="fulfilled">Fulfilled</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1">Pickup From</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="rounded-lg border border-zinc-600 px-3 py-1.5 text-sm outline-none focus:border-green-600" />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1">Pickup To</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="rounded-lg border border-zinc-600 px-3 py-1.5 text-sm outline-none focus:border-green-600" />
        </div>
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs font-medium text-zinc-500 mb-1">Search</label>
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Invoice, customer, email..."
            className="w-full rounded-lg border border-zinc-600 px-3 py-1.5 text-sm outline-none focus:border-green-600" />
        </div>
        {filtered.length !== orders.length && (
          <div className="self-end pb-1">
            <span className="text-xs text-zinc-500">{filtered.length} of {orders.length}</span>
          </div>
        )}
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-2xl bg-green-900/30 border border-green-200 px-4 py-3">
          <span className="text-sm font-medium text-green-800">{selected.size} selected</span>
          <button onClick={handleBulkFulfill} disabled={bulkLoading}
            className="rounded-lg bg-green-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50">
            {bulkLoading ? "..." : "Bulk Fulfill"}
          </button>
          <button onClick={() => setShowBulkDep(true)}
            className="rounded-lg border border-green-300 bg-zinc-900 px-4 py-1.5 text-xs font-semibold text-green-400 hover:bg-green-100">
            Bulk Record Deposit
          </button>
          <button onClick={() => setSelected(new Set())} className="ml-auto text-xs text-zinc-500 hover:text-zinc-300">Clear selection</button>
        </div>
      )}

      {/* Manifest section */}
      <div className="rounded-2xl bg-zinc-900 shadow-black/20 ring-1 ring-zinc-700 p-4 flex items-center gap-4">
        <div>
          <p className="text-sm font-medium text-zinc-300">Load Manifest</p>
          <p className="text-xs text-zinc-500">Generate a printable manifest for pending/active orders.</p>
        </div>
        <button
          onClick={async () => {
            setManifestLoading(true);
            const pending = filtered.filter(o => o.fulfillment_status !== "fulfilled");
            if (pending.length === 0) { setManifestLoading(false); return; }
            const html = await fetch("/api/wholesale/manifest", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ brandId, orders: pending }),
            }).then(r => r.text());
            const w = window.open("", "_blank");
            if (w) { w.document.write(html); w.document.close(); }
            setManifestLoading(false);
          }}
          disabled={manifestLoading}
          className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {manifestLoading ? "Generating..." : "Generate Manifest"}
        </button>
      </div>

      <div className="rounded-2xl bg-zinc-900 shadow-black/20 ring-1 ring-zinc-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-zinc-400">
            <tr>
              <th className="px-5 py-3 font-semibold text-left w-10">
                <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll} className="rounded" />
              </th>
              <th className="px-5 py-3 font-semibold text-left">Invoice</th>
              <th className="px-5 py-3 font-semibold text-left">Customer</th>
              <th className="px-5 py-3 font-semibold text-left">Pickup Date</th>
              <th className="px-5 py-3 font-semibold text-right">Subtotal</th>
              <th className="px-5 py-3 font-semibold text-right">Deposit</th>
              <th className="px-5 py-3 font-semibold text-right">Balance</th>
              <th className="px-5 py-3 font-semibold text-left">Status</th>
              <th className="px-5 py-3 font-semibold text-left">Payment</th>
              <th className="px-5 py-3 font-semibold text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr><td colSpan={10} className="py-8 text-center text-slate-400">No orders match the current filters.</td></tr>
            ) : filtered.map(o => (
              <tr key={o.id} className={`hover:bg-zinc-800 ${selected.has(o.id) ? "bg-green-900/30" : ""}`}>
                <td className="px-5 py-3">
                  <input type="checkbox" checked={selected.has(o.id)} onChange={() => toggleSelect(o.id)} className="rounded" />
                </td>
                <td className="px-5 py-3 font-mono text-xs text-slate-400">{o.invoice_number ?? "—"}</td>
                <td className="px-5 py-3 font-medium text-zinc-100">{o.company_name}</td>
                <td className="px-5 py-3 text-zinc-400">{o.anticipated_pickup_date ?? "—"}</td>
                <td className="px-5 py-3 text-right font-semibold text-zinc-100">${Number(o.subtotal).toFixed(2)}</td>
                <td className="px-5 py-3 text-right text-zinc-400">${Number(o.deposit_paid).toFixed(2)} / ${Number(o.deposit_required).toFixed(2)}</td>
                <td className="px-5 py-3 text-right">
                  <span className={Number(o.balance_due) > 0 ? "text-orange-600 font-medium" : "text-green-600"}>
                    ${Number(o.balance_due).toFixed(2)}
                  </span>
                </td>
                <td className="px-5 py-3"><StatusBadge status={o.status} /></td>
                <td className="px-5 py-3">
                  <span className={`text-xs font-medium ${o.payment_status === "paid" ? "text-green-600" : "text-orange-600"}`}>
                    {o.payment_status}
                  </span>
                </td>
                <td className="px-5 py-4 actions-cell relative">
                  <div className="flex items-center gap-2">
                    {/* Primary: Mark Fulfilled — only when order is not yet fulfilled */}
                    {o.fulfillment_status !== "fulfilled" && (
                      <button
                        onClick={() => !fulfilling && handleFulfill(o.id)}
                        disabled={fulfilling === o.id}
                        title="Mark as fulfilled"
                        className="inline-flex items-center gap-1.5 rounded-xl bg-green-600 px-3 py-2 text-xs font-bold text-white shadow-black/20 hover:bg-green-700 disabled:opacity-40 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        {fulfilling === o.id ? "..." : "Fulfill"}
                      </button>
                    )}

                    {/* Primary: Record Deposit — when there's a balance due */}
                    {Number(o.balance_due) > 0 && o.fulfillment_status !== "fulfilled" && (
                      <button
                        onClick={() => setShowDepForm(o.id)}
                        title="Record deposit payment"
                        className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-3 py-2 text-xs font-bold text-white shadow-black/20 hover:bg-purple-700 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-9-9h18" /></svg>
                        Deposit
                      </button>
                    )}

                    {/* Invoice download — always visible as icon button */}
                    <a
                      href={`/api/wholesale/invoice/${o.id}/pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Download Invoice"
                      className="inline-flex items-center justify-center rounded-xl w-9 h-9 text-zinc-500 hover:text-slate-800 hover:bg-zinc-950 transition-colors"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h9m-9-6h6m-3 12a9 9 0 110 12H15M6 2h9l4 4v14a2 2 0 01-2 2H6a2 2 0 01-2-2V4a2 2 0 012-2z"/></svg>
                    </a>

                    {/* ⋮ Actions dropdown — opens upward to avoid table cutoff */}
                    <div className="relative">
                      <button
                        onClick={(e) => toggleActions(o.id, e)}
                        title="More actions"
                        className="inline-flex items-center justify-center rounded-xl w-9 h-9 text-slate-400 hover:text-zinc-300 hover:bg-zinc-950 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><circle cx="10" cy="4" r="1.5"/><circle cx="10" cy="10" r="1.5"/><circle cx="10" cy="16" r="1.5"/></svg>
                      </button>

                      {openActions === o.id && (
                        <div
                          className="absolute bottom-full right-0 mb-1 z-30 w-56 rounded-xl bg-zinc-900 shadow-xl ring-1 ring-zinc-700 py-1 text-sm"
                          onClick={e => e.stopPropagation()}
                        >
                          <button
                            onClick={() => { setOpenActions(null); setShowViewOrder(o); }}
                            className="w-full text-left px-4 py-3 text-green-400 hover:bg-green-900/30 flex items-center gap-3 font-medium"
                          >
                            <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                            View / Edit Order
                          </button>

                          <button
                            onClick={() => {
                              setOpenActions(null);
                              const w = window.open("", "_blank");
                              if (w) {
                                fetch("/api/wholesale/manifest", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ brandId, orders: [o] }),
                                }).then(r => r.text()).then(html => { w.document.write(html); w.document.close(); });
                              }
                            }}
                            className="w-full text-left px-4 py-3 text-zinc-300 hover:bg-zinc-800 flex items-center gap-3"
                          >
                            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h9m-9-6h6m-3 12a9 9 0 01-18 0 9 9 0 0118 0z"/></svg>
                            Generate Manifest
                          </button>

                          <button
                            onClick={() => {
                              setOpenActions(null);
                              fetch("/api/wholesale/price-sheet", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ customerIds: [o.customer_id], brandId }),
                              }).then(r => r.json()).then(d => onMsg("success", `Price sheet sent to customer.`)).catch(() => onMsg("error", "Failed to send price sheet."));
                            }}
                            className="w-full text-left px-4 py-3 text-zinc-300 hover:bg-zinc-800 flex items-center gap-3"
                          >
                            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                            Send Price Sheet
                          </button>

                          <div className="my-1 border-t border-slate-100" />

                          {o.status !== "cancelled" && o.fulfillment_status !== "fulfilled" && (
                            <button
                              onClick={() => { setOpenActions(null); handleCancelOrder(o.id); }}
                              className="w-full text-left px-4 py-3 text-red-500 hover:bg-red-900/30 flex items-center gap-3"
                            >
                              <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/></svg>
                              Cancel Order
                            </button>
                          )}

                          {o.fulfillment_status !== "fulfilled" && (
                            <button
                              onClick={() => { setOpenActions(null); handleDeleteOrder(o.id); }}
                              className="w-full text-left px-4 py-3 text-red-500 hover:bg-red-900/30 flex items-center gap-3"
                            >
                              <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                              Delete Order
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Deposit modal */}
      {showDepForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-zinc-900 rounded-2xl p-6 w-96 shadow-xl">
            <h3 className="font-semibold text-zinc-100 mb-4">Record Deposit</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Amount ($)</label>
                <input type="number" value={depAmount} onChange={e => setDepAmount(e.target.value)}
                  className="w-full rounded-xl border border-zinc-600 px-3 py-2 text-sm outline-none focus:border-slate-900" step="0.01" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Method</label>
                <select value={depMethod} onChange={e => setDepMethod(e.target.value)}
                  className="w-full rounded-xl border border-zinc-600 px-3 py-2 text-sm outline-none focus:border-slate-900">
                  <option value="cash">Cash</option>
                  <option value="check">Check</option>
                  <option value="wire">Wire</option>
                  <option value="card">Card</option>
                </select>
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <button onClick={() => handleRecordDeposit(showDepForm)}
                className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700">
                Record Deposit
              </button>
              <button onClick={() => setShowDepForm(null)}
                className="rounded-xl border border-zinc-600 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Deposit modal */}
      {showBulkDep && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-zinc-900 rounded-2xl p-6 w-96 shadow-xl">
            <h3 className="font-semibold text-zinc-100 mb-4">Bulk Record Deposit ({selected.size} orders)</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Amount per order ($)</label>
                <input type="number" value={bulkDepAmount} onChange={e => setBulkDepAmount(e.target.value)}
                  className="w-full rounded-xl border border-zinc-600 px-3 py-2 text-sm outline-none focus:border-slate-900" step="0.01" placeholder="0.00" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Method</label>
                <select value={bulkDepMethod} onChange={e => setBulkDepMethod(e.target.value)}
                  className="w-full rounded-xl border border-zinc-600 px-3 py-2 text-sm outline-none focus:border-slate-900">
                  <option value="cash">Cash</option>
                  <option value="check">Check</option>
                  <option value="wire">Wire</option>
                  <option value="card">Card</option>
                </select>
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <button onClick={handleBulkDeposit}
                disabled={!bulkDepAmount || bulkLoading}
                className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50">
                {bulkLoading ? "Recording..." : "Record on All"}
              </button>
              <button onClick={() => setShowBulkDep(false)}
                className="rounded-xl border border-zinc-600 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Details modal */}
      {showViewOrder && (
        <OrderDetailsModal
          order={showViewOrder}
          onClose={() => setShowViewOrder(null)}
          onFulfill={handleFulfill}
          onRecordDeposit={(id) => { setShowViewOrder(null); setShowDepForm(id); }}
          fulfilling={fulfilling}
        />
      )}
    </div>
  );
}

// ── Settings Tab ─────────────────────────────────────────────────────────────

function SettingsTab({ settings, brandId, onMsg, onRefresh, canManageSettings }: {
  settings: WholesaleSettings | null;
  brandId: string;
  onMsg: (kind: "success" | "error", text: string) => void;
  onRefresh: () => void;
  canManageSettings: boolean;
}) {
  if (!canManageSettings) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-400">You do not have permission to manage settings.</p>
      </div>
    );
  }
  const [form, setForm] = useState({
    requireApproval: settings?.require_approval ?? true,
    minOrderAmount: settings?.min_order_amount ?? "",
    onlinePaymentEnabled: settings?.online_payment_enabled ?? false,
    wholesaleEnabled: settings?.wholesale_enabled ?? true,
    squareSyncEnabled: settings?.square_sync_enabled ?? false,
    pickupLocation: settings?.pickup_location ?? "",
    fobLocation: settings?.fob_location ?? "",
    fromEmail: settings?.from_email ?? "",
    invoiceBusinessName: settings?.invoice_business_name ?? "",
    invoiceBusinessAddress: settings?.invoice_business_address ?? "",
    invoiceBusinessPhone: settings?.invoice_business_phone ?? "",
    invoiceBusinessEmail: settings?.invoice_business_email ?? "",
    invoiceBusinessWebsite: settings?.invoice_business_website ?? "",
    notificationRecipients: settings?.notification_recipients ?? [],
  });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const result = await saveWholesaleSettings({
      brandId,
      requireApproval: form.requireApproval,
      minOrderAmount: form.minOrderAmount ? Number(form.minOrderAmount) : undefined,
      onlinePaymentEnabled: form.onlinePaymentEnabled,
      wholesaleEnabled: form.wholesaleEnabled,
      squareSyncEnabled: form.squareSyncEnabled,
      pickupLocation: form.pickupLocation,
      fobLocation: form.fobLocation,
      fromEmail: form.fromEmail,
      invoiceBusinessName: form.invoiceBusinessName,
      invoiceBusinessAddress: form.invoiceBusinessAddress,
      invoiceBusinessPhone: form.invoiceBusinessPhone,
      invoiceBusinessWebsite: form.invoiceBusinessWebsite,
      notificationRecipients: form.notificationRecipients,
    });
    setSaving(false);
    if (result.success) {
      onMsg("success", "Settings saved.");
      onRefresh();
    } else {
      onMsg("error", result.error ?? "Failed to save settings.");
    }
  }

  // ── Notification Recipients helpers ────────────────────────────────────────
  function addRecipient(email: string, name: string = "") {
    setForm(f => ({
      ...f,
      notificationRecipients: [
        ...f.notificationRecipients,
        { email, name, active: true },
      ],
    }));
  }

  function removeRecipient(idx: number) {
    setForm(f => ({
      ...f,
      notificationRecipients: f.notificationRecipients.filter((_: unknown, i: number) => i !== idx),
    }));
  }

  function toggleRecipient(idx: number) {
    setForm(f => ({
      ...f,
      notificationRecipients: f.notificationRecipients.map((r: NotificationRecipient, i: number) =>
        i === idx ? { ...r, active: !r.active } : r
      ),
    }));
  }

  function updateRecipientName(idx: number, name: string) {
    setForm(f => ({
      ...f,
      notificationRecipients: f.notificationRecipients.map((r: NotificationRecipient, i: number) =>
        i === idx ? { ...r, name } : r
      ),
    }));
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-zinc-100">Wholesale Settings</h2>

      <div className="rounded-2xl bg-zinc-900 p-6 shadow-black/20 ring-1 ring-zinc-700">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-zinc-100">Require Approval</p>
              <p className="text-sm text-zinc-500">New registrations must be manually approved.</p>
            </div>
            <button
              onClick={() => setForm(f => ({ ...f, requireApproval: !f.requireApproval }))}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${form.requireApproval ? "bg-green-600" : "bg-slate-300"}`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-zinc-900 shadow transition-transform ${form.requireApproval ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-zinc-100">Wholesale Portal</p>
              <p className="text-sm text-zinc-500">Show the Wholesale Portal card on this brand's storefront page.</p>
            </div>
            <button
              onClick={() => setForm(f => ({ ...f, wholesaleEnabled: !f.wholesaleEnabled }))}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${form.wholesaleEnabled ? "bg-green-600" : "bg-slate-300"}`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-zinc-900 shadow transition-transform ${form.wholesaleEnabled ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
                <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-zinc-100">Square Sync for Wholesale</p>
                <p className="text-xs text-zinc-500">
                  When enabled, wholesale product changes are automatically pushed to Square.
                  {form.squareSyncEnabled
                    ? " Auto-sync is active."
                    : " Auto-sync is disabled — changes will not be pushed to Square."}
                </p>
              </div>
            </div>
            <button
              onClick={() => setForm(f => ({ ...f, squareSyncEnabled: !f.squareSyncEnabled }))}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${form.squareSyncEnabled ? "bg-green-600" : "bg-slate-300"}`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-zinc-900 shadow transition-transform ${form.squareSyncEnabled ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Minimum Order Amount ($)</label>
              <input type="number" value={form.minOrderAmount} onChange={e => setForm(f => ({ ...f, minOrderAmount: e.target.value }))}
                className="w-full rounded-xl border border-zinc-600 px-3 py-2 text-sm outline-none focus:border-slate-900" step="0.01" placeholder="No minimum" />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">From Email</label>
              <input type="email" value={form.fromEmail} onChange={e => setForm(f => ({ ...f, fromEmail: e.target.value }))}
                className="w-full rounded-xl border border-zinc-600 px-3 py-2 text-sm outline-none focus:border-slate-900" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-zinc-300 mb-1">Pickup Location</label>
              <textarea value={form.pickupLocation} onChange={e => setForm(f => ({ ...f, pickupLocation: e.target.value }))}
                className="w-full rounded-xl border border-zinc-600 px-3 py-2 text-sm outline-none focus:border-slate-900 font-mono" rows={3} />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-zinc-300 mb-1">FOB Location</label>
              <input value={form.fobLocation} onChange={e => setForm(f => ({ ...f, fobLocation: e.target.value }))}
                className="w-full rounded-xl border border-zinc-600 px-3 py-2 text-sm outline-none focus:border-slate-900" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-zinc-300 mb-1">Invoice Business Name</label>
              <input value={form.invoiceBusinessName} onChange={e => setForm(f => ({ ...f, invoiceBusinessName: e.target.value }))}
                className="w-full rounded-xl border border-zinc-600 px-3 py-2 text-sm outline-none focus:border-slate-900" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-zinc-300 mb-1">Invoice Business Address</label>
              <textarea value={form.invoiceBusinessAddress} onChange={e => setForm(f => ({ ...f, invoiceBusinessAddress: e.target.value }))}
                className="w-full rounded-xl border border-zinc-600 px-3 py-2 text-sm outline-none focus:border-slate-900" rows={2} />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Invoice Business Phone</label>
              <input value={form.invoiceBusinessPhone} onChange={e => setForm(f => ({ ...f, invoiceBusinessPhone: e.target.value }))}
                className="w-full rounded-xl border border-zinc-600 px-3 py-2 text-sm outline-none focus:border-slate-900" />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Invoice Business Email</label>
              <input type="email" value={form.invoiceBusinessEmail} onChange={e => setForm(f => ({ ...f, invoiceBusinessEmail: e.target.value }))}
                className="w-full rounded-xl border border-zinc-600 px-3 py-2 text-sm outline-none focus:border-slate-900" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-zinc-300 mb-1">Invoice Business Website</label>
              <input value={form.invoiceBusinessWebsite} onChange={e => setForm(f => ({ ...f, invoiceBusinessWebsite: e.target.value }))}
                className="w-full rounded-xl border border-zinc-600 px-3 py-2 text-sm outline-none focus:border-slate-900" placeholder="https://" />
            </div>

            {/* Team Notification Recipients */}
            <div className="col-span-2 rounded-2xl bg-blue-50 p-5 ring-1 ring-blue-200">
              <label className="block text-sm font-semibold text-slate-800 mb-1">Team Notification Recipients</label>
              <p className="text-xs text-blue-600 mb-4 leading-relaxed">
                These team members receive all wholesale notifications for this brand — new orders,
                deposits, fulfillments, price sheets, and pickup reminders. If no recipients are
                active, the system falls back to any configured notification email on file.
              </p>

              {/* Empty state */}
              {form.notificationRecipients.length === 0 && (
                <div className="text-center py-6 mb-4 rounded-xl bg-zinc-900 ring-1 ring-zinc-700">
                  <p className="text-sm text-slate-400 mb-1">No recipients added yet.</p>
                  <p className="text-xs text-slate-400">Add an email address below to get started.</p>
                </div>
              )}

              {/* Recipients list */}
              <div className="space-y-2 mb-4">
                {form.notificationRecipients.map((r: NotificationRecipient, idx: number) => (
                  <div key={idx} className={`flex items-center gap-2 rounded-xl px-3 py-2.5 bg-zinc-900 ring-1 ${r.active ? "ring-zinc-700" : "ring-slate-300 opacity-70"}`}>
                    <input
                      type="checkbox" checked={r.active} onChange={() => toggleRecipient(idx)}
                      className="rounded border-slate-400 mt-0.5" title={r.active ? "Active — receives notifications" : "Inactive"} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${r.active ? "text-zinc-100" : "text-slate-400"}`}>{r.email}</p>
                      {r.name && <p className="text-xs text-slate-400 truncate">{r.name}</p>}
                      {r.notification_types && r.notification_types.length > 0 && (
                        <p className="text-xs text-slate-300 mt-0.5" title="Per-type filtering coming soon">Types: {r.notification_types.join(", ")}</p>
                      )}
                    </div>
                    <input
                      type="text" placeholder="Name (optional)"
                      value={r.name ?? ""}
                      onChange={e => updateRecipientName(idx, e.target.value)}
                      className="rounded-xl border border-zinc-600 px-2.5 py-1.5 text-xs w-36 outline-none focus:border-slate-900" />
                    <button onClick={() => removeRecipient(idx)}
                      className="text-red-400 hover:text-red-400 text-xs font-medium px-2 py-1 rounded-lg hover:bg-red-900/30 transition-colors"
                      title="Remove recipient">✕</button>
                  </div>
                ))}
              </div>

              {/* Add recipient */}
              <AddRecipientForm onAdd={addRecipient} />
            </div>
            {/* Webhook Settings */}
            <div className="col-span-2 rounded-2xl bg-purple-50 p-5 ring-1 ring-purple-200">
              <label className="block text-sm font-semibold text-slate-800 mb-1">Webhook Integration</label>
              <p className="text-xs text-purple-600 mb-4 leading-relaxed">
                Send order events to external systems (Harvest Point, ERPs, etc.). Payload is signed
                with HMAC-SHA256. Enable and configure the URL and secret below.
              </p>
              <WebhookSettingsSection brandId={brandId} onMsg={onMsg} />
            </div>

          </div>

          <button onClick={handleSave} disabled={saving}
            className="rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50">
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Webhook Settings Section (inline in SettingsTab) ───────────────────────────
function WebhookSettingsSection({ brandId, onMsg }: {
  brandId: string;
  onMsg: (kind: "success" | "error", text: string) => void;
}) {
  const [settings, setSettings] = useState<{
    url: string;
    secret: string;
    enabled: boolean;
  }>({ url: "", secret: "", enabled: false });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    getWebhookSettings(brandId).then((s: { url: string; secret: string; enabled: boolean } | null) => {
      if (s) {
        setSettings({ url: s.url ?? "", secret: s.secret ?? "", enabled: s.enabled });
      } else {
        setSettings({ url: "", secret: "", enabled: false });
      }
      setLoading(false);
    });
  }, [brandId]);

  async function handleSave() {
    setSaving(true);
    const result = await saveWebhookSettings({
      brandId,
      url: settings.url,
      secret: settings.secret,
      enabled: settings.enabled,
    });
    setSaving(false);
    if (result.success) {
      onMsg("success", "Webhook settings saved.");
    } else {
      onMsg("error", result.error ?? "Failed to save webhook settings.");
    }
  }

  async function handleTestDispatch() {
    if (!settings.url || !settings.secret) {
      onMsg("error", "Enter both a webhook URL and signing secret before testing.");
      return;
    }
    setTesting(true);
    onMsg("success", "Sending test webhook...");

    const testPayload = {
      event: "order_created",
      test: true,
      brand_id: brandId,
      message: "Test webhook from Route Commerce wholesale portal",
      timestamp: new Date().toISOString(),
      order_id: null,
    };
    const payloadString = JSON.stringify(testPayload);
    const signature = crypto
      .createHmac("sha256", settings.secret)
      .update(payloadString)
      .digest("hex");

    try {
      const res = await fetch(settings.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Signature": `sha256=${signature}`,
          "X-Webhook-Event": "order_created",
        },
        body: payloadString,
      });
      const responseText = await res.text().catch(() => "");
      if (res.ok) {
        onMsg("success", `Test delivered — ${res.status} response from your endpoint. Check wholesale_sync_log for the logged entry.`);
      } else {
        onMsg("error", `Webhook endpoint returned ${res.status}: ${responseText.slice(0, 120)}`);
      }
    } catch (err) {
      onMsg("error", `Connection failed: ${err instanceof Error ? err.message : "Network error"}`);
    }

    setTesting(false);
  }

  if (loading) {
    return <p className="text-sm text-slate-400">Loading webhook settings...</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-300">Webhook Enabled</p>
          <p className="text-xs text-zinc-500">When disabled, no events are queued or sent.</p>
        </div>
        <button
          onClick={() => setSettings(s => ({ ...s, enabled: !s.enabled }))}
          className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${settings.enabled ? "bg-purple-600" : "bg-slate-300"}`}
        >
          <span className={`inline-block h-5 w-5 transform rounded-full bg-zinc-900 shadow transition-transform ${settings.enabled ? "translate-x-6" : "translate-x-1"}`} />
        </button>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-1">Webhook URL</label>
        <input
          type="url"
          value={settings.url}
          onChange={e => setSettings(s => ({ ...s, url: e.target.value }))}
          placeholder="https://your-system.com/webhooks/wholesale"
          className="w-full rounded-xl border border-zinc-600 px-3 py-2 text-sm outline-none focus:border-purple-600"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-1">
          Signing Secret (HMAC-SHA256)
        </label>
        <input
          type="password"
          value={settings.secret}
          onChange={e => setSettings(s => ({ ...s, secret: e.target.value }))}
          placeholder="Leave blank to keep current secret"
          className="w-full rounded-xl border border-zinc-600 px-3 py-2 text-sm outline-none focus:border-purple-600 font-mono"
        />
        <p className="mt-1 text-xs text-slate-400">
          The receiver should verify the <code className="bg-zinc-950 px-1">X-Webhook-Signature</code> header using this secret.
        </p>
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Webhook Settings"}
        </button>
        {settings.enabled && settings.url && (
          <button
            onClick={handleTestDispatch}
            disabled={testing}
            className="rounded-xl border border-purple-300 px-4 py-2 text-sm font-medium text-purple-700 hover:bg-purple-50 disabled:opacity-50"
          >
            {testing ? "Dispatching..." : "Send Test Webhook"}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Add Recipient Form (inline in Settings) ───────────────────────────────────
function AddRecipientForm({ onAdd }: { onAdd: (email: string, name: string) => void }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  function isValidEmail(e: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  }

  function handleAdd() {
    if (!email.trim()) return;
    if (!isValidEmail(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    setError("");
    onAdd(email.trim(), name.trim());
    setEmail("");
    setName("");
  }

  return (
    <div className="flex gap-2 items-start">
      <div className="flex-1">
        <input
          type="email" placeholder="Email address"
          value={email} onChange={e => { setEmail(e.target.value); setError(""); }}
          onKeyDown={e => e.key === "Enter" && handleAdd()}
          className="w-full rounded-xl border border-zinc-600 px-3 py-2 text-sm outline-none focus:border-slate-900" />
      </div>
      <div className="w-36">
        <input
          type="text" placeholder="Name (optional)"
          value={name} onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleAdd()}
          className="w-full rounded-xl border border-zinc-600 px-3 py-2 text-sm outline-none focus:border-slate-900" />
      </div>
      <button onClick={handleAdd}
        className="rounded-xl bg-green-600 text-white px-3 py-2 text-sm font-medium hover:bg-green-700 whitespace-nowrap">
        Add
      </button>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

// ── Shared Components ─────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    awaiting_deposit: "bg-purple-100 text-purple-700",
    confirmed: "bg-blue-100 text-blue-700",
    fulfilled: "bg-green-100 text-green-400",
  };
  const label: Record<string, string> = {
    pending: "Pending",
    awaiting_deposit: "Awaiting Deposit",
    confirmed: "Confirmed",
    fulfilled: "Fulfilled",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${map[status] ?? "bg-zinc-950 text-zinc-400"}`}>
      {label[status] ?? status}
    </span>
  );
}