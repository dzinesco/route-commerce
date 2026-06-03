"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useCallback, useEffect } from "react";
import { getAbandonedCarts, manuallyCloseAbandonedCart, resendAbandonedCartEmail, type AbandonedCart } from "@/actions/email-automation/abandoned-cart";

type Props = { brandId: string };

const STATUS_LABELS: Record<string, { en: string; color: string }> = {
  active: { en: "Active", color: "bg-blue-50 text-blue-700 border border-blue-200" },
  recovered: { en: "Recovered", color: "bg-green-50 text-green-700 border border-green-200" },
  expired: { en: "Expired", color: "bg-stone-100 text-stone-500 border border-stone-200" },
  manually_closed: { en: "Manually Closed", color: "bg-amber-50 text-amber-700 border border-amber-200" },
};

const STEP_LABELS: Record<number, string> = {
  0: "Detected",
  1: "Email 1 (1h)",
  2: "Email 2 (24h)",
  3: "Email 3 (48h)",
};

function CartItemRow({ item }: { item: { name: string; quantity: number; unit_price: number } }) {
  return (
    <tr className="border-t border-[var(--admin-border)]">
      <td className="px-4 py-2 text-sm text-[var(--admin-text-primary)]">{item.name}</td>
      <td className="px-4 py-2 text-sm text-[var(--admin-text-muted)] text-right">{item.quantity}</td>
      <td className="px-4 py-2 text-sm text-[var(--admin-text-muted)] text-right">${Number(item.unit_price).toFixed(2)}</td>
    </tr>
  );
}

export default function AbandonedCartDashboard({ brandId }: Props) {
  const [carts, setCarts] = useState<AbandonedCart[]>([]);
  const [stats, setStats] = useState({ total: 0, recovered: 0, active: 0, expired: 0 });
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "active" | "recovered">("all");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 25;
  const [selectedCart, setSelectedCart] = useState<AbandonedCart | null>(null);
  const [closing, setClosing] = useState(false);
  const [resending, setResending] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getAbandonedCarts(brandId);
    if (result.success) {
      setCarts(result.carts);
      setStats(result.stats);
    }
    setLoading(false);
  }, [brandId]);

  const handleClose = async (cartId: string) => {
    setClosing(true);
    await manuallyCloseAbandonedCart(cartId, brandId);
    await load();
    setClosing(false);
  };

  useEffect(() => { setPage(0); }, [filter]);

  const filteredCarts = carts.filter(c => {
    if (filter === "active") return c.status === "active";
    if (filter === "recovered") return c.status === "recovered";
    return true;
  });

  const paginatedCarts = filteredCarts.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filteredCarts.length / PAGE_SIZE);

  const handleResend = async (cartId: string) => {
    setResending(cartId);
    await resendAbandonedCartEmail(cartId, brandId);
    await load();
    setResending(null);
  };

  const cart = selectedCart;

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total", value: stats.total, color: "text-[var(--admin-text-primary)]" },
          { label: "Active", value: stats.active, color: "text-blue-600" },
          { label: "Recovered", value: stats.recovered, color: "text-green-600" },
          { label: "Expired", value: stats.expired, color: "text-[var(--admin-text-muted)]" },
        ].map(s => (
          <div key={s.label} className="bg-white border border-[var(--admin-border)] rounded-2xl p-4 text-center">
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs text-[var(--admin-text-muted)] uppercase tracking-widest mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter + refresh + pagination */}
      <div className="flex items-center gap-3">
        <button onClick={load} disabled={loading}
          className="text-xs font-semibold text-[var(--admin-accent)] hover:text-[var(--admin-accent)]/80 transition-colors">
          {loading ? "Loading..." : "↻ Refresh"}
        </button>
        <div className="flex gap-2 ml-auto">
          {(["all", "active", "recovered"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filter === f ? "bg-[var(--admin-accent)] text-white" : "bg-stone-100 text-[var(--admin-text-secondary)] hover:bg-stone-200"}`}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        {totalPages > 1 && (
          <div className="flex items-center gap-1 ml-2">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              className="flex h-7 w-7 items-center justify-center rounded border border-[var(--admin-border)] text-[var(--admin-text-muted)] hover:text-[var(--admin-text-primary)] hover:bg-stone-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <span className="text-xs text-[var(--admin-text-muted)] px-1">{page + 1}/{totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
              className="flex h-7 w-7 items-center justify-center rounded border border-[var(--admin-border)] text-[var(--admin-text-muted)] hover:text-[var(--admin-text-primary)] hover:bg-stone-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        )}
      </div>

      {/* Carts table */}
      {filteredCarts.length === 0 ? (
        <div className="bg-white border border-[var(--admin-border)] rounded-2xl py-16 text-center">
          <p className="text-[var(--admin-text-muted)] text-sm">No abandoned carts{filter !== "all" ? ` (${filter})` : ""}</p>
        </div>
      ) : (
        <div className="bg-white border border-[var(--admin-border)] rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-[var(--admin-text-muted)] uppercase tracking-widest border-b border-[var(--admin-border)]">
                <th className="text-left px-5 py-3 font-medium">Contact</th>
                <th className="text-left px-5 py-3 font-medium">Items</th>
                <th className="text-left px-5 py-3 font-medium">Total</th>
                <th className="text-left px-5 py-3 font-medium">Step</th>
                <th className="text-left px-5 py-3 font-medium">Status</th>
                <th className="text-left px-5 py-3 font-medium">Detected</th>
                <th className="text-right px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedCarts.map(c => {
                const meta = STATUS_LABELS[c.status] ?? STATUS_LABELS.active;
                return (
                  <tr key={c.id} className="border-t border-[var(--admin-border)] hover:bg-stone-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div>
                        <p className="text-[var(--admin-text-primary)] font-medium text-sm">{c.contact_name ?? "—"}</p>
                        <p className="text-[var(--admin-text-muted)] text-xs">{c.contact_email}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-[var(--admin-text-muted)] text-xs">{c.cart_snapshot.item_count} items</td>
                    <td className="px-5 py-3.5 text-[var(--admin-text-primary)] font-semibold text-sm">${Number(c.cart_snapshot.subtotal).toFixed(2)}</td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs text-[var(--admin-text-muted)]">{STEP_LABELS[c.sequence_step] ?? c.sequence_step}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${meta.color}`}>
                        {meta.en}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-[var(--admin-text-muted)] text-xs">{new Date(c.created_at).toLocaleDateString()}</td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => setSelectedCart(c)}
                          className="text-xs text-[var(--admin-text-muted)] hover:text-[var(--admin-text-primary)] px-2 py-1 rounded-lg hover:bg-stone-100 transition-all">View</button>
                        {c.status === "active" && (
                          <button onClick={() => handleClose(c.id)} disabled={closing}
                            className="text-xs text-amber-600 hover:text-amber-700 px-2 py-1 rounded-lg hover:bg-amber-50 transition-all">Close</button>
                        )}
                        {c.status === "active" && (
                          <button onClick={() => handleResend(c.id)} disabled={resending === c.id}
                            className="text-xs text-[var(--admin-accent)] hover:text-[var(--admin-accent)]/80 px-2 py-1 rounded-lg hover:bg-stone-100 transition-all">
                            {resending === c.id ? "..." : "Resend"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Cart detail modal */}
      {cart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setSelectedCart(null)}>
          <div className="bg-white border border-[var(--admin-border)] rounded-2xl w-full max-w-lg shadow-xl"
            onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-[var(--admin-border)] flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-[var(--admin-text-primary)]">Abandoned Cart</h3>
                <p className="text-xs text-[var(--admin-text-muted)]">{cart.contact_email}</p>
              </div>
              <button onClick={() => setSelectedCart(null)} className="text-[var(--admin-text-muted)] hover:text-[var(--admin-text-primary)] text-xl leading-none">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3 bg-stone-50 rounded-xl p-3">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_LABELS[cart.status]?.color ?? ""}`}>
                  {STATUS_LABELS[cart.status]?.en ?? cart.status}
                </span>
                <div className="flex-1">
                  <p className="text-sm text-[var(--admin-text-primary)] font-medium">{cart.contact_name ?? "—"}</p>
                  <p className="text-xs text-[var(--admin-text-muted)]">{cart.contact_email}</p>
                  <p className="text-xs text-[var(--admin-text-muted)] mt-1">Step: {STEP_LABELS[cart.sequence_step] ?? cart.sequence_step}</p>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-[var(--admin-text-muted)] mb-2">Cart Items</p>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-[var(--admin-text-muted)] border-b border-[var(--admin-border)]">
                      <th className="text-left pb-2 font-medium">Item</th>
                      <th className="text-right pb-2 font-medium">Qty</th>
                      <th className="text-right pb-2 font-medium">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cart.cart_snapshot.items.map((item, i) => (
                      <CartItemRow key={i} item={item} />
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-[var(--admin-border)]">
                      <td className="pt-2 text-[var(--admin-text-primary)] font-semibold" colSpan={2}>Total</td>
                      <td className="pt-2 text-[var(--admin-text-primary)] font-bold text-right">${Number(cart.cart_snapshot.subtotal).toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {cart.last_email_sent_at && (
                <p className="text-xs text-[var(--admin-text-muted)]">Last email sent: {new Date(cart.last_email_sent_at).toLocaleString()}</p>
              )}
              {cart.next_email_at && (
                <p className="text-xs text-[var(--admin-text-muted)]">Next email: {new Date(cart.next_email_at).toLocaleString()}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}