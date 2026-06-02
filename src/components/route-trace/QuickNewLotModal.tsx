"use client";

import { useState, useTransition, useEffect } from "react";
import { createHarvestLot } from "@/actions/route-trace/lots";
import GlassModal from "@/components/admin/GlassModal";

// Plant icon for the modal title - consistent one-color outline style
const PlantIcon = ({ className }: { className?: string }) => (
  <svg 
    className={className ?? "w-5 h-5"} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    style={{ color: "var(--admin-accent)" }}
  >
    <path d="M7 20h10"/>
    <path d="M10 20c5.5-2.5.8-6.4 3-10"/>
    <path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"/>
    <path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"/>
  </svg>
);

type Props = {
  brandId: string;
  onCreated: (lotId: string) => void;
  onClose: () => void;
};

const TODAY = new Date().toISOString().split("T")[0];

export default function QuickNewLotModal({ brandId, onCreated, onClose }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [crop_type, setCropType] = useState("");
  const [harvest_date, setHarvestDate] = useState(TODAY);
  const [field_location, setFieldLocation] = useState("");
  const [worker_name, setWorkerName] = useState("");
  const [quantity_lbs, setQuantityLbs] = useState("");
  const [variety, setVariety] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!crop_type.trim()) return;
    setError(null);

    startTransition(async () => {
      const result = await createHarvestLot(brandId, {
        crop_type: crop_type.trim(),
        harvest_date: harvest_date || TODAY,
        field_location: field_location.trim() || undefined,
        worker_name: worker_name.trim() || undefined,
        variety: variety.trim() || undefined,
        quantity_lbs: quantity_lbs ? Number(quantity_lbs) : undefined,
      });
      if (result.success && result.lot) {
        onCreated(result.lot.id);
      } else {
        setError(result.error ?? "Failed to create lot");
      }
    });
  }

  return (
    <GlassModal 
      title="New Harvest Lot" 
      titleIcon={<PlantIcon className="w-5 h-5" />}
      subtitle="Quick entry — scan or fill in the fields below" 
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-4">
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">
            Crop Type <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={crop_type}
            onChange={(e) => setCropType(e.target.value)}
            placeholder="e.g. Sweet Corn"
            required
            autoFocus
            className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-base text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-400 focus:bg-white transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">
            Harvest Date
          </label>
          <input
            type="date"
            value={harvest_date}
            onChange={(e) => setHarvestDate(e.target.value)}
            className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-base text-stone-900 focus:outline-none focus:border-stone-400 focus:bg-white transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">
            Field / Location
          </label>
          <input
            type="text"
            value={field_location}
            onChange={(e) => setFieldLocation(e.target.value)}
            placeholder="e.g. North Field"
            className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-base text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-400 focus:bg-white transition-colors"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Worker
            </label>
            <input
              type="text"
              value={worker_name}
              onChange={(e) => setWorkerName(e.target.value)}
              placeholder="Name"
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-base text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-400 focus:bg-white transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Variety
            </label>
            <input
              type="text"
              value={variety}
              onChange={(e) => setVariety(e.target.value)}
              placeholder="Type"
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-base text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-400 focus:bg-white transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">
            Quantity (lbs)
          </label>
          <input
            type="number"
            value={quantity_lbs}
            onChange={(e) => setQuantityLbs(e.target.value)}
            placeholder="0"
            min="0"
            className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-base text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-400 focus:bg-white transition-colors"
          />
        </div>

        <button
          type="submit"
          disabled={isPending || !crop_type.trim()}
          className="w-full rounded-xl bg-stone-800 py-3.5 text-base font-semibold text-white hover:bg-stone-700 disabled:opacity-50 transition-colors mt-2"
        >
          {isPending ? "Creating..." : "Create Lot"}
        </button>
      </form>
    </GlassModal>
  );
}