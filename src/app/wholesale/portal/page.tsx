"use client";

import { useState, useEffect } from "react";
import { formatDate } from "@/lib/format-date";
import { useRouter, useSearchParams } from "next/navigation";
import { getWholesaleCustomerByUser, submitWholesaleOrder, getWholesaleProducts, getWholesaleCustomerOrders, getWholesaleCustomerPricing, getWholesaleCustomer, type WholesaleProduct, type WholesaleCustomerOrder, type WholesalePricingOverride } from "@/actions/wholesale-register";
import { getWholesaleSettings, enqueueWholesaleNotification } from "@/actions/wholesale";

type CartItem = {
  product: WholesaleProduct;
  quantity: number;
  unitPrice: number;
};

export default function WholesalePortalPage() {
  const router = useRouter();
  const [customer, setCustomer] = useState<{
    id: string;
    user_id: string;
    company_name: string;
    contact_name: string;
    email: string;
    account_status: string;
    brand_id: string;
  } | null>(null);
  const [brandName, setBrandName] = useState("Wholesale Portal");
  const [loading, setLoading] = useState(true);
  const [previewMode, setPreviewMode] = useState(false);
  const [tab, setTab] = useState<"products" | "cart" | "orders">("products");
  const [products, setProducts] = useState<WholesaleProduct[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<WholesaleCustomerOrder[]>([]);
  const [pricingOverrides, setPricingOverrides] = useState<Record<string, number>>({});
  const [pickupDate, setPickupDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [onlinePaymentEnabled, setOnlinePaymentEnabled] = useState(false);
  const [processingPayment, setProcessingPayment] = useState<string | null>(null);

  useEffect(() => {
    // ── Admin preview mode ──────────────────────────────────────────────────
    const params = new URLSearchParams(window.location.search);
    const isPreview = params.get("_admin_preview") === "1";
    const previewCustomerId = params.get("preview_customer_id");

    if (isPreview && previewCustomerId) {
      // Load customer directly by ID (admin preview mode — no login required)
      getWholesaleCustomer(previewCustomerId).then(async cust => {
        if (!cust) {
          // In preview mode with an invalid customer ID, show empty state
          setCustomer(null);
          setLoading(false);
          return;
        }
        const { supabase } = await import("@/lib/supabase");
        const { data: ws } = await supabase
          .from("wholesale_settings")
          .select("wholesale_enabled, online_payment_enabled")
          .eq("brand_id", cust.brand_id)
          .single();
        setOnlinePaymentEnabled(ws?.online_payment_enabled ?? false);
        setCustomer(cust);
        setPreviewMode(true);
        setLoading(false);
        loadBrandName(cust.brand_id);
        loadProducts(cust.brand_id);
        loadOrders(cust.id);
        loadPricingOverrides(cust.id);
      });
      return; // ← prevent the synchronous session check below from running while preview loads
    }

    // ── Normal session-based login ────────────────────────────────────────
    const cookies = document.cookie.split(";").reduce((acc, c) => {
      const [k, v] = c.trim().split("=");
      acc[k] = decodeURIComponent(v);
      return acc;
    }, {} as Record<string, string>);

    const session = cookies["wholesale_session"];
    if (!session) {
      router.push("/wholesale/login");
      return;
    }

    let userId: string;
    try {
      const parsed = JSON.parse(session);
      userId = parsed.user_id;
    } catch {
      router.push("/wholesale/login");
      return;
    }

    getWholesaleCustomerByUser("00000000-0000-0000-0000-000000000000", userId).then(async cust => {
      if (!cust || cust.account_status !== "active") {
        router.push("/wholesale/login?error=account_not_active");
        return;
      }

      const { supabase } = await import("@/lib/supabase");
      const { data: ws } = await supabase
        .from("wholesale_settings")
        .select("wholesale_enabled, online_payment_enabled")
        .eq("brand_id", cust.brand_id)
        .single();
      if (ws && ws.wholesale_enabled === false) {
        router.push("/wholesale/login?error=portal_disabled");
        return;
      }

      setOnlinePaymentEnabled(ws?.online_payment_enabled ?? false);
      setCustomer(cust);
      setLoading(false);
      loadBrandName(cust.brand_id);
      loadProducts(cust.brand_id);
      loadOrders(cust.id);
      loadPricingOverrides(cust.id);
    });
  }, [router]);

  async function loadBrandName(brandId: string) {
    const { supabase } = await import("@/lib/supabase");
    const { data: brand } = await supabase
      .from("brands")
      .select("name")
      .eq("id", brandId)
      .single();
    if (brand) setBrandName(brand.name);
  }

  async function loadProducts(brandId: string) {
    const { getWholesaleProducts } = await import("@/actions/wholesale");
    const prods = await getWholesaleProducts(brandId);
    setProducts(prods);
  }

  async function loadOrders(customerId: string) {
    const orderList = await getWholesaleCustomerOrders(customerId);
    setOrders(orderList);
  }

  async function loadPricingOverrides(customerId: string) {
    const pricing = await getWholesaleCustomerPricing(customerId);
    const map: Record<string, number> = {};
    for (const p of pricing) {
      map[p.product_id] = p.custom_unit_price;
    }
    setPricingOverrides(map);
  }

  async function handlePayNow(order: WholesaleCustomerOrder) {
    if (!customer) return;
    setProcessingPayment(order.id);
    try {
      const res = await fetch("/api/wholesale/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id, customerId: customer.id }),
      });
      const data = await res.json();
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        setMsg({ kind: "error", text: data.error ?? "Failed to start payment." });
      }
    } catch {
      setMsg({ kind: "error", text: "Payment request failed." });
    } finally {
      setProcessingPayment(null);
    }
  }

  function addToCart(product: WholesaleProduct) {
    const qty = prompt(`Quantity for ${product.name} (${product.unit_type}):`);
    if (!qty) return;
    const q = Number(qty);
    if (isNaN(q) || q <= 0) return;

    // Determine unit price: customer override first, then price tiers
    let unitPrice = 0;
    const overridePrice = pricingOverrides[product.id];
    if (overridePrice !== undefined) {
      unitPrice = overridePrice;
    } else if (product.price_tiers && product.price_tiers.length > 0) {
      const tier = product.price_tiers.find((t: { min_qty: number; max_qty: number; price: number }) =>
        q >= t.min_qty && (t.max_qty === 0 || q <= t.max_qty)
      );
      unitPrice = tier ? tier.price : product.price_tiers[product.price_tiers.length - 1].price;
    }

    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + q } : i);
      }
      return [...prev, { product, quantity: q, unitPrice }];
    });
    setTab("cart");
  }

  async function handlePlaceOrder() {
    if (!customer || cart.length === 0) return;
    setSubmitting(true);
    setMsg(null);

    const checkoutSessionId = crypto.randomUUID();
    const items = cart.map(c => ({
      product_id: c.product.id,
      quantity: c.quantity,
      unit_price: c.unitPrice,
    }));

    const result = await submitWholesaleOrder({
      brandId: customer.brand_id,
      customerId: customer.id,
      anticipatedPickupDate: pickupDate || undefined,
      items,
      checkoutSessionId,
    });

    setSubmitting(false);
    if (result.success) {
      setMsg({ kind: "success", text: `Order placed! Invoice: ${result.invoiceNumber} — Status: ${result.status}` });
      setCart([]);
      setPickupDate("");
      if (customer) loadOrders(customer.id);

      // Enqueue order confirmation notification
      if (result.orderId && customer) {
        const total = cart.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
        enqueueWholesaleNotification({
          brandId: customer.brand_id,
          customerId: customer.id,
          orderId: result.orderId,
          type: "order_confirmation",
          emailTo: customer.email,
          subject: `Order ${result.invoiceNumber} Confirmed`,
          bodyHtml: `
            <h2>Thank you for your order, ${customer.company_name}!</h2>
            <p>Your wholesale order <strong>${result.invoiceNumber}</strong> has been received.</p>
            <p><strong>Total:</strong> $${total.toFixed(2)}</p>
            ${result.status === "awaiting_deposit" ? `<p><strong>Deposit Required:</strong> Your order is awaiting a deposit payment.</p>` : ""}
            <p>We'll notify you when your order is ready for pickup.</p>
          `,
          bodyText: `Order ${result.invoiceNumber} confirmed. Total: $${total.toFixed(2)}. Status: ${result.status}.`,
        });

        // Also notify the admin
        const settings = await getWholesaleSettings(customer.brand_id);
        const adminEmail = settings?.notification_email ?? settings?.from_email ?? settings?.invoice_business_email ?? null;
        if (adminEmail) {
          enqueueWholesaleNotification({
            brandId: customer.brand_id,
            customerId: customer.id,
            orderId: result.orderId,
            type: "order_confirmation",
            emailTo: adminEmail,
            subject: `[Admin] New Wholesale Order — ${result.invoiceNumber}`,
            bodyHtml: `
              <h2>New Wholesale Order</h2>
              <p>A new wholesale order has been placed by <strong>${customer.company_name}</strong>.</p>
              <p><strong>Invoice:</strong> ${result.invoiceNumber}</p>
              <p><strong>Total:</strong> $${total.toFixed(2)}</p>
              <p><strong>Status:</strong> ${result.status}</p>
              ${result.status === "awaiting_deposit" ? `<p><strong>Action Required:</strong> Awaiting deposit payment.</p>` : ""}
            `,
            bodyText: `New wholesale order ${result.invoiceNumber} from ${customer.company_name}. Total: $${total.toFixed(2)}. Status: ${result.status}.`,
          });
        }

        // Trigger notification send (fire-and-forget)
        fetch(`/api/wholesale/notifications/send`, { method: "POST" }).catch(() => {});
      }
    } else {
      let errorText = result.error ?? "Failed to place order.";
      if (result.creditLimit !== undefined) {
        errorText += ` (Credit limit: $${result.creditLimit} | Outstanding: $${result.outstandingBalance?.toFixed(2)} | Order total: $${result.orderTotal?.toFixed(2)})`;
      }
      setMsg({ kind: "error", text: errorText });
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <p className="text-slate-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {previewMode && (
        <div className="bg-yellow-400 text-yellow-900 text-center py-2 text-sm font-medium">
          Admin Preview — viewing portal as {customer?.company_name}
        </div>
      )}
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="mx-auto max-w-5xl flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">{brandName}</h1>
            <p className="text-sm text-slate-500">Wholesale Portal — {customer?.company_name}</p>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => { document.cookie = "wholesale_session=; path=/; max-age=0"; router.push("/wholesale/login"); }}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Tab nav */}
      <div className="bg-white border-b border-slate-200 px-6">
        <div className="mx-auto max-w-5xl">
          <nav className="flex gap-1 -mb-px">
            {(["products", "cart", "orders"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${tab === t ? "border-green-600 text-green-700" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
                {t === "cart" && cart.length > 0 && (
                  <span className="ml-2 bg-green-600 text-white text-xs rounded-full px-1.5 py-0.5">{cart.length}</span>
                )}
              </button>
            ))}
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

        {tab === "products" && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Product Catalog</h2>
            {products.length === 0 ? (
              <p className="text-sm text-slate-400 py-8 text-center">No products available.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {products.map(p => (
                  <div key={p.id} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-slate-900">{p.name}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">{p.description ?? ""}</p>
                        <p className="text-xs text-slate-400 mt-1">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${p.availability === "available" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                            {p.availability}
                          </span>
                          {" "}{p.qty_available} {p.unit_type} available
                        </p>
                        {p.price_tiers && p.price_tiers.length > 0 && (
                          <p className="text-xs text-slate-500 mt-1">
                            {pricingOverrides[p.id] !== undefined ? (
                              <span className="text-green-700 font-medium">Your price: ${pricingOverrides[p.id]!.toFixed(2)}</span>
                            ) : (
                              p.price_tiers.map((t: { min_qty: number; max_qty: number; price: number }, i: number) => (
                                <span key={i} className="mr-2">
                                  {t.min_qty}{t.max_qty ? `-${t.max_qty}` : "+"}: ${t.price}
                                </span>
                              ))
                            )}
                          </p>
                        )}
                      </div>
                      {p.availability === "available" && (
                        <button onClick={() => addToCart(p)}
                          className="rounded-xl bg-green-600 px-4 py-2 text-xs font-semibold text-white hover:bg-green-700 shrink-0">
                          + Add
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "cart" && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Your Order ({cart.length} items)</h2>
            {cart.length === 0 ? (
              <p className="text-sm text-slate-400 py-8 text-center">Cart is empty.</p>
            ) : (
              <>
                <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="px-5 py-3 font-semibold text-left">Product</th>
                        <th className="px-5 py-3 font-semibold text-right">Qty</th>
                        <th className="px-5 py-3 font-semibold text-right">Unit Price</th>
                        <th className="px-5 py-3 font-semibold text-right">Total</th>
                        <th className="px-5 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {cart.map(item => (
                        <tr key={item.product.id}>
                          <td className="px-5 py-3 font-medium text-slate-900">{item.product.name}</td>
                          <td className="px-5 py-3 text-right">{item.quantity} {item.product.unit_type}</td>
                          <td className="px-5 py-3 text-right">${item.unitPrice.toFixed(2)}</td>
                          <td className="px-5 py-3 text-right font-semibold">${(item.quantity * item.unitPrice).toFixed(2)}</td>
                          <td className="px-5 py-3">
                            <button onClick={() => setCart(prev => prev.filter(i => i.product.id !== item.product.id))}
                              className="text-xs text-red-500 hover:underline">Remove</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex gap-4 items-end">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Pickup Date</label>
                    <input type="date" value={pickupDate} onChange={e => setPickupDate(e.target.value)}
                      className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-green-600" />
                  </div>
                  <div className="ml-auto">
                    <p className="text-sm text-slate-500 mb-1">
                      Total: <span className="font-bold text-slate-900">${cart.reduce((s, i) => s + i.quantity * i.unitPrice, 0).toFixed(2)}</span>
                    </p>
                    <button onClick={handlePlaceOrder} disabled={submitting || !pickupDate}
                      className="rounded-xl bg-green-600 px-6 py-3 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-50">
                      {submitting ? "Placing Order..." : "Place Order"}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {tab === "orders" && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Order History</h2>
            {orders.length === 0 ? (
              <p className="text-sm text-slate-400 py-8 text-center">No orders yet.</p>
            ) : (
              <div className="space-y-3">
                {orders.map(o => (
                  <div key={o.id} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-semibold text-slate-900">{o.invoice_number ?? o.id.slice(0, 8)}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {formatDate(new Date(o.created_at))}
                          {o.anticipated_pickup_date && ` · Pickup: ${o.anticipated_pickup_date}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-900">${Number(o.subtotal).toFixed(2)}</p>
                        <p className={`text-xs font-medium ${
                          o.payment_status === "paid" ? "text-green-600" : "text-orange-500"
                        }`}>
                          {o.payment_status === "paid" ? "Paid" : `$${Number(o.balance_due).toFixed(2)} due`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        o.status === "fulfilled" ? "bg-green-100 text-green-700" :
                        o.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                        o.status === "awaiting_deposit" ? "bg-purple-100 text-purple-700" :
                        "bg-blue-100 text-blue-700"
                      }`}>
                        {o.status.replace("_", " ")}
                      </span>
                      {o.items && o.items.length > 0 && (
                        <span className="text-xs text-slate-500">
                          {o.items.length} item{o.items.length !== 1 ? "s" : ""}
                        </span>
                      )}
                      {o.invoice_number && o.invoice_token && (
                        <a
                          href={`/api/wholesale/invoice/${o.id}/pdf?token=${o.invoice_token}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-xl bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700"
                        >
                          Download Invoice
                        </a>
                      )}
                      {onlinePaymentEnabled && Number(o.balance_due) > 0 && o.payment_status !== "paid" && (
                        <button
                          onClick={() => handlePayNow(o)}
                          disabled={processingPayment === o.id}
                          className="ml-auto rounded-xl bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                        >
                          {processingPayment === o.id ? "Loading..." : "Pay Now"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mx-auto max-w-5xl px-6 py-8 text-center">
        <p className="text-xs text-slate-400">
          Powered by{" "}
          <a href="https://cielohermosa.com" target="_blank" rel="noopener noreferrer" className="hover:text-slate-600">
            Route Commerce
          </a>
        </p>
      </div>
    </div>
  );
}