"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateOrder, updateOrderItem, deleteOrderItem } from "@/actions/orders/update-order";
import { AdminInput, AdminTextInput, AdminTextarea } from "./design-system";

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
  discount_amount: number;
  tax_amount: number | null;
  tax_rate: number | null;
  tax_source: string | null;
  tax_location: string | null;
  internal_notes: string | null;
  discount_reason: string | null;
  pickup_complete: boolean;
  pickup_completed_at: string | null;
  pickup_completed_by: string | null;
  created_at: string;
  stops: { city: string; state: string; date: string } | null;
  order_items: OrderItem[];
};

type OrderEditFormProps = {
  order: Order;
  brandId: string | null;
};

type EditableItem = {
  id: string;
  product_id: string;
  quantity: number;
  price: number;
  productName: string;
  removed: boolean;
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

export default function OrderEditForm({ order, brandId }: OrderEditFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [customer_name, setCustomer_name] = useState(order.customer_name);
  const [customer_email, setCustomer_email] = useState(order.customer_email ?? "");
  const [customer_phone, setCustomer_phone] = useState(order.customer_phone ?? "");
  const [discount_amount, setDiscount_amount] = useState(order.discount_amount ?? 0);
  const [discount_reason, setDiscount_reason] = useState(order.discount_reason ?? "");
  const [internal_notes, setInternal_notes] = useState(order.internal_notes ?? "");
  const [status, setStatus] = useState(order.status);
  const [pickup_complete, setPickup_complete] = useState(order.pickup_complete);

  const [items, setItems] = useState<EditableItem[]>(
    order.order_items.map((item) => ({
      id: item.id,
      product_id: item.product_id,
      quantity: item.quantity,
      price: Number(item.price),
      productName: item.products?.name ?? "Unknown",
      removed: false,
    }))
  );

  const visibleItems = items.filter((i) => !i.removed);
  const subtotal = visibleItems.reduce(
    (sum, i) => sum + Number(i.price) * i.quantity,
    0
  );
  const total = Math.max(0, subtotal - discount_amount);

  function updateItem(id: string, field: "quantity" | "price", value: number) {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, [field]: value } : i))
    );
  }

  function removeItem(id: string) {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, removed: true } : i))
    );
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);

    const toSave = items.filter((i) => !i.removed);
    const toRemove = items.filter((i) => i.removed);

    for (const item of toRemove) {
      const result = await deleteOrderItem(item.id);
      if (!result.success) {
        setError(result.error ?? "Failed to remove item");
        setSaving(false);
        return;
      }
    }

    for (const item of toSave) {
      const orig = order.order_items.find((o) => o.id === item.id);
      if (!orig) continue;
      if (
        Number(orig.quantity) !== item.quantity ||
        Number(orig.price) !== item.price
      ) {
        const result = await updateOrderItem(item.id, {
          quantity: item.quantity,
          price: Number(item.price),
        });
        if (!result.success) {
          setError(result.error ?? "Failed to update item");
          setSaving(false);
          return;
        }
      }
    }

    const result = await updateOrder(order.id, brandId, {
      customer_name,
      customer_email: customer_email || null,
      customer_phone: customer_phone || null,
      discount_amount,
      discount_reason: discount_reason || null,
      internal_notes: internal_notes || null,
      status,
      pickup_complete,
      pickup_completed_at: pickup_complete ? new Date().toISOString() : null,
      subtotal,
    });

    if (!result.success) {
      setError(result.error ?? "Failed to save");
      setSaving(false);
      return;
    }

    setSaved(true);
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {saved && (
        <div className="rounded-xl bg-green-50 border border-green-200 p-4 text-sm text-green-700">
          ✓ Order updated successfully
        </div>
      )}

      {/* Order items */}
      <div>
        <p className="mb-3 text-sm font-semibold text-stone-700">
          Order Items ({visibleItems.length})
        </p>
        {visibleItems.length === 0 ? (
          <p className="rounded-xl border border-dashed border-stone-300 p-4 text-center text-sm text-stone-400">
            No items
          </p>
        ) : (
          <div className="space-y-3">
            {visibleItems.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-stone-200 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium text-stone-900">{item.productName}</p>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                  >
                    Remove
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <AdminInput label="Qty">
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(item.id, "quantity", Number(e.target.value))
                      }
                      className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                    />
                  </AdminInput>
                  <AdminInput label="Price">
                    <AdminTextInput
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.price}
                      onChange={(e) =>
                        updateItem(item.id, "price", Number(e.target.value))
                      }
                    />
                  </AdminInput>
                </div>

                <p className="mt-2 text-right text-sm font-semibold text-stone-900">
                  {formatCurrency(Number(item.price) * item.quantity)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pricing */}
      <div className="space-y-4">
        <AdminInput label="Subtotal (auto-calculated)">
          <input
            type="number"
            step="0.01"
            value={subtotal}
            readOnly
            className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm text-stone-500"
          />
        </AdminInput>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <AdminInput label="Discount Amount">
            <AdminTextInput
              type="number"
              step="0.01"
              min="0"
              value={discount_amount}
              onChange={(e) => setDiscount_amount(Number(e.target.value))}
            />
          </AdminInput>
          <AdminInput label="Discount Reason">
            <AdminTextInput
              value={discount_reason}
              onChange={(e) => setDiscount_reason(e.target.value)}
              placeholder="Optional"
            />
          </AdminInput>
        </div>

        <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
          <div className="flex justify-between">
            <span className="text-sm font-medium text-stone-600">Total</span>
            <span className="text-xl font-bold text-stone-900">
              {formatCurrency(subtotal + Number(order.tax_amount ?? 0) - discount_amount)}
            </span>
          </div>
        </div>
      </div>

      {/* Customer fields */}
      <div className="space-y-4">
        <AdminInput label="Name">
          <AdminTextInput
            value={customer_name}
            onChange={(e) => setCustomer_name(e.target.value)}
          />
        </AdminInput>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <AdminInput label="Email">
            <AdminTextInput
              type="email"
              value={customer_email}
              onChange={(e) => setCustomer_email(e.target.value)}
            />
          </AdminInput>
          <AdminInput label="Phone">
            <AdminTextInput
              type="tel"
              value={customer_phone}
              onChange={(e) => setCustomer_phone(e.target.value)}
            />
          </AdminInput>
        </div>
      </div>

      {/* Status & pickup */}
      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-xs font-semibold text-stone-500">Status</label>
          <div className="flex gap-2">
            {["pending", "confirmed", "cancelled"].map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold capitalize transition-colors ${
                  status === s
                    ? "bg-emerald-600 text-white"
                    : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-50"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold text-stone-500">Pickup</label>
          <button
            onClick={() => setPickup_complete((v) => !v)}
            className={`w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
              pickup_complete
                ? "bg-green-100 text-green-700 border border-green-200"
                : "bg-amber-100 text-amber-700 border border-amber-200"
            }`}
          >
            {pickup_complete ? "✓ Picked Up" : "○ Not Picked Up"}
          </button>
        </div>
      </div>

      {/* Internal notes */}
      <AdminInput label="Internal Notes">
        <AdminTextarea
          value={internal_notes}
          onChange={(e) => setInternal_notes(e.target.value)}
          rows={2}
          placeholder="Private notes for staff..."
        />
      </AdminInput>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save Changes"}
      </button>
    </div>
  );
}