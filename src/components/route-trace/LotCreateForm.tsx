"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createHarvestLot } from "@/actions/route-trace/lots";

export default function LotCreateForm({ brandId }: { brandId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notesOpen, setNotesOpen] = useState(false);

  const [crop_type, setCropType] = useState("");
  const [variety, setVariety] = useState("");
  const [harvest_date, setHarvestDate] = useState(new Date().toISOString().split("T")[0]);
  const [field_location, setFieldLocation] = useState("");
  const [field_block, setFieldBlock] = useState("");
  const [worker_name, setWorkerName] = useState("");
  const [packer_name, setPackerName] = useState("");
  const [quantity_lbs, setQuantityLbs] = useState("");
  const [yield_estimate_lbs, setYieldEstimateLbs] = useState("");
  const [yield_unit, setYieldUnit] = useState("lbs");
  const [customYieldUnit, setCustomYieldUnit] = useState("");
  const [bin_id, setBinId] = useState("");
  const [container_id, setContainerId] = useState("");
  const [pallets, setPallets] = useState("");
  const [notes, setNotes] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createHarvestLot(brandId, {
        crop_type,
        variety: variety || undefined,
        harvest_date,
        field_location: field_location || undefined,
        worker_name: worker_name || undefined,
        packer_name: packer_name || undefined,
        quantity_lbs: quantity_lbs ? Number(quantity_lbs) : undefined,
        notes: notes || undefined,
        bin_id: bin_id || undefined,
        container_id: container_id || undefined,
        field_block: field_block || undefined,
        yield_estimate_lbs: yield_estimate_lbs ? Number(yield_estimate_lbs) : undefined,
        yield_unit: yield_unit === "custom" ? customYieldUnit.trim() || undefined : yield_unit,
        pallets: pallets ? Number(pallets) : undefined,
      });
      if (result.success && result.lot) {
        router.push(`/admin/route-trace/lots/${result.lot.id}`);
      } else {
        setError(result.error ?? "Failed to create lot");
      }
    });
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-white shadow-sm">
      <div className="border-b border-stone-100 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-100">
            <span className="text-base">🌱</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-stone-900">New Harvest Lot</h2>
            <p className="text-sm text-stone-500">Quick entry — scan or fill in the fields below</p>
          </div>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">{error}</div>
        )}

        {/* Required — large touch targets for field use */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-stone-800 mb-2">Crop Type *</label>
            <input
              type="text"
              value={crop_type}
              onChange={(e) => setCropType(e.target.value)}
              placeholder="e.g. Sweet Corn"
              required
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-4 text-lg font-medium outline-none focus:border-emerald-600 focus:bg-white transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-stone-800 mb-2">Variety</label>
            <input
              type="text"
              value={variety}
              onChange={(e) => setVariety(e.target.value)}
              placeholder="e.g. Golden Bantam"
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-4 text-lg font-medium outline-none focus:border-emerald-600 focus:bg-white transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-stone-800 mb-2">Harvest Date *</label>
          <input
            type="date"
            value={harvest_date}
            onChange={(e) => setHarvestDate(e.target.value)}
            required
            className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-4 text-lg font-medium outline-none focus:border-emerald-600 focus:bg-white transition-colors"
          />
        </div>

        {/* Field & Location */}
        <div className="border-t border-stone-100 pt-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-3">Field &amp; Location</p>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1.5">Field / Location *</label>
              <input
                type="text"
                value={field_location}
                onChange={(e) => setFieldLocation(e.target.value)}
                placeholder="e.g. North Field"
                required
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3.5 text-base outline-none focus:border-emerald-600 focus:bg-white transition-colors"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1.5">Field Block</label>
                <input
                  type="text"
                  value={field_block}
                  onChange={(e) => setFieldBlock(e.target.value)}
                  placeholder="e.g. Block A"
                  className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-3 text-sm outline-none focus:border-emerald-600 focus:bg-white transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1.5">Worker / Harvest Lead</label>
                <input
                  type="text"
                  value={worker_name}
                  onChange={(e) => setWorkerName(e.target.value)}
                  placeholder="e.g. Maria S."
                  className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-3 text-sm outline-none focus:border-emerald-600 focus:bg-white transition-colors"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Quantity + Yield */}
        <div className="border-t border-stone-100 pt-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-3">Weight &amp; Yield</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1.5">Actual Qty</label>
              <input
                type="number"
                value={quantity_lbs}
                onChange={(e) => setQuantityLbs(e.target.value)}
                placeholder="e.g. 4800"
                min="0"
                step="0.01"
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-3.5 text-base outline-none focus:border-emerald-600 focus:bg-white transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1.5">Yield Est.</label>
              <div className="flex rounded-xl border border-stone-200 bg-stone-50 overflow-hidden focus-within:border-emerald-600 focus-within:bg-white transition-colors">
                <input
                  type="number"
                  value={yield_estimate_lbs}
                  onChange={(e) => setYieldEstimateLbs(e.target.value)}
                  placeholder="e.g. 5000"
                  min="0"
                  step="0.01"
                  className="flex-1 px-3 py-3.5 text-base outline-none bg-transparent"
                />
                <select
                  value={yield_unit}
                  onChange={(e) => setYieldUnit(e.target.value)}
                  className="px-2 py-3.5 text-sm font-semibold text-stone-600 bg-stone-100 outline-none border-l border-stone-200 cursor-pointer"
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
                  type="text"
                  placeholder="Unit name…"
                  value={customYieldUnit}
                  onChange={(e) => setCustomYieldUnit(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:bg-white transition-colors"
                />
              )}
            </div>
          </div>
        </div>

        {/* Bin + Container */}
        <div className="border-t border-stone-100 pt-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-3">Bin, Container &amp; Pallets</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1.5">Bin ID</label>
              <input
                type="text"
                value={bin_id}
                onChange={(e) => setBinId(e.target.value)}
                placeholder="e.g. BIN-001"
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-3 text-sm outline-none focus:border-emerald-600 focus:bg-white transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1.5">Container ID</label>
              <input
                type="text"
                value={container_id}
                onChange={(e) => setContainerId(e.target.value)}
                placeholder="e.g. CONT-A42"
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-3 text-sm outline-none focus:border-emerald-600 focus:bg-white transition-colors"
              />
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1.5">Pallets</label>
              <input
                type="number"
                value={pallets}
                onChange={(e) => setPallets(e.target.value)}
                placeholder="e.g. 4"
                min="0"
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-3 text-sm outline-none focus:border-emerald-600 focus:bg-white transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1.5">Packer Name</label>
              <input
                type="text"
                value={packer_name}
                onChange={(e) => setPackerName(e.target.value)}
                placeholder="e.g. Jose R."
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-3 text-sm outline-none focus:border-emerald-600 focus:bg-white transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Notes — collapsible */}
        <div className="border-t border-stone-100 pt-5">
          <button
            type="button"
            onClick={() => setNotesOpen(!notesOpen)}
            className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-stone-400 hover:text-stone-600"
          >
            <span>Notes</span>
            <span>{notesOpen ? "▲" : "▼"}</span>
          </button>
          {notesOpen && (
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Spray records, weather conditions, or other harvest details..."
              rows={3}
              className="mt-3 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-3 text-sm outline-none focus:border-emerald-600 focus:bg-white transition-colors resize-none"
            />
          )}
        </div>

        {/* Save — big button */}
        <div className="flex items-center justify-end border-t border-stone-100 pt-5">
          <button
            type="submit"
            disabled={isPending || !crop_type || !harvest_date || !field_location}
            className="rounded-xl bg-green-600 px-8 py-4 text-base font-bold text-white hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm"
          >
            {isPending ? "Creating..." : "🌱 Create Lot"}
          </button>
        </div>
      </form>
    </div>
  );
}