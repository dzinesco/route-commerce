"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import { logAuditEvent } from "@/actions/audit";

type Product = {
  id: string;
  name: string;
  type: string;
  price: number;
  image_url?: string | null;
};

type AssignedProduct = {
  id: string;
  product_id: string;
  products: { name: string; type: string; price: number; image_url?: string | null } | null;
};

type StopProductAssignmentProps = {
  stopId: string;
  allProducts: Product[];
  assignedProducts: AssignedProduct[];
  callerUid: string | null;
};

type Filter = "all" | "available" | "assigned";

/* Helpers — monospace price + initial-letter avatar */
const formatPrice = (n: number) =>
  `$${Number(n ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const initialOf = (name: string) => (name?.trim()?.charAt(0) ?? "·").toUpperCase();

const TYPE_LABEL: Record<string, string> = {
  pickup: "Pickup",
  wholesale: "Wholesale",
  subscription: "Sub",
};

export default function StopProductAssignment({
  stopId,
  allProducts,
  assignedProducts,
  callerUid,
}: StopProductAssignmentProps) {
  const [products, setProducts] = useState(assignedProducts);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const assignedIds = useMemo(
    () => new Set(products.map((p) => p.product_id)),
    [products]
  );

  // Counters for the filter chips
  const counts = useMemo(() => {
    const assignedCount = products.length;
    const availableCount = allProducts.filter((p) => !assignedIds.has(p.id)).length;
    return {
      all: allProducts.length,
      available: availableCount,
      assigned: assignedCount,
    };
  }, [allProducts, products, assignedIds]);

  // Apply search + filter
  const visibleProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allProducts.filter((p) => {
      const isAssigned = assignedIds.has(p.id);
      if (filter === "available" && isAssigned) return false;
      if (filter === "assigned" && !isAssigned) return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q) || p.type.toLowerCase().includes(q);
    });
  }, [allProducts, search, filter, assignedIds]);

  async function assign(productId: string) {
    if (!productId || assignedIds.has(productId) || pendingId) return;

    const product = allProducts.find((p) => p.id === productId);
    if (!product) return;

    setPendingId(productId);
    setError(null);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/assign_product_to_stop`,
        {
          method: "POST",
          headers: {
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            p_stop_id: stopId,
            p_product_id: productId,
            p_caller_uid: callerUid,
          }),
        }
      );
      const data = await res.json();

      if (!res.ok || data.success === false) {
        const errMsg = data?.error ?? data?.message ?? `HTTP ${res.status}`;
        const errDetail = data?.details ?? data?.hint ?? data?.code ?? "";
        setError(`Failed to assign: ${errMsg}${errDetail ? " — " + errDetail : ""}`);
        setPendingId(null);
        return;
      }

      // Optimistic insert: build the entry from the product we already have
      // locally, keyed by the row id returned from the RPC. Use functional
      // setState so concurrent calls compose correctly.
      setProducts((prev) => {
        if (prev.some((p) => p.product_id === productId)) return prev;
        return [
          ...prev,
          {
            id: data.id,
            product_id: productId,
            products: {
              name: product.name,
              type: product.type,
              price: product.price,
              image_url: product.image_url ?? null,
            },
          },
        ];
      });
      setPendingId(null);

      logAuditEvent({
        table_name: "product_stops",
        record_id: data.id,
        action: "INSERT",
        old_data: null,
        new_data: { stop_id: stopId, product_id: productId },
        brand_id: null,
      });
    } catch {
      setError("Network error while assigning product.");
      setPendingId(null);
    }
  }

  async function remove(productId: string) {
    if (removingId) return;
    const entry = products.find((p) => p.product_id === productId);
    if (!entry) return;

    setRemovingId(productId);
    setError(null);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/unassign_product_from_stop`,
        {
          method: "POST",
          headers: {
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            p_stop_id: stopId,
            p_product_id: productId,
            p_caller_uid: callerUid,
          }),
        }
      );
      const data = await res.json();

      if (!res.ok || data.success === false) {
        const errMsg = data?.error ?? data?.message ?? `HTTP ${res.status}`;
        const errDetail = data?.details ?? data?.hint ?? data?.code ?? "";
        setError(`Failed to remove: ${errMsg}${errDetail ? " — " + errDetail : ""}`);
        setRemovingId(null);
        return;
      }

      setProducts((prev) => prev.filter((p) => p.product_id !== productId));
      setRemovingId(null);

      logAuditEvent({
        table_name: "product_stops",
        record_id: entry.id,
        action: "DELETE",
        old_data: { stop_id: stopId, product_id: productId },
        new_data: null,
        brand_id: null,
      });
    } catch {
      setError("Network error while removing product.");
      setRemovingId(null);
    }
  }

  function toggle(productId: string) {
    if (assignedIds.has(productId)) {
      remove(productId);
    } else {
      assign(productId);
    }
  }

  function clearAll() {
    if (!products.length || removingId || pendingId) return;
    // Snapshot ids at click time, then remove each one sequentially so the
    // server sees one request at a time.
    const idsToRemove = products.map((p) => p.product_id);
    (async () => {
      for (const id of idsToRemove) {
        // Stop if a per-item failure already surfaced an error
        if (error) break;
        await remove(id);
      }
    })();
  }

  // Keyboard: pressing / focuses search
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        const el = document.getElementById("stop-product-search") as HTMLInputElement | null;
        el?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const hasAssigned = products.length > 0;
  const hasProducts = allProducts.length > 0;

  return (
    <div className="ha-picker">
      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg px-3 py-2 text-xs text-[var(--admin-danger)]"
          style={{
            background: "rgba(220, 38, 38, 0.06)",
            border: "1px solid rgba(220, 38, 38, 0.15)",
          }}
        >
          <svg className="h-3.5 w-3.5 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
          </svg>
          <span className="font-mono text-[11px]">{error}</span>
        </div>
      )}

      {/* Header: editorial title + search */}
      <div className="ha-picker-header">
        <div className="ha-picker-title">
          <span className="ha-picker-title-num font-display">
            {String(products.length).padStart(2, "0")}
          </span>
          <span className="ha-picker-title-label">
            {products.length === 1 ? "Product on this stop" : "Products on this stop"}
          </span>
        </div>
        <div className="ha-picker-search">
          <span className="ha-picker-search-icon" aria-hidden="true">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" strokeLinecap="round" />
            </svg>
          </span>
          <input
            id="stop-product-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products…"
            className="ha-picker-search-input"
            autoComplete="off"
          />
        </div>
      </div>

      {/* Filter chips */}
      <div className="ha-picker-filterbar">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`ha-picker-chip ${filter === "all" ? "ha-picker-chip--active" : ""}`}
        >
          All
          <span className="ha-picker-chip-count">{counts.all}</span>
        </button>
        <button
          type="button"
          onClick={() => setFilter("available")}
          className={`ha-picker-chip ${filter === "available" ? "ha-picker-chip--active" : ""}`}
        >
          Available
          <span className="ha-picker-chip-count">{counts.available}</span>
        </button>
        <button
          type="button"
          onClick={() => setFilter("assigned")}
          className={`ha-picker-chip ${filter === "assigned" ? "ha-picker-chip--active" : ""}`}
        >
          On this stop
          <span className="ha-picker-chip-count">{counts.assigned}</span>
        </button>
        <span className="ha-modal-footer-hint ml-auto">
          Press <kbd>/</kbd> to search
        </span>
      </div>

      {/* Product grid */}
      {!hasProducts ? (
        <div className="ha-picker-empty">
          <p className="ha-picker-empty-mark">No products yet</p>
          <p className="ha-picker-empty-text">
            Create products in the catalog first, then come back here to assign them to this stop.
          </p>
        </div>
      ) : visibleProducts.length === 0 ? (
        <div className="ha-picker-empty">
          <p className="ha-picker-empty-mark">
            {filter === "assigned" ? "Nothing assigned" : "No matches"}
          </p>
          <p className="ha-picker-empty-text">
            {search.trim()
              ? `No products match "${search.trim()}". Try a different term.`
              : filter === "assigned"
                ? "This stop has no products assigned yet. Click a card in the All tab to add one."
                : "All products are already assigned to this stop."}
          </p>
        </div>
      ) : (
        <div className="ha-picker-grid">
          {visibleProducts.map((product) => {
            const isAssigned = assignedIds.has(product.id);
            const isBusy = pendingId === product.id || removingId === product.id;
            return (
              <button
                key={product.id}
                type="button"
                onClick={() => !isBusy && toggle(product.id)}
                disabled={isBusy}
                aria-pressed={isAssigned}
                className={`ha-product-card ${isAssigned ? "ha-product-card--assigned" : ""} ${
                  isBusy ? "ha-product-card--disabled" : ""
                }`}
              >
                {/* Image / Initial */}
                <span className="ha-product-card-image">
                  {product.image_url ? (
                    <Image
                      src={product.image_url}
                      alt={product.name}
                      fill
                      sizes="48px"
                      style={{ objectFit: "cover" }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    initialOf(product.name)
                  )}
                </span>

                {/* Body */}
                <span className="ha-product-card-body">
                  <span className="ha-product-card-name">{product.name}</span>
                  <span className="ha-product-card-meta">
                    <span className="ha-product-card-type">{TYPE_LABEL[product.type] ?? product.type}</span>
                    <span className="ha-product-card-price">{formatPrice(product.price)}</span>
                  </span>
                </span>

                {/* Status icon */}
                {isBusy ? (
                  <span className="ha-product-card-plus" aria-hidden="true">
                    <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
                      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                  </span>
                ) : isAssigned ? (
                  <>
                    <span className="ha-product-card-check" aria-hidden="true">
                      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                        <path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <span className="ha-product-card-remove" aria-hidden="true">
                      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                        <path d="M6 6l12 12M6 18 18 6" strokeLinecap="round" />
                      </svg>
                    </span>
                  </>
                ) : (
                  <span className="ha-product-card-plus" aria-hidden="true">
                    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                    </svg>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Summary footer when assigned items exist */}
      {hasAssigned && (
        <div className="ha-picker-summary">
          <span className="ha-picker-summary-left">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>
              <span className="ha-picker-summary-count">{products.length}</span>{" "}
              {products.length === 1 ? "product is" : "products are"} live at this stop
            </span>
          </span>
          <button
            type="button"
            onClick={clearAll}
            disabled={!!removingId}
            className="ha-picker-summary-clear"
          >
            Remove all
          </button>
        </div>
      )}
    </div>
  );
}
