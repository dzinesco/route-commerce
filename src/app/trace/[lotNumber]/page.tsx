import { notFound } from "next/navigation";
import { getTraceChain } from "@/actions/route-trace/lots";
import ShareTraceButton from "@/components/route-trace/ShareTraceButton";
import { svcHeaders } from "@/lib/svc-headers";

const EVENT_ICONS: Record<string, string> = {
  harvested: "🌱",
  field_packed: "📦",
  bin_tagged: "🏷️",
  in_transit: "🚚",
  at_shed: "🏭",
  packed: "📋",
  delivered: "✅",
  marked_used: "📋",
};

const STATUS_LABELS: Record<string, string> = {
  harvested: "Harvested",
  field_packed: "Field Packed",
  bin_tagged: "Bin Tagged",
  in_transit: "In Transit",
  at_shed: "At Shed",
  packed: "Packed",
  delivered: "Delivered",
  marked_used: "Used in Order",
  active: "Harvested",
};

const STEP_COLORS: Record<string, string> = {
  harvested: "bg-green-500",
  field_packed: "bg-green-500",
  bin_tagged: "bg-amber-500",
  in_transit: "bg-amber-500",
  at_shed: "bg-blue-500",
  packed: "bg-purple-500",
  delivered: "bg-stone-500",
};

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? "w-5 h-5"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function FieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? "w-5 h-5"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  );
}

export default async function TracePage({ params }: { params: Promise<{ lotNumber: string }> }) {
  const { lotNumber } = await params;

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const SUPABASE_PAT = process.env.SUPABASE_PAT!;

  let lotId: string | null = null;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/harvest_lots?lot_number=eq.${encodeURIComponent(lotNumber)}&select=id`,
      {
        headers: {
          ...svcHeaders(SUPABASE_PAT),
          "Content-Type": "application/json",
        },
        next: { revalidate: 60 },
      }
    );
    const data = await res.json();
    lotId = data?.[0]?.id ?? null;
  } catch (_) {}

  if (!lotId) notFound();

  const result = await getTraceChain(lotId);
  if (!result.success) notFound();

  const { lot, events, orders } = result.chain;

  const statusOrder = ["active", "in_transit", "at_shed", "packed", "delivered"];
  const currentStepIndex = statusOrder.indexOf(lot.status);
  const progressPercent = currentStepIndex >= 0 ? ((currentStepIndex + 1) / 5) * 100 : 0;

  const totalQuantity = Number(lot.quantity_lbs ?? 0);
  const usedQuantity = Number(lot.quantity_used_lbs ?? 0);
  const remainingQuantity = Math.max(0, totalQuantity - usedQuantity);

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="mx-auto max-w-lg px-4 py-6">

        {/* ── Brand header bar ── */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-green-600 flex items-center justify-center shadow-sm">
              <span className="text-white text-[10px] font-black">RT</span>
            </div>
            <div>
              <p className="text-xs font-black text-stone-900">Route Trace</p>
              <p className="text-[10px] text-stone-400">Fresh produce traceability</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-green-50 border border-green-200 px-2.5 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] font-black text-green-700">Verified</span>
          </div>
        </div>

        {/* ── Hero lot number ── */}
        <div className="rounded-2xl bg-white border border-stone-200 shadow-sm mb-4 overflow-hidden">
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-6 text-center">
            <p className="text-[10px] font-bold text-green-100 uppercase tracking-widest mb-1.5">Lot Number</p>
            <p className="text-3xl font-black text-white tracking-tight leading-none">{lot.lot_number}</p>
          </div>
          <div className="px-6 py-4">
            <div className="flex items-baseline gap-2.5 mb-1">
              <p className="text-4xl font-black text-stone-950 leading-tight">{lot.crop_type}</p>
              {lot.variety && <p className="text-lg text-stone-400 font-semibold">{lot.variety}</p>}
            </div>
            <div className="flex items-center gap-2 text-xs text-stone-500">
              <span>📍 {lot.field_location ?? "Unknown field"}</span>
              <span className="text-stone-300">·</span>
              <span>📅 {lot.harvest_date}</span>
            </div>
          </div>
        </div>

        {/* ── Quantity / remaining ── */}
        <div className="rounded-2xl bg-white border border-stone-200 shadow-sm mb-4 overflow-hidden">
          <div className="grid grid-cols-3 divide-x divide-stone-100">
            <div className="px-4 py-4 text-center">
              <p className="text-2xl font-black text-stone-900">{totalQuantity > 0 ? totalQuantity.toLocaleString() : "—"}</p>
              <p className="text-[9px] font-bold text-stone-400 uppercase tracking-wider mt-0.5">Total lbs</p>
            </div>
            <div className="px-4 py-4 text-center">
              <p className="text-2xl font-black text-amber-600">{usedQuantity > 0 ? usedQuantity.toLocaleString() : "—"}</p>
              <p className="text-[9px] font-bold text-stone-400 uppercase tracking-wider mt-0.5">Used</p>
            </div>
            <div className="px-4 py-4 text-center">
              <p className="text-2xl font-black text-green-700">{remainingQuantity.toLocaleString()}</p>
              <p className="text-[9px] font-bold text-stone-400 uppercase tracking-wider mt-0.5">Remaining</p>
            </div>
          </div>
          {totalQuantity > 0 && (
            <div className="px-4 pb-4 -mt-0.5">
              <div className="h-1.5 rounded-full bg-stone-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500"
                  style={{ width: `${Math.min(100, (usedQuantity / totalQuantity) * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* ── Detail grid ── */}
        {(lot.bin_id || lot.container_id || lot.field_block || lot.worker_name || lot.packer_name || lot.pallets != null) && (
          <div className="rounded-2xl bg-white border border-stone-200 shadow-sm mb-4 overflow-hidden">
            <div className="px-5 py-3 border-b border-stone-100 bg-stone-50">
              <p className="text-xs font-bold text-stone-600 flex items-center gap-1.5">
                <FieldIcon className="w-3.5 h-3.5 text-stone-400" />
                Lot Details
              </p>
            </div>
            <div className="px-5 py-4">
              <div className="grid grid-cols-2 gap-2">
                {lot.field_block && (
                  <div className="rounded-xl bg-stone-50 border border-stone-100 px-3 py-2.5">
                    <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest">Field Block</p>
                    <p className="text-sm font-black text-stone-800 mt-0.5">{lot.field_block}</p>
                  </div>
                )}
                {lot.worker_name && (
                  <div className="rounded-xl bg-stone-50 border border-stone-100 px-3 py-2.5">
                    <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest">Worker</p>
                    <p className="text-sm font-semibold text-stone-700 mt-0.5">{lot.worker_name}</p>
                  </div>
                )}
                {lot.packer_name && (
                  <div className="rounded-xl bg-stone-50 border border-stone-100 px-3 py-2.5">
                    <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest">Packer</p>
                    <p className="text-sm font-semibold text-stone-700 mt-0.5">{lot.packer_name}</p>
                  </div>
                )}
                {lot.pallets != null && (
                  <div className="rounded-xl bg-stone-50 border border-stone-100 px-3 py-2.5">
                    <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest">Pallets</p>
                    <p className="text-sm font-bold text-stone-700 mt-0.5">{lot.pallets}</p>
                  </div>
                )}
                {lot.yield_estimate_lbs != null && (
                  <div className="rounded-xl bg-green-50 border border-green-200 px-3 py-2.5">
                    <p className="text-[9px] font-bold text-green-500 uppercase tracking-widest">Yield Est.</p>
                    <p className="text-sm font-black text-green-800 mt-0.5">
                      {Number(lot.yield_estimate_lbs).toLocaleString()} {lot.yield_unit ?? "lbs"}
                    </p>
                  </div>
                )}
                {lot.bin_id && (
                  <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5">
                    <p className="text-[9px] font-bold text-amber-500 uppercase tracking-widest">Bin ID</p>
                    <p className="text-sm font-black text-amber-800 mt-0.5">{lot.bin_id}</p>
                  </div>
                )}
                {lot.container_id && (
                  <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5">
                    <p className="text-[9px] font-bold text-amber-500 uppercase tracking-widest">Container ID</p>
                    <p className="text-sm font-black text-amber-800 mt-0.5">{lot.container_id}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Progress ── */}
        <div className="rounded-2xl bg-white border border-stone-200 shadow-sm mb-4 overflow-hidden">
          <div className="px-5 py-3 border-b border-stone-100 flex items-center justify-between">
            <p className="text-xs font-bold text-stone-700">Supply Chain Progress</p>
            <span className="text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
              {STATUS_LABELS[lot.status] ?? lot.status}
            </span>
          </div>
          <div className="px-5 py-4">
            <div className="flex items-center gap-2">
              {["🌱", "🚚", "🏭", "📦", "✅"].map((icon, i) => {
                const done = i < currentStepIndex;
                const active = i === currentStepIndex;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className={`h-9 w-9 rounded-full flex items-center justify-center text-base transition-all ${
                      done ? "bg-green-500 text-white shadow-sm" :
                      active ? `${STEP_COLORS[statusOrder[i]] ?? "bg-stone-400"} text-white shadow-sm ring-3 ring-white ring-offset-1` :
                      "bg-stone-100 text-stone-300"
                    }`}>
                      {done ? <CheckIcon className="w-3.5 h-3.5 text-white" /> : icon}
                    </div>
                    <div className={`h-0.5 w-full rounded-full ${done ? "bg-green-400" : active ? (STEP_COLORS[statusOrder[i]] ?? "bg-stone-300") : "bg-stone-100"}`} />
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between mt-2">
              {["Harvest", "Transit", "Shed", "Packed", "Delivered"].map((label, i) => (
                <span key={label} className={`text-[9px] font-bold ${i === currentStepIndex ? "text-stone-800" : "text-stone-300"}`}>{label}</span>
              ))}
            </div>
          </div>
        </div>

        {/* ── Timeline ── */}
        {events.length > 0 && (
          <div className="rounded-2xl bg-white border border-stone-200 shadow-sm mb-4 overflow-hidden">
            <div className="px-5 py-3 border-b border-stone-100 bg-stone-50 flex items-center gap-1.5">
              <span className="text-xs">📍</span>
              <h2 className="text-xs font-bold text-stone-700">Trace Timeline</h2>
            </div>
            <div className="p-5">
              <div className="relative space-y-0">
                {events.map((event: { id: string; event_type: string; event_time: string; location?: string | null; notes?: string | null; bin_id?: string | null }, idx: number) => {
                  const icon = EVENT_ICONS[event.event_type] ?? "📋";
                  const label = STATUS_LABELS[event.event_type] ?? event.event_type;
                  const colorClass = STEP_COLORS[event.event_type] ?? "bg-stone-400";
                  const isLast = idx === events.length - 1;
                  return (
                    <div key={event.id} className="flex gap-3.5">
                      <div className="flex flex-col items-center">
                        <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-base ring-3 ring-white shadow-sm ${colorClass} text-white`}>
                          {icon}
                        </div>
                        {!isLast && <div className="w-px flex-1 bg-stone-100 my-1" />}
                      </div>
                      <div className="pb-4 pt-0.5 flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-bold text-stone-800">{label}</span>
                        </div>
                        <p className="text-[10px] text-stone-400 mt-0.5">
                          {new Date(event.event_time).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          {" · "}
                          {new Date(event.event_time).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                        </p>
                        {event.location && (
                          <p className="mt-0.5 text-xs text-stone-500">📍 {event.location}</p>
                        )}
                        {event.bin_id && (
                          <p className="mt-0.5 text-xs font-bold text-amber-600">🏷 {event.bin_id}</p>
                        )}
                        {event.notes && (
                          <p className="mt-0.5 text-xs text-stone-400 italic">{event.notes}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── Orders ── */}
        {orders && orders.length > 0 && (
          <div className="rounded-2xl bg-white border border-stone-200 shadow-sm mb-4 overflow-hidden">
            <div className="px-5 py-3 border-b border-stone-100 bg-stone-50 flex items-center gap-1.5">
              <span className="text-xs">📦</span>
              <h2 className="text-xs font-bold text-stone-700">Fulfilled Orders</h2>
            </div>
            <div className="p-5 space-y-2">
              {orders.map((order: { id: string; customer_name: string; order_date: string; stop_name: string }) => (
                <div key={order.id} className="flex items-center justify-between rounded-xl border border-stone-100 bg-stone-50 px-4 py-3">
                  <div>
                    <p className="text-sm font-bold text-stone-800">{order.customer_name}</p>
                    <p className="text-[10px] text-stone-400 mt-0.5">{order.stop_name} · {order.order_date}</p>
                  </div>
                  <div className="h-7 w-7 rounded-full bg-green-500 flex items-center justify-center">
                    <CheckIcon className="w-3.5 h-3.5 text-white" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Share ── */}
        <div className="flex items-center justify-center mb-4">
          <ShareTraceButton lotNumber={lot.lot_number} />
        </div>

        {/* ── Verified badge ── */}
        <div className="rounded-2xl bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 shadow-sm px-5 py-4 mb-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 rounded-full bg-green-600 items-center justify-center shadow-sm flex-shrink-0">
              <CheckIcon className="text-white w-5 h-5" />
            </div>
            <div>
              <p className="text-base font-black text-green-800">Verified Fresh</p>
              <p className="text-xs text-green-600 mt-0.5 leading-snug">
                Full traceability from field to delivery
              </p>
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="text-center pb-4">
          <p className="text-[10px] text-stone-400">
            Traced with{" "}
            <a href="https://cielohermosa.com" className="font-semibold text-stone-500 hover:text-stone-700">
              Route Commerce
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}