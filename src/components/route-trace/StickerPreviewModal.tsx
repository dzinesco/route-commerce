"use client";

import { useState, useEffect } from "react";
import { LotDetail } from "@/actions/route-trace/lots";

type StickerType = "field" | "shed";
type StickerSize = "4x2" | "4x3";

const COPY_OPTIONS = [1, 2, 3, 5, 10];

export default function StickerPreviewModal({ lot, onClose }: { lot: LotDetail; onClose: () => void }) {
  const [stickerType, setStickerType] = useState<StickerType>("field");
  const [stickerSize, setStickerSize] = useState<StickerSize>("4x2");
  const [copies, setCopies] = useState(1);
  const [loading, setLoading] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  const traceUrl = `${baseUrl}/trace/${lot.lot_number}`;

  useEffect(() => {
    import("qrcode").then(({ toDataURL }) => {
      toDataURL(traceUrl, { width: 200, margin: 1, color: { dark: "#000000", light: "#FFFFFF" } })
        .then(setQrDataUrl)
        .catch(() => {});
    });
  }, [traceUrl]);

  async function handlePrint() {
    setLoading(true);
    try {
      const url = `/api/route-trace/sticker-pdf?lotId=${lot.lot_id}&type=${stickerType}&size=${stickerSize}&copies=${copies}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to generate PDF");
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `${lot.lot_number}-${stickerType}-${stickerSize}.pdf`;
      a.target = "_blank";
      a.click();
      URL.revokeObjectURL(blobUrl);
    } catch (e) {
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Actual thermal label dimensions in points: 4x2" = 288×144, 4x3" = 288×216
  const LABEL_W = 288;
  const LABEL_H = stickerSize === "4x3" ? 216 : 144;
  // Scale preview to ~1.8x so it's readable in the modal
  const scale = 1.8;
  const previewW = LABEL_W * scale;
  const previewH = LABEL_H * scale;
  const qrSize = stickerSize === "4x3" ? 130 : 110;
  const qrPreviewSize = qrSize * scale * 0.55; // scaled down for preview

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-stone-100 px-6 py-4">
          <div>
            <h3 className="text-base font-semibold text-stone-900">🖨 Print Sticker</h3>
            <p className="text-xs text-stone-400 mt-0.5">{lot.lot_number} · {lot.crop_type}</p>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 text-xl leading-none">✕</button>
        </div>

        <div className="p-6 space-y-5">
          {/* Type + Size selectors */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="mb-2 text-xs font-semibold text-stone-500 uppercase tracking-wider">Sticker Type</p>
              <div className="space-y-1.5">
                {(["field", "shed"] as StickerType[]).map((t) => {
                  const label = t === "field" ? "🌱 Field" : "🏭 Shed";
                  const desc = t === "field" ? "After harvest" : "At shed arrival";
                  return (
                    <button
                      key={t}
                      onClick={() => setStickerType(t)}
                      className={`w-full rounded-xl border px-3 py-2.5 text-left transition-colors ${
                        stickerType === t
                          ? "border-emerald-600 bg-emerald-600 text-white"
                          : "border-stone-200 hover:bg-stone-50"
                      }`}
                    >
                      <div className="text-sm font-semibold">{label} Sticker</div>
                      <div className={`text-[10px] mt-0.5 ${stickerType === t ? "text-stone-300" : "text-stone-400"}`}>{desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold text-stone-500 uppercase tracking-wider">Label Size</p>
              <div className="space-y-1.5">
                {(["4x2", "4x3"] as StickerSize[]).map((s) => {
                  const w = s === "4x2" ? "2 in" : "3 in";
                  const h = s === "4x2" ? "2 in" : "3 in";
                  return (
                    <button
                      key={s}
                      onClick={() => setStickerSize(s)}
                      className={`w-full rounded-xl border px-3 py-2.5 text-left transition-colors ${
                        stickerSize === s
                          ? "border-emerald-600 bg-emerald-600 text-white"
                          : "border-stone-200 hover:bg-stone-50"
                      }`}
                    >
                      <div className="text-sm font-semibold">{w} × {h}</div>
                      <div className={`text-[10px] mt-0.5 ${stickerSize === s ? "text-stone-300" : "text-stone-400"}`}>
                        {s === "4x2" ? "Field sticker" : "Shed sticker"}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold text-stone-500 uppercase tracking-wider">Copies</p>
              <div className="grid grid-cols-5 gap-1.5">
                {COPY_OPTIONS.map((n) => (
                  <button
                    key={n}
                    onClick={() => setCopies(n)}
                    className={`rounded-lg border py-2 text-center text-sm font-bold transition-colors ${
                      copies === n
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : "border-stone-200 text-stone-600 hover:bg-stone-50"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-[10px] text-stone-400 text-center">labels per sheet</p>
            </div>
          </div>

          {/* Sticker preview — actual proportions, scaled */}
          <div className="flex flex-col items-center gap-2">
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Preview</p>
            <div
              className="relative rounded-lg border-2 border-stone-300 overflow-hidden bg-white"
              style={{ width: previewW, height: previewH }}
            >
              <div className="absolute inset-0 p-3.5 flex flex-col text-black select-none">
                {/* Brand row */}
                <div className="flex items-center justify-between">
                  <span className="text-[6px] font-bold uppercase tracking-widest text-stone-400">Route Trace</span>
                  <span className="text-[5px] text-stone-300">{stickerSize}"</span>
                </div>

                {/* Lot number — dominant */}
                <div className="text-[18px] font-black leading-tight text-stone-950 tracking-tight mt-0.5">
                  {lot.lot_number}
                </div>

                {/* Crop */}
                <div className="text-[9px] font-bold text-stone-700 mt-0.5">{lot.crop_type}</div>

                {/* Data rows */}
                <div className="flex flex-1 mt-1 gap-2">
                  <div className="flex-1 space-y-0.5">
                    {stickerType === "field" ? (
                      <>
                        {lot.harvest_date && <div className="text-[6px] text-stone-600">Harvested: {lot.harvest_date}</div>}
                        {lot.quantity_lbs && (
                          <div className="text-[8px] font-black text-stone-950 mt-1">
                            {Number(lot.quantity_lbs).toLocaleString()} lbs
                          </div>
                        )}
                        {lot.field_location && <div className="text-[6px] text-stone-600">{lot.field_location}</div>}
                        {lot.field_block && <div className="text-[6px] text-stone-500">Block: {lot.field_block}</div>}
                        {lot.worker_name && <div className="text-[6px] text-stone-600">{lot.worker_name}</div>}
                        {lot.yield_estimate_lbs && (
                          <div className="text-[6px] text-stone-600">Est: {Number(lot.yield_estimate_lbs).toLocaleString()} {lot.yield_unit ?? "lbs"}</div>
                        )}
                      </>
                    ) : (
                      <>
                        {lot.quantity_lbs && (
                          <div className="text-[10px] font-black text-stone-950">
                            {Number(lot.quantity_lbs).toLocaleString()} {lot.yield_unit ?? "lbs"}
                          </div>
                        )}
                        {lot.harvest_date && <div className="text-[6px] text-stone-600">Packed: {lot.harvest_date}</div>}
                        {lot.field_location && <div className="text-[6px] text-stone-600">From: {lot.field_location}</div>}
                        {lot.worker_name && <div className="text-[6px] text-stone-600">{lot.worker_name}</div>}
                        {lot.destination_stop_id && (
                          <div className="text-[6px] text-stone-600">Dest: #{lot.destination_stop_id.slice(0, 8)}</div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Right — bin/container */}
                  <div className="w-20 text-right space-y-0.5">
                    {lot.bin_id && (
                      <div className="text-[6px] font-black text-stone-950">BIN {lot.bin_id}</div>
                    )}
                    {lot.container_id && (
                      <div className="text-[6px] font-black text-stone-950">CONT {lot.container_id}</div>
                    )}
                    {lot.pallets && (
                      <div className="text-[5px] text-stone-500">{lot.pallets} PLT</div>
                    )}
                    {lot.field_block && stickerType === "shed" && (
                      <div className="text-[5px] text-stone-400">Block: {lot.field_block}</div>
                    )}
                  </div>
                </div>

                {/* QR — bottom right */}
                <div className="absolute bottom-1.5 right-1.5">
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt="QR"
                      className="rounded border border-stone-300"
                      style={{ width: qrPreviewSize, height: qrPreviewSize }}
                    />
                  ) : (
                    <div
                      className="bg-stone-100 border border-stone-300 rounded flex items-center justify-center"
                      style={{ width: qrPreviewSize, height: qrPreviewSize }}
                    >
                      <span className="text-[5px] text-stone-400">QR</span>
                    </div>
                  )}
                </div>

                {/* /trace url — bottom left */}
                <div className="absolute bottom-1.5 left-1.5 text-[4px] text-stone-300 truncate max-w-[90px]">
                  /trace/{lot.lot_number}
                </div>
              </div>
            </div>
          </div>

          {/* Print specs */}
          <div className="rounded-xl bg-stone-50 border border-stone-200 px-4 py-2.5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-stone-700">Direct Thermal · {stickerSize}" · Black on White · Large QR</p>
              <p className="text-[10px] text-stone-400 mt-0.5">Helvetica Bold · High-contrast QR · No margins · 2 per sheet</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-stone-600">{lot.lot_number}</p>
              <p className="text-[10px] text-stone-400">2 per sheet</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-stone-100 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-semibold text-stone-600 hover:bg-stone-50"
          >
            Cancel
          </button>
          <button
            onClick={handlePrint}
            disabled={loading}
            className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? "Generating PDF..." : `🖨 Print ${copies === 1 ? "" : `${copies}× `}${stickerType === "field" ? "Field" : "Shed"} Sticker${copies > 1 ? "s" : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}