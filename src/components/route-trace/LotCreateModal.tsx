"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createHarvestLot } from "@/actions/route-trace/lots";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  brandId: string;
};

export default function LotCreateModal({ isOpen, onClose, brandId }: Props) {
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

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setCropType("");
      setVariety("");
      setHarvestDate(new Date().toISOString().split("T")[0]);
      setFieldLocation("");
      setFieldBlock("");
      setWorkerName("");
      setPackerName("");
      setQuantityLbs("");
      setYieldEstimateLbs("");
      setYieldUnit("lbs");
      setCustomYieldUnit("");
      setBinId("");
      setContainerId("");
      setPallets("");
      setNotes("");
      setError(null);
      setNotesOpen(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

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
        onClose();
        router.push(`/admin/route-trace/lots/${result.lot.id}`);
      } else {
        setError(result.error ?? "Failed to create lot");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div 
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border shadow-2xl"
        style={{ 
          backgroundColor: "white",
          borderColor: "var(--admin-border)"
        }}
      >
        <div className="sticky top-0 border-b px-6 py-5 flex items-center justify-between" style={{ backgroundColor: "white", borderColor: "var(--admin-border)" }}>
          <div className="flex items-center gap-3">
            <div 
              className="flex h-9 w-9 items-center justify-center rounded-xl"
              style={{ backgroundColor: "var(--admin-accent-light)" }}
            >
              <svg className="h-5 w-5" style={{ color: "var(--admin-accent)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path d="M12 22V12M12 12C12 12 7 10 7 5c0-2.5 2.5-5 5-5s5 2.5 5 5c0 5-5 7-5 7z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: "var(--admin-text-primary)" }}>New Harvest Lot</h2>
              <p className="text-sm" style={{ color: "var(--admin-text-muted)" }}>Quick entry — scan or fill in the fields below</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl border transition-colors hover:bg-stone-50"
            style={{ borderColor: "var(--admin-border)" }}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div 
              className="rounded-xl p-4 text-sm border"
              style={{ 
                backgroundColor: "rgba(239, 68, 68, 0.1)", 
                borderColor: "rgba(239, 68, 68, 0.3)", 
                color: "rgb(239, 68, 68)" 
              }}
            >
              {error}
            </div>
          )}

          {/* Required fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: "var(--admin-text-primary)" }}>Crop Type *</label>
              <input
                type="text"
                value={crop_type}
                onChange={(e) => setCropType(e.target.value)}
                placeholder="e.g. Sweet Corn"
                required
                className="w-full rounded-xl border px-4 py-4 text-lg font-medium outline-none transition-colors"
                style={{ 
                  borderColor: "var(--admin-border)",
                  backgroundColor: "var(--admin-bg-subtle)",
                  color: "var(--admin-text-primary)"
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: "var(--admin-text-primary)" }}>Variety</label>
              <input
                type="text"
                value={variety}
                onChange={(e) => setVariety(e.target.value)}
                placeholder="e.g. Golden Bantam"
                className="w-full rounded-xl border px-4 py-4 text-lg font-medium outline-none transition-colors"
                style={{ 
                  borderColor: "var(--admin-border)",
                  backgroundColor: "var(--admin-bg-subtle)",
                  color: "var(--admin-text-primary)"
                }}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: "var(--admin-text-primary)" }}>Harvest Date *</label>
            <input
              type="date"
              value={harvest_date}
              onChange={(e) => setHarvestDate(e.target.value)}
              required
              className="w-full rounded-xl border px-4 py-4 text-lg font-medium outline-none transition-colors"
              style={{ 
                borderColor: "var(--admin-border)",
                backgroundColor: "var(--admin-bg-subtle)",
                color: "var(--admin-text-primary)"
              }}
            />
          </div>

          {/* Field & Location */}
          <div className="border-t pt-5" style={{ borderColor: "var(--admin-border)" }}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--admin-text-muted)" }}>Field & Location</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--admin-text-primary)" }}>Field / Location *</label>
                <input
                  type="text"
                  value={field_location}
                  onChange={(e) => setFieldLocation(e.target.value)}
                  placeholder="e.g. North Field"
                  required
                  className="w-full rounded-xl border px-4 py-3.5 text-base outline-none transition-colors"
                  style={{ 
                    borderColor: "var(--admin-border)",
                    backgroundColor: "var(--admin-bg-subtle)",
                    color: "var(--admin-text-primary)"
                  }}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--admin-text-primary)" }}>Field Block</label>
                  <input
                    type="text"
                    value={field_block}
                    onChange={(e) => setFieldBlock(e.target.value)}
                    placeholder="e.g. Block A"
                    className="w-full rounded-xl border px-3 py-3 text-sm outline-none transition-colors"
                    style={{ 
                      borderColor: "var(--admin-border)",
                      backgroundColor: "var(--admin-bg-subtle)",
                      color: "var(--admin-text-primary)"
                    }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--admin-text-primary)" }}>Worker / Harvest Lead</label>
                  <input
                    type="text"
                    value={worker_name}
                    onChange={(e) => setWorkerName(e.target.value)}
                    placeholder="e.g. Maria S."
                    className="w-full rounded-xl border px-3 py-3 text-sm outline-none transition-colors"
                    style={{ 
                      borderColor: "var(--admin-border)",
                      backgroundColor: "var(--admin-bg-subtle)",
                      color: "var(--admin-text-primary)"
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Quantity + Yield */}
          <div className="border-t pt-5" style={{ borderColor: "var(--admin-border)" }}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--admin-text-muted)" }}>Weight & Yield</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--admin-text-primary)" }}>Actual Qty</label>
                <input
                  type="number"
                  value={quantity_lbs}
                  onChange={(e) => setQuantityLbs(e.target.value)}
                  placeholder="e.g. 4800"
                  min="0"
                  step="0.01"
                  className="w-full rounded-xl border px-3 py-3.5 text-base outline-none transition-colors"
                  style={{ 
                    borderColor: "var(--admin-border)",
                    backgroundColor: "var(--admin-bg-subtle)",
                    color: "var(--admin-text-primary)"
                  }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--admin-text-primary)" }}>Yield Est.</label>
                <div className="flex rounded-xl border overflow-hidden transition-colors" style={{ borderColor: "var(--admin-border)", backgroundColor: "var(--admin-bg-subtle)" }}>
                  <input
                    type="number"
                    value={yield_estimate_lbs}
                    onChange={(e) => setYieldEstimateLbs(e.target.value)}
                    placeholder="e.g. 5000"
                    min="0"
                    step="0.01"
                    className="flex-1 px-3 py-3.5 text-base outline-none bg-transparent"
                    style={{ color: "var(--admin-text-primary)" }}
                  />
                  <select
                    value={yield_unit}
                    onChange={(e) => setYieldUnit(e.target.value)}
                    className="px-2 py-3.5 text-sm font-semibold outline-none border-l cursor-pointer"
                    style={{ 
                      borderColor: "var(--admin-border)",
                      backgroundColor: "var(--admin-bg)",
                      color: "var(--admin-text-muted)"
                    }}
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
                    className="mt-1.5 w-full rounded-xl border px-3 py-2 text-sm outline-none transition-colors"
                    style={{ 
                      borderColor: "var(--admin-border)",
                      backgroundColor: "var(--admin-bg-subtle)",
                      color: "var(--admin-text-primary)"
                    }}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Bin + Container */}
          <div className="border-t pt-5" style={{ borderColor: "var(--admin-border)" }}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--admin-text-muted)" }}>Bin, Container & Pallets</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--admin-text-primary)" }}>Bin ID</label>
                <input
                  type="text"
                  value={bin_id}
                  onChange={(e) => setBinId(e.target.value)}
                  placeholder="e.g. BIN-001"
                  className="w-full rounded-xl border px-3 py-3 text-sm outline-none transition-colors"
                  style={{ 
                    borderColor: "var(--admin-border)",
                    backgroundColor: "var(--admin-bg-subtle)",
                    color: "var(--admin-text-primary)"
                  }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--admin-text-primary)" }}>Container ID</label>
                <input
                  type="text"
                  value={container_id}
                  onChange={(e) => setContainerId(e.target.value)}
                  placeholder="e.g. CONT-A42"
                  className="w-full rounded-xl border px-3 py-3 text-sm outline-none transition-colors"
                  style={{ 
                    borderColor: "var(--admin-border)",
                    backgroundColor: "var(--admin-bg-subtle)",
                    color: "var(--admin-text-primary)"
                  }}
                />
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--admin-text-primary)" }}>Pallets</label>
                <input
                  type="number"
                  value={pallets}
                  onChange={(e) => setPallets(e.target.value)}
                  placeholder="e.g. 4"
                  min="0"
                  className="w-full rounded-xl border px-3 py-3 text-sm outline-none transition-colors"
                  style={{ 
                    borderColor: "var(--admin-border)",
                    backgroundColor: "var(--admin-bg-subtle)",
                    color: "var(--admin-text-primary)"
                  }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--admin-text-primary)" }}>Packer Name</label>
                <input
                  type="text"
                  value={packer_name}
                  onChange={(e) => setPackerName(e.target.value)}
                  placeholder="e.g. Jose R."
                  className="w-full rounded-xl border px-3 py-3 text-sm outline-none transition-colors"
                  style={{ 
                    borderColor: "var(--admin-border)",
                    backgroundColor: "var(--admin-bg-subtle)",
                    color: "var(--admin-text-primary)"
                  }}
                />
              </div>
            </div>
          </div>

          {/* Notes — collapsible */}
          <div className="border-t pt-5" style={{ borderColor: "var(--admin-border)" }}>
            <button
              type="button"
              onClick={() => setNotesOpen(!notesOpen)}
              className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider transition-colors"
              style={{ color: "var(--admin-text-muted)" }}
            >
              <span>Notes</span>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d={notesOpen ? "m18 15-6-6-6 6" : "m6 9 6 6 6-6"} />
              </svg>
            </button>
            {notesOpen && (
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Spray records, weather conditions, or other harvest details..."
                rows={3}
                className="mt-3 w-full rounded-xl border px-3 py-3 text-sm outline-none transition-colors resize-none"
                style={{ 
                  borderColor: "var(--admin-border)",
                  backgroundColor: "var(--admin-bg-subtle)",
                  color: "var(--admin-text-primary)"
                }}
              />
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 border-t pt-5" style={{ borderColor: "var(--admin-border)" }}>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border px-6 py-3 text-sm font-semibold transition-colors"
              style={{ 
                borderColor: "var(--admin-border)",
                color: "var(--admin-text-muted)"
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || !crop_type || !harvest_date || !field_location}
              className="rounded-xl px-8 py-3 text-base font-bold text-white transition-colors disabled:opacity-50 flex items-center gap-2"
              style={{ backgroundColor: "var(--admin-accent)" }}
            >
              {isPending ? "Creating..." : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22V12M12 12C12 12 7 10 7 5c0-2.5 2.5-5 5-5s5 2.5 5 5c0 5-5 7-5 7z" />
                  </svg>
                  Create Lot
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}