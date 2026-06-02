"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { formatDate } from "@/lib/format-date";
import { useRouter, useSearchParams } from "next/navigation";
import { getWholesaleCustomerByUser, submitWholesaleOrder, getWholesaleProducts, getWholesaleCustomerOrders, getWholesaleCustomerPricing, getWholesaleCustomer, type WholesaleProduct, type WholesaleCustomerOrder, type WholesalePricingOverride } from "@/actions/wholesale-register";
import { getWholesaleSettings, enqueueWholesaleNotification } from "@/actions/wholesale";

type CartItem = {
  product: WholesaleProduct;
  quantity: number;
  unitPrice: number;
};

// ── Loading Skeleton ─────────────────────────────────────────────────────────
function ProductSkeleton() {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2">
          <div className="h-5 w-32 bg-slate-200 rounded" />
          <div className="h-3 w-48 bg-slate-100 rounded" />
          <div className="h-3 w-24 bg-slate-100 rounded" />
          <div className="h-3 w-40 bg-slate-100 rounded" />
        </div>
        <div className="h-10 w-20 bg-slate-200 rounded-xl" />
      </div>
    </div>
  );
}

function CartSkeleton() {
  return (
    <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 p-5 animate-pulse">
      <div className="h-6 w-40 bg-slate-200 rounded mb-4" />
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex gap-4">
            <div className="h-4 w-32 bg-slate-100 rounded" />
            <div className="h-4 w-16 bg-slate-100 rounded ml-auto" />
            <div className="h-4 w-12 bg-slate-100 rounded" />
            <div className="h-4 w-16 bg-slate-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

function OrdersSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 animate-pulse">
          <div className="flex items-start justify-between mb-3">
            <div className="space-y-2">
              <div className="h-5 w-32 bg-slate-200 rounded" />
              <div className="h-3 w-48 bg-slate-100 rounded" />
            </div>
            <div className="space-y-2 text-right">
              <div className="h-6 w-20 bg-slate-200 rounded" />
              <div className="h-4 w-16 bg-slate-100 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Quantity Stepper ──────────────────────────────────────────────────────────
function QuantityStepper({
  maxQty,
  onAdd,
}: {
  maxQty: number;
  onAdd: (qty: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [qty, setQty] = useState(1);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const presets = maxQty >= 10 ? [1, 5, 10] : maxQty >= 5 ? [1, 5] : [1];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="rounded-xl bg-green-600 px-4 py-2 text-xs font-semibold text-white hover:bg-green-700 shrink-0 transition-colors shadow-sm"
      >
        + Add
      </button>
      {open && (
        <div className="absolute right-0 bottom-full mb-2 z-20 bg-white rounded-xl shadow-xl ring-1 ring-slate-200 p-4 w-56">
          <p className="text-xs font-semibold text-slate-500 mb-2">Qty for this item</p>
          <div className="flex items-center gap-2 mb-3">
            <button
              type="button"
              onClick={() => setQty(q => Math.max(1, q - 1))}
              className="w-9 h-9 rounded-lg border border-slate-300 flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-30"
              disabled={qty <= 1}
            >
              −
            </button>
            <input
              type="number"
              min="1"
              max={maxQty}
              value={qty}
              onChange={e => setQty(Math.min(maxQty, Math.max(1, Number(e.target.value) || 1)))}
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-center font-semibold text-slate-900 outline-none focus:border-green-500 min-w-0"
            />
            <button
              type="button"
              onClick={() => setQty(q => Math.min(maxQty, q + 1))}
              className="w-9 h-9 rounded-lg border border-slate-300 flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-30"
              disabled={qty >= maxQty}
            >
              +
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {presets.map(p => (
              <button
                key={p}
                type="button"
                onClick={() => setQty(Math.min(maxQty, p))}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                  qty === p ? "bg-green-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {p}
              </button>
            ))}
            {maxQty >= 20 && (
              <button
                type="button"
                onClick={() => setQty(Math.min(maxQty, 20))}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                  qty === 20 ? "bg-green-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                20
              </button>
            )}
          </div>
          <p className="text-xs text-slate-400 mb-3">Max: {maxQty}</p>
          <button
            type="button"
            onClick={() => { onAdd(qty); setOpen(false); setQty(1); }}
            className="w-full rounded-xl bg-green-600 py-2.5 text-sm font-bold text-white hover:bg-green-700"
          >
            Add {qty} to Cart
          </button>
        </div>
      )}
    </div>
  );
}

// ── Search & Filter Bar ───────────────────────────────────────────────────────
function SearchBar({ value, onChange, placeholder }: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative">
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
      </svg>
      <input
        type="search"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-300 pl-10 pr-4 py-3 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 placeholder:text-slate-400"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      )}
    </div>
  );
}

// ── Empty States ──────────────────────────────────────────────────────────────
function EmptyState({ icon, title, description }: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-12 text-center shadow-sm ring-1 ring-slate-200">
      <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-slate-700 mb-2">{title}</h3>
      <p className="text-sm text-slate-500 max-w-xs mx-auto">{description}</p>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
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
  const [allProducts, setAllProducts] = useState<WholesaleProduct[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<WholesaleCustomerOrder[]>([]);
  const [pricingOverrides, setPricingOverrides] = useState<Record<string, number>>({});
  const [pickupDate, setPickupDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [onlinePaymentEnabled, setOnlinePaymentEnabled] = useState(false);
  const [processingPayment, setProcessingPayment] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAvailability, setFilterAvailability] = useState<"all" | "available" | "limited">("all");

  // Product filtering
  const filteredProducts = useMemo(() => {
    let filtered = allProducts;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.description ?? "").toLowerCase().includes(q)
      );
    }
    if (filterAvailability !== "all") {
      filtered = filtered.filter(p =>
        filterAvailability === "available" ? p.availability === "available" : p.availability === "limited"
      );
    }
    return filtered;
  }, [allProducts, searchQuery, filterAvailability]);

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
    setAllProducts(prods);
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

  function addToCart(product: WholesaleProduct, quantity: number) {
    if (quantity <= 0 || quantity > product.qty_available) return;

    // Determine unit price: customer override first, then price tiers
    let unitPrice = 0;
    const overridePrice = pricingOverrides[product.id];
    if (overridePrice !== undefined) {
      unitPrice = overridePrice;
    } else if (product.price_tiers && product.price_tiers.length > 0) {
      const tier = product.price_tiers.find((t: { min_qty: number; max_qty: number; price: number }) =>
        quantity >= t.min_qty && (t.max_qty === 0 || quantity <= t.max_qty)
      );
      unitPrice = tier ? tier.price : product.price_tiers[product.price_tiers.length - 1].price;
    }

    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        const newQty = existing.quantity + quantity;
        // Recalculate unit price if quantity changed tier
        let newUnitPrice = unitPrice;
        if (overridePrice === undefined && product.price_tiers && product.price_tiers.length > 0) {
          const tier = product.price_tiers.find((t: { min_qty: number; max_qty: number; price: number }) =>
            newQty >= t.min_qty && (t.max_qty === 0 || newQty <= t.max_qty)
          );
          newUnitPrice = tier ? tier.price : product.price_tiers[product.price_tiers.length - 1].price;
        }
        return prev.map(i => i.product.id === product.id ? { ...i, quantity: newQty, unitPrice: newUnitPrice } : i);
      }
      return [...prev, { product, quantity, unitPrice }];
    });
    setTab("cart");
    // Brief success feedback
    setMsg({ kind: "success", text: `${quantity} × ${product.name} added to cart` });
    setTimeout(() => setMsg(null), 3000);
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
      <div className="min-h-screen bg-slate-100">
        {previewMode && (
          <div className="bg-yellow-400 text-yellow-900 text-center py-2 text-sm font-medium">
            Admin Preview — viewing portal as {customer?.company_name}
          </div>
        )}
        {/* Skeleton header */}
        <div className="bg-white border-b border-slate-200 px-6 py-4">
          <div className="mx-auto max-w-5xl flex items-center justify-between">
            <div className="animate-pulse space-y-2">
              <div className="h-6 w-40 bg-slate-200 rounded" />
              <div className="h-4 w-56 bg-slate-100 rounded" />
            </div>
            <div className="h-10 w-24 bg-slate-200 rounded-xl" />
          </div>
        </div>
        {/* Skeleton tab bar */}
        <div className="bg-white border-b border-slate-200 px-6">
          <div className="mx-auto max-w-5xl">
            <div className="flex gap-1 -mb-px py-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-9 w-20 bg-slate-200 rounded-xl animate-pulse" />
              ))}
            </div>
          </div>
        </div>
        <div className="mx-auto max-w-5xl px-6 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => <ProductSkeleton key={i} />)}
          </div>
        </div>
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
            {/* Search + filter bar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <SearchBar
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Search products..."
                />
              </div>
              <select
                value={filterAvailability}
                onChange={e => setFilterAvailability(e.target.value as typeof filterAvailability)}
                className="rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-green-500 min-h-[48px]"
              >
                <option value="all">All ({allProducts.length})</option>
                <option value="available">Available ({allProducts.filter(p => p.availability === "available").length})</option>
                <option value="limited">Limited Stock</option>
              </select>
            </div>

            {filteredProducts.length === 0 && !loading ? (
              allProducts.length === 0 ? (
                <EmptyState
                  icon={
                    <svg className="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                    </svg>
                  }
                  title="No products available"
                  description="This wholesale portal doesn't have any products listed yet. Check back soon or contact support."
                />
              ) : (
                <EmptyState
                  icon={
                    <svg className="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                    </svg>
                  }
                  title="No products match your search"
                  description={`No products found for "${searchQuery}". Try adjusting your search or filters.`}
                />
              )
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredProducts.map(p => (
                  <div key={p.id} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-900">{p.name}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">{p.description ?? ""}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            p.availability === "available" ? "bg-green-100 text-green-700" :
                            p.availability === "limited" ? "bg-amber-100 text-amber-700" :
                            "bg-slate-100 text-slate-500"
                          }`}>
                            {p.availability === "available" ? "In Stock" :
                             p.availability === "limited" ? `Limited (${p.qty_available})` :
                             "Out of Stock"}
                          </span>
                          <span className="text-xs text-slate-400">{p.unit_type}</span>
                        </div>
                        {p.price_tiers && p.price_tiers.length > 0 && (
                          <div className="mt-2 space-y-0.5">
                            {pricingOverrides[p.id] !== undefined ? (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-green-600 font-semibold bg-green-50 px-2 py-0.5 rounded">
                                  Your price: ${pricingOverrides[p.id]!.toFixed(2)} / {p.unit_type}
                                </span>
                              </div>
                            ) : (
                              <div className="flex flex-wrap gap-x-3 gap-y-1">
                                {p.price_tiers.slice(0, 3).map((t: { min_qty: number; max_qty: number; price: number }, i: number) => (
                                  <span key={i} className="text-xs text-slate-500">
                                    <span className="font-medium text-slate-700">${t.price.toFixed(2)}</span>
                                    <span className="text-slate-400 ml-1">
                                      {t.max_qty === 0 ? `${t.min_qty}+` : `${t.min_qty}–${t.max_qty}`}
                                    </span>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      {p.availability === "available" && p.qty_available > 0 ? (
                        <QuantityStepper
                          maxQty={p.qty_available}
                          onAdd={(qty) => addToCart(p, qty)}
                        />
                      ) : p.availability === "limited" && p.qty_available > 0 ? (
                        <QuantityStepper
                          maxQty={p.qty_available}
                          onAdd={(qty) => addToCart(p, qty)}
                        />
                      ) : (
                        <span className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-medium text-slate-400 shrink-0">
                          Unavailable
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {searchQuery && (
              <p className="text-sm text-slate-500 text-center">
                Showing {filteredProducts.length} of {allProducts.length} products
              </p>
            )}
          </div>
        )}

        {tab === "cart" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                Your Order
                {cart.length > 0 && (
                  <span className="ml-2 text-sm font-normal text-slate-500">({cart.length} item{cart.length !== 1 ? "s" : ""})</span>
                )}
              </h2>
              {cart.length > 0 && (
                <button
                  onClick={() => setCart([])}
                  className="text-sm text-red-500 hover:text-red-700 hover:underline"
                >
                  Clear cart
                </button>
              )}
            </div>
            {cart.length === 0 ? (
              <EmptyState
                icon={
                  <svg className="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
                  </svg>
                }
                title="Your cart is empty"
                description="Browse our product catalog and add items to get started with your wholesale order."
              />
            ) : (
              <>
                <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="px-5 py-3 font-semibold text-left">Product</th>
                        <th className="px-5 py-3 font-semibold text-center">Qty</th>
                        <th className="px-5 py-3 font-semibold text-right">Unit Price</th>
                        <th className="px-5 py-3 font-semibold text-right">Total</th>
                        <th className="px-5 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {cart.map(item => (
                        <tr key={item.product.id} className="hover:bg-slate-50/50">
                          <td className="px-5 py-4">
                            <span className="font-medium text-slate-900">{item.product.name}</span>
                            <span className="ml-1 text-xs text-slate-400">/ {item.product.unit_type}</span>
                          </td>
                          <td className="px-5 py-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => {
                                  if (item.quantity > 1) {
                                    setCart(prev => prev.map(i =>
                                      i.product.id === item.product.id
                                        ? { ...i, quantity: i.quantity - 1 }
                                        : i
                                    ));
                                  } else {
                                    setCart(prev => prev.filter(i => i.product.id !== item.product.id));
                                  }
                                }}
                                className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                              >
                                −
                              </button>
                              <span className="w-10 text-center font-semibold text-slate-900">{item.quantity}</span>
                              <button
                                onClick={() => {
                                  if (item.quantity < item.product.qty_available) {
                                    setCart(prev => prev.map(i =>
                                      i.product.id === item.product.id
                                        ? { ...i, quantity: i.quantity + 1 }
                                        : i
                                    ));
                                  }
                                }}
                                disabled={item.quantity >= item.product.qty_available}
                                className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-right text-slate-600">${item.unitPrice.toFixed(2)}</td>
                          <td className="px-5 py-4 text-right font-semibold text-slate-900">${(item.quantity * item.unitPrice).toFixed(2)}</td>
                          <td className="px-5 py-4">
                            <button
                              onClick={() => setCart(prev => prev.filter(i => i.product.id !== item.product.id))}
                              className="text-xs text-red-500 hover:text-red-700 hover:underline"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 p-5">
                  <div className="flex flex-col sm:flex-row gap-4 sm:items-end">
                    <div className="flex-1">
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                        Preferred Pickup Date
                        <span className="text-slate-400 font-normal ml-1">(optional)</span>
                      </label>
                      <input
                        type="date"
                        value={pickupDate}
                        onChange={e => setPickupDate(e.target.value)}
                        min={new Date().toISOString().split("T")[0]}
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                      />
                    </div>
                    <div className="flex items-center justify-between sm:flex-col sm:items-end gap-3">
                      <div className="text-right">
                        <p className="text-sm text-slate-500">Order Total</p>
                        <p className="text-2xl font-bold text-slate-900">
                          ${cart.reduce((s, i) => s + i.quantity * i.unitPrice, 0).toFixed(2)}
                        </p>
                      </div>
                      <button
                        onClick={handlePlaceOrder}
                        disabled={submitting || cart.length === 0}
                        className="rounded-xl bg-green-600 px-8 py-3 text-base font-bold text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-green-900/20 min-w-[160px]"
                      >
                        {submitting ? (
                          <span className="flex items-center justify-center gap-2">
                            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Placing Order...
                          </span>
                        ) : "Place Order"}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {tab === "orders" && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Order History
              {orders.length > 0 && (
                <span className="ml-2 text-sm font-normal text-slate-500">({orders.length} order{orders.length !== 1 ? "s" : ""})</span>
              )}
            </h2>
            {orders.length === 0 ? (
              <EmptyState
                icon={
                  <svg className="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
                  </svg>
                }
                title="No orders yet"
                description="Once you place your first wholesale order, it will appear here with full order history and tracking."
              />
            ) : (
              <div className="space-y-3">
                {orders.map(o => (
                  <div key={o.id} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 hover:ring-slate-300 transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-slate-900">{o.invoice_number ?? "—"}</p>
                          {o.invoice_number && (
                            <span className="text-xs text-slate-400 font-mono">{o.id.slice(0, 8)}</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          {formatDate(new Date(o.created_at))}
                          {o.anticipated_pickup_date && (
                            <span className="ml-2 text-green-600 font-medium">→ Pickup: {o.anticipated_pickup_date}</span>
                          )}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-slate-900">${Number(o.subtotal).toFixed(2)}</p>
                        <p className={`text-sm font-medium ${
                          o.payment_status === "paid" ? "text-green-600" : "text-orange-500"
                        }`}>
                          {o.payment_status === "paid" ? "Paid in full" : `$${Number(o.balance_due).toFixed(2)} due`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        o.status === "fulfilled" ? "bg-green-100 text-green-700" :
                        o.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                        o.status === "awaiting_deposit" ? "bg-purple-100 text-purple-700" :
                        o.status === "confirmed" ? "bg-blue-100 text-blue-700" :
                        "bg-slate-100 text-slate-700"
                      }`}>
                        {o.status.replace(/_/g, " ")}
                      </span>
                      {o.items && o.items.length > 0 && (
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                          </svg>
                          {o.items.length} item{o.items.length !== 1 ? "s" : ""}
                        </span>
                      )}
                      <div className="ml-auto flex items-center gap-2">
                        {o.invoice_number && o.invoice_token && (
                          <a
                            href={`/api/wholesale/invoice/${o.id}/pdf?token=${o.invoice_token}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-xl bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 flex items-center gap-1"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                            </svg>
                            Invoice
                          </a>
                        )}
                        {onlinePaymentEnabled && Number(o.balance_due) > 0 && o.payment_status !== "paid" && (
                          <button
                            onClick={() => handlePayNow(o)}
                            disabled={processingPayment === o.id}
                            className="rounded-xl bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
                            </svg>
                            {processingPayment === o.id ? "Loading..." : "Pay Now"}
                          </button>
                        )}
                      </div>
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