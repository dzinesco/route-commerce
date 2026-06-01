"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { createHarvestLot } from "@/actions/route-trace/lots";

type Props = {
  brandId: string;
  onCreated: (lotId: string) => void;
  onClose: () => void;
};

const K = {
  fields: "rt_recent_fields",
  crops: "rt_recent_crops",
  lots: "rt_recent_lots",
  defaults: "rt_last_lot_defaults",
};

function get<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) ?? "null") ?? fallback; } catch { return fallback; }
}

function save(key: string, val: unknown) {
  localStorage.setItem(key, JSON.stringify(val));
}

function pushUnique<T>(arr: T[], val: T, max = 5): T[] {
  const filtered = arr.filter((x) => x !== val);
  return [val, ...filtered].slice(0, max);
}

type LastDefaults = {
  worker_name?: string;
  variety?: string;
  quantity_lbs?: string;
};

function getLastDefaults(): LastDefaults {
  return get<LastDefaults>(K.defaults, {});
}

const TODAY = new Date().toISOString().split("T")[0];

export default function QuickNewLotDrawer({ brandId, onCreated, onClose }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [recentFields] = useState<string[]>(() => get(K.fields, []));
  const [recentCrops] = useState<string[]>(() => get(K.crops, []));

  const lastDefaults = getLastDefaults();
  const [crop_type, setCropType] = useState("");
  const [harvest_date, setHarvestDate] = useState(TODAY);
  const [field_location, setFieldLocation] = useState("");
  const [worker_name, setWorkerName] = useState(lastDefaults.worker_name ?? "");
  const [quantity_lbs, setQuantityLbs] = useState(lastDefaults.quantity_lbs ?? "");
  const [yield_estimate_lbs, setYieldEstimateLbs] = useState("");
  const [yield_unit, setYieldUnit] = useState("lbs");
  const [customYieldUnit, setCustomYieldUnit] = useState("");
  const [bin_id, setBinId] = useState("");
  const [container_id, setContainerId] = useState("");
  const [field_block, setFieldBlock] = useState("");
  const [variety, setVariety] = useState(lastDefaults.variety ?? "");

  const cropRef = useRef<HTMLInputElement>(null);
  const fieldRef = useRef<HTMLInputElement>(null);
  const workerRef = useRef<HTMLInputElement>(null);
  const qtyRef = useRef<HTMLInputElement>(null);
  const yieldRef = useRef<HTMLInputElement>(null);
  const yieldUnitRef = useRef<HTMLSelectElement>(null);
  const customUnitRef = useRef<HTMLInputElement>(null);
  const binRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLInputElement>(null);
  const blockRef = useRef<HTMLInputElement>(null);
  const varietyRef = useRef<HTMLInputElement>(null);

  useEffect(() => { cropRef.current?.focus(); }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!crop_type.trim()) return;
    setError(null);

    if (field_location.trim()) save(K.fields, pushUnique(get<string[]>(K.fields, []), field_location.trim()));
    save(K.crops, pushUnique(get<string[]>(K.crops, []), crop_type.trim()));
    save(K.defaults, {
      worker_name: worker_name.trim() || undefined,
      variety: variety.trim() || undefined,
      quantity_lbs: quantity_lbs || undefined,
    } as LastDefaults);

    startTransition(async () => {
      const result = await createHarvestLot(brandId, {
        crop_type: crop_type.trim(),
        harvest_date: harvest_date || TODAY,
        field_location: field_location.trim() || undefined,
        worker_name: worker_name.trim() || undefined,
        variety: variety.trim() || undefined,
        quantity_lbs: quantity_lbs ? Number(quantity_lbs) : undefined,
        yield_estimate_lbs: yield_estimate_lbs ? Number(yield_estimate_lbs) : undefined,
        yield_unit: yield_unit === "custom" ? customYieldUnit.trim() || undefined : yield_unit,
        bin_id: bin_id.trim() || undefined,
        container_id: container_id.trim() || undefined,
        field_block: field_block.trim() || undefined,
      });
      if (result.success && result.lot) {
        const cached: Array<{ id: string; lot_number: string; crop_type: string; harvest_date: string; status: string }> = get(K.lots, []);
        save(K.lots, [{ id: result.lot.id, lot_number: result.lot.lot_number, crop_type: crop_type.trim(), harvest_date: harvest_date, status: "active" }, ...cached].slice(0, 20));
        onCreated(result.lot.id);
      } else {
        setError(result.error ?? "Failed to create lot");
      }
    });
  }

  // Enter on field → jump to worker; Enter on worker → jump to qty; etc.
  function handleFieldKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") { e.preventDefault(); workerRef.current?.focus(); }
  }
  function handleWorkerKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") { e.preventDefault(); qtyRef.current?.focus(); }
  }
  function handleYieldKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") { e.preventDefault(); yieldUnitRef.current?.focus(); }
  }
  function handleYieldUnitKeyDown(e: React.KeyboardEvent<HTMLSelectElement>) {
    if (e.key === "Enter") { e.preventDefault(); binRef.current?.focus(); }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative ml-auto w-full max-w-md bg-white shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 px-6 py-5">
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-green-600 shadow-sm">
              <span className="text-base">🌱</span>
            </div>
            <div>
              <h2 className="text-lg font-black text-stone-900">New Lot</h2>
              <p className="text-xs text-stone-400">
                {recentCrops.length > 0 ? `${recentCrops[0]} — quick reuse` : "3 fields to save"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors"
          >
            ✕
          </button>
        </div>

        <form
          id="qnl-form"
          onSubmit={submit}
          className="flex-1 overflow-y-auto px-6 py-5 space-y-5"
        >
          {error && (
            <div className="rounded-2xl bg-red-50 border-2 border-red-200 p-4 text-sm text-red-700 font-medium">
              {error}
            </div>
          )}

          {/* Offline badge */}
          <div className="flex items-center gap-2.5 rounded-2xl bg-blue-50 border border-blue-200 px-4 py-3">
            <span className="text-sm">📶</span>
            <p className="text-xs text-blue-600 leading-snug font-medium">
              Works offline — recent crops &amp; fields saved on device
            </p>
          </div>

          {/* ── Primary: Crop ── */}
          <div>
            <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-2">
              Crop Type <span className="text-red-500">*</span>
            </label>
            <input
              ref={cropRef}
              list="recent-crops"
              type="text"
              value={crop_type}
              onChange={(e) => setCropType(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); fieldRef.current?.focus(); }
              }}
              placeholder="e.g. Sweet Corn"
              required
              className="w-full rounded-2xl border-2 border-stone-200 bg-stone-50 px-5 py-5 text-2xl font-black text-stone-900 placeholder:text-stone-300 outline-none focus:border-green-600 focus:bg-white transition-colors"
            />
            <datalist id="recent-crops">
              {recentCrops.map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>

          {/* ── Primary: Harvest Date ── */}
          <div>
            <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-2">
              Harvest Date
            </label>
            <input
              type="date"
              value={harvest_date}
              onChange={(e) => setHarvestDate(e.target.value)}
              className="w-full rounded-2xl border-2 border-stone-200 bg-stone-50 px-5 py-5 text-xl font-bold text-stone-800 outline-none focus:border-green-600 focus:bg-white transition-colors"
            />
          </div>

          {/* ── Primary: Field ── */}
          <div>
            <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-2">
              Field / Location
            </label>
            <input
              ref={fieldRef}
              list="recent-fields"
              type="text"
              value={field_location}
              onChange={(e) => setFieldLocation(e.target.value)}
              onKeyDown={handleFieldKeyDown}
              placeholder="e.g. North Field"
              className="w-full rounded-2xl border-2 border-stone-200 bg-stone-50 px-5 py-5 text-xl font-bold text-stone-800 outline-none focus:border-green-600 focus:bg-white transition-colors"
            />
            <datalist id="recent-fields">
              {recentFields.map((f) => <option key={f} value={f} />)}
            </datalist>
          </div>

          {/* ── Advanced toggle — big touch target ── */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-between rounded-2xl border-2 border-dashed border-stone-300 px-5 py-4 text-sm font-bold text-stone-500 hover:border-green-400 hover:text-green-700 hover:bg-green-50 transition-all"
          >
            <span className="flex items-center gap-2">
              <span className="text-base">{showAdvanced ? "▲" : "▼"}</span>
              {showAdvanced ? "Hide optional fields" : "+ Yield, Worker, Bin, Block…"}
            </span>
            {showAdvanced && (
              <span className="text-xs text-stone-400 font-medium">collapse</span>
            )}
          </button>

          {showAdvanced && (
            <div className="space-y-4 rounded-2xl border-2 border-stone-100 bg-stone-50 p-5">
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-2">
                  Worker / Harvest Lead
                </label>
                <input
                  ref={workerRef}
                  type="text"
                  placeholder="Maria S."
                  value={worker_name}
                  onChange={(e) => setWorkerName(e.target.value)}
                  onKeyDown={handleWorkerKeyDown}
                  className="w-full rounded-xl border-2 border-stone-200 bg-white px-4 py-4 text-base font-semibold text-stone-800 outline-none focus:border-green-600 focus:bg-white transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-2">
                  Variety
                </label>
                <input
                  ref={varietyRef}
                  type="text"
                  placeholder="Golden Bantam"
                  value={variety}
                  onChange={(e) => setVariety(e.target.value)}
                  className="w-full rounded-xl border-2 border-stone-200 bg-white px-4 py-4 text-base font-semibold text-stone-800 outline-none focus:border-green-600 focus:bg-white transition-colors"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-2">
                    Qty
                  </label>
                  <input
                    ref={qtyRef}
                    type="number"
                    placeholder="4800"
                    min="0"
                    value={quantity_lbs}
                    onChange={(e) => setQuantityLbs(e.target.value)}
                    className="w-full rounded-xl border-2 border-stone-200 bg-white px-4 py-4 text-base font-bold text-stone-800 outline-none focus:border-green-600 focus:bg-white transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-2">
                    Yield Est.
                  </label>
                  <div className="flex rounded-xl border-2 border-stone-200 bg-white overflow-hidden focus-within:border-green-600 transition-colors">
                    <input
                      ref={yieldRef}
                      type="number"
                      placeholder="5000"
                      min="0"
                      value={yield_estimate_lbs}
                      onChange={(e) => setYieldEstimateLbs(e.target.value)}
                      onKeyDown={handleYieldKeyDown}
                      className="flex-1 px-3 py-4 text-base font-bold text-stone-800 outline-none bg-transparent"
                    />
                    <select
                      ref={yieldUnitRef}
                      value={yield_unit}
                      onChange={(e) => setYieldUnit(e.target.value)}
                      onKeyDown={handleYieldUnitKeyDown}
                      className="px-2 py-4 text-sm font-bold text-stone-600 bg-stone-50 outline-none border-l-2 border-stone-200 cursor-pointer"
                    >
                      <option value="lbs">lbs</option>
                      <option value="bushel">bu</option>
                      <option value="box">bx</option>
                      <option value="sack">sk</option>
                      <option value="crate">cr</option>
                      <option value="bin">bn</option>
                      <option value="pallet">plt</option>
                      <option value="custom">custom</option>
                    </select>
                  </div>
                  {yield_unit === "custom" && (
                    <input
                      ref={customUnitRef}
                      type="text"
                      placeholder="Unit name…"
                      value={customYieldUnit}
                      onChange={(e) => setCustomYieldUnit(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border-2 border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-stone-700 outline-none focus:border-green-600 transition-colors"
                    />
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-2">
                    Bin ID
                  </label>
                  <input
                    ref={binRef}
                    type="text"
                    placeholder="BIN-001"
                    value={bin_id}
                    onChange={(e) => setBinId(e.target.value)}
                    className="w-full rounded-xl border-2 border-stone-200 bg-white px-4 py-4 text-base font-bold text-stone-800 outline-none focus:border-green-600 focus:bg-white transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-2">
                    Container ID
                  </label>
                  <input
                    ref={containerRef}
                    type="text"
                    placeholder="CONT-001"
                    value={container_id}
                    onChange={(e) => setContainerId(e.target.value)}
                    className="w-full rounded-xl border-2 border-stone-200 bg-white px-4 py-4 text-base font-bold text-stone-800 outline-none focus:border-green-600 focus:bg-white transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-2">
                  Field Block
                </label>
                <input
                  ref={blockRef}
                  type="text"
                  placeholder="e.g. A-3"
                  value={field_block}
                  onChange={(e) => setFieldBlock(e.target.value)}
                  className="w-full rounded-xl border-2 border-stone-200 bg-white px-4 py-4 text-base font-bold text-stone-800 outline-none focus:border-green-600 focus:bg-white transition-colors"
                />
              </div>
            </div>
          )}
        </form>

        {/* Big save button — always visible */}
        <div className="border-t border-stone-100 px-6 py-5 bg-white">
          <button
            type="submit"
            form="qnl-form"
            disabled={isPending || !crop_type.trim()}
            className="w-full rounded-2xl bg-green-600 py-5 text-lg font-black text-white hover:bg-green-700 active:bg-green-800 transition-colors disabled:opacity-40 flex items-center justify-center gap-3 shadow-sm"
          >
            {isPending ? (
              <>
                <span className="text-base">⏳</span>
                Saving…
              </>
            ) : (
              <>
                <span className="text-xl">🌱</span>
                Create Lot
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}