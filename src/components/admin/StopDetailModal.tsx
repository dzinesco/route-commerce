"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import GlassModal from "@/components/admin/GlassModal";
import StopEditForm from "@/components/admin/StopEditForm";
import StopProductAssignment from "@/components/admin/StopProductAssignment";
import MessageCustomersSection from "@/components/admin/MessageCustomersSection";
import { getStopDetails } from "@/actions/stops/get-stop-details";
import { useToast } from "@/components/admin/design-system";
import type { StopDetail, AssignedProduct } from "@/actions/stops/get-stop-details";

type Tab = "details" | "products" | "message";

type Props = {
  stopId: string;
  /** Optional: when the user clicks Duplicate from inside the modal. */
  onDuplicate?: (stopId: string) => void;
  onClose: () => void;
};

export default function StopDetailModal({ stopId, onDuplicate, onClose }: Props) {
  const router = useRouter();
  const { success: showSuccess } = useToast();
  const [, startTransition] = useTransition();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [stop, setStop] = useState<StopDetail | null>(null);
  const [allProducts, setAllProducts] = useState<{ id: string; name: string; type: string; price: number }[]>([]);
  const [assignedProducts, setAssignedProducts] = useState<AssignedProduct[]>([]);
  const [brands, setBrands] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [tab, setTab] = useState<Tab>("details");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    getStopDetails(stopId)
      .then((res) => {
        if (cancelled) return;
        if (!res.success) {
          setLoadError(res.error);
          setLoading(false);
          return;
        }
        setStop(res.stop);
        setAllProducts(res.allProducts);
        setAssignedProducts(res.assignedProducts);
        setBrands(res.brands);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(err?.message ?? "Failed to load stop");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [stopId]);

  function refresh() {
    getStopDetails(stopId).then((res) => {
      if (!res.success) return;
      setStop(res.stop);
      setAllProducts(res.allProducts);
      setAssignedProducts(res.assignedProducts);
      setBrands(res.brands);
    });
  }

  function handleEditSaved() {
    refresh();
    showSuccess("Stop updated", "Changes have been saved");
    startTransition(() => router.refresh());
  }

  const subtitle = stop?.brands
    ? (Array.isArray(stop.brands) ? stop.brands[0]?.name : stop.brands.name) ?? undefined
    : undefined;

  return (
    <GlassModal
      title={loading ? "Loading…" : stop ? `${stop.city}, ${stop.state}` : "Stop"}
      subtitle={subtitle ?? "Stop details"}
      onClose={onClose}
      maxWidth="max-w-3xl"
    >
      {loading ? (
        <div className="space-y-3">
          <div className="h-4 w-1/3 animate-pulse rounded bg-stone-200" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-stone-200" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-stone-200" />
        </div>
      ) : loadError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {loadError}
        </div>
      ) : stop ? (
        <div className="space-y-5">
          {/* Tabs */}
          <div
            className="flex items-center gap-1 rounded-xl border border-[var(--admin-border)] bg-stone-50 p-1"
            role="tablist"
          >
            <TabButton active={tab === "details"} onClick={() => setTab("details")}>
              Details
            </TabButton>
            <TabButton active={tab === "products"} onClick={() => setTab("products")}>
              <span className="inline-flex items-center gap-1.5">
                Products
                {assignedProducts.length > 0 && (
                  <span className="rounded-full bg-[var(--admin-accent)]/10 px-2 py-0.5 text-[10px] font-semibold text-[var(--admin-accent)]">
                    {assignedProducts.length}
                  </span>
                )}
              </span>
            </TabButton>
            <TabButton active={tab === "message"} onClick={() => setTab("message")}>
              Message
            </TabButton>
          </div>

          {tab === "details" && (
            <DetailsPanel
              stop={stop}
              brands={brands}
              onDuplicate={onDuplicate}
              onSaved={handleEditSaved}
            />
          )}

          {tab === "products" && (
            <div className="rounded-xl border border-[var(--admin-border)] bg-white p-5">
              <h3 className="text-sm font-semibold text-[var(--admin-text-primary)]">
                Assigned Products
              </h3>
              <p className="mt-1 text-xs text-[var(--admin-text-muted)]">
                Manage which products are available at this stop.
              </p>
              <div className="mt-4">
                <StopProductAssignment
                  stopId={stop.id}
                  allProducts={allProducts}
                  assignedProducts={assignedProducts}
                  callerUid={stop.id}
                />
              </div>
            </div>
          )}

          {tab === "message" && (
            <div className="rounded-xl border border-[var(--admin-border)] bg-white p-5">
              <h3 className="text-sm font-semibold text-[var(--admin-text-primary)]">
                Message Customers
              </h3>
              <p className="mt-1 text-xs text-[var(--admin-text-muted)]">
                Send updates to customers with pending pickups at this stop.
              </p>
              <div className="mt-4">
                <MessageCustomersSection stopId={stop.id} brandId={stop.brand_id} />
              </div>
            </div>
          )}
        </div>
      ) : null}
    </GlassModal>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
        active
          ? "bg-white text-[var(--admin-accent)] shadow-sm border border-[var(--admin-border)]"
          : "text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)]"
      }`}
    >
      {children}
    </button>
  );
}

function DetailsPanel({
  stop,
  brands,
  onDuplicate,
  onSaved,
}: {
  stop: StopDetail;
  brands: { id: string; name: string; slug: string }[];
  onDuplicate?: (stopId: string) => void;
  onSaved: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-[var(--admin-border)] bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-[var(--admin-text-primary)]">
              {stop.city}, {stop.state}
            </h3>
            <p className="mt-1 text-sm text-[var(--admin-text-secondary)]">{stop.location}</p>
          </div>
          <span
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
              stop.active
                ? "bg-emerald-100 text-emerald-700"
                : "bg-stone-200 text-stone-500"
            }`}
          >
            {stop.active ? "Active" : "Inactive"}
          </span>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-xs font-medium text-[var(--admin-text-muted)]">Date</dt>
            <dd className="mt-0.5 font-mono text-[var(--admin-text-primary)]">{stop.date}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-[var(--admin-text-muted)]">Time</dt>
            <dd className="mt-0.5 font-mono text-[var(--admin-text-primary)]">{stop.time}</dd>
          </div>
          {stop.address && (
            <div className="col-span-2">
              <dt className="text-xs font-medium text-[var(--admin-text-muted)]">Address</dt>
              <dd className="mt-0.5 text-[var(--admin-text-primary)]">
                {stop.address}
                {stop.zip ? `, ${stop.zip}` : ""}
              </dd>
            </div>
          )}
          {stop.cutoff_time && (
            <div className="col-span-2">
              <dt className="text-xs font-medium text-[var(--admin-text-muted)]">Cutoff</dt>
              <dd className="mt-0.5 text-[var(--admin-text-primary)]">
                {new Date(stop.cutoff_time).toLocaleString()}
              </dd>
            </div>
          )}
        </dl>
      </div>

      <div className="flex justify-end">
        {onDuplicate ? (
          <button
            type="button"
            onClick={() => onDuplicate(stop.id)}
            className="rounded-xl border border-[var(--admin-border)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--admin-text-secondary)] hover:bg-stone-50"
          >
            Duplicate Stop
          </button>
        ) : (
          <a
            href={`/admin/stops/new?duplicate=${stop.id}`}
            className="rounded-xl border border-[var(--admin-border)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--admin-text-secondary)] hover:bg-stone-50"
          >
            Duplicate Stop
          </a>
        )}
      </div>

      <div className="rounded-xl border border-[var(--admin-border)] bg-white p-5">
        <h3 className="text-sm font-semibold text-[var(--admin-text-primary)]">Edit Stop</h3>
        <p className="mt-1 text-xs text-[var(--admin-text-muted)]">
          Update stop details, location, and availability.
        </p>
        <div className="mt-4">
          <StopEditForm
            stop={{
              id: stop.id,
              city: stop.city,
              state: stop.state,
              date: stop.date,
              time: stop.time,
              location: stop.location,
              slug: stop.slug,
              active: stop.active,
              brand_id: stop.brand_id,
              address: stop.address,
              zip: stop.zip,
              cutoff_time: stop.cutoff_time,
            }}
            brands={brands}
            onSaved={onSaved}
          />
        </div>
      </div>
    </div>
  );
}
