"use client";

// BarcodeDetector is not yet in TypeScript's lib — declare it inline
declare global {
  interface Window {
    BarcodeDetector?: new (options: { formats: string[] }) => {
      detect(source: HTMLVideoElement | HTMLCanvasElement | ImageBitmap): Promise<Array<{ rawValue: string }>>;
    };
  }
}

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import GlassModal from "@/components/admin/GlassModal";

// One-color outline icons
const Icons = {
  camera: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  ),
  keyboard: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h8M6 16h12" />
    </svg>
  ),
  check: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5"/>
    </svg>
  ),
  search: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/>
      <path d="m21 21-4.3-4.3"/>
    </svg>
  ),
  cameraOff: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.66 6H14a2 2 0 0 1 2 2v2.34l1 1L22 8v8"/>
      <path d="M16 16H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h3l2-3h2l2 3h3"/>
      <line x1="2" x2="22" y1="2" y2="22"/>
    </svg>
  ),
};

type ScanMode = "camera" | "manual";

interface QRScanModalProps {
  onClose: () => void;
  onScanResult?: (lotNumber: string) => void;
}

export default function QRScanModal({ onClose, onScanResult }: QRScanModalProps) {
  const router = useRouter();
  const [mode, setMode] = useState<ScanMode>("camera");
  const [manualInput, setManualInput] = useState("");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(true);
  const [detected, setDetected] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const detectorRef = useRef<any>(null);
  const scanRef = useRef<number>(0);

  // Start camera on mount for camera mode
  useEffect(() => {
    if (mode !== "camera") return;

    let mounted = true;

    async function startCamera() {
      setCameraStarting(true);
      setCameraError(null);

      // Check for BarcodeDetector support
      if (!window.BarcodeDetector) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
          });
          if (!mounted) { stream.getTracks().forEach(t => t.stop()); return; }
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            await videoRef.current.play();
          }
          setCameraStarting(false);
        } catch (err) {
          if (!mounted) return;
          const msg = err instanceof DOMException && err.name === "NotAllowedError"
            ? "Camera access denied. Please allow camera permission."
            : err instanceof DOMException && err.name === "NotFoundError"
            ? "No camera found. Use manual entry."
            : "Camera not available. Use manual entry.";
          setCameraError(msg);
          setCameraStarting(false);
          setTimeout(() => { if (mounted) setMode("manual"); }, 800);
        }
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        if (!mounted) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setCameraStarting(false);
      } catch (err) {
        if (!mounted) return;
        const msg = err instanceof DOMException && err.name === "NotAllowedError"
          ? "Camera access denied. Please allow camera permission."
          : err instanceof DOMException && err.name === "NotFoundError"
          ? "No camera found. Use manual entry."
          : "Camera not available. Use manual entry.";
        setCameraError(msg);
        setCameraStarting(false);
        setTimeout(() => { if (mounted) setMode("manual"); }, 800);
        return;
      }

      // Initialize BarcodeDetector
      try {
        detectorRef.current = new window.BarcodeDetector({ formats: ["qr_code"] });
      } catch {
        detectorRef.current = null;
      }

      // Scan loop
      const scan = async () => {
        if (!mounted || detected || !detectorRef.current || !videoRef.current) return;
        if (videoRef.current.readyState < 2) {
          scanRef.current = requestAnimationFrame(scan);
          return;
        }
        try {
          const barcodes = await detectorRef.current.detect(videoRef.current);
          if (barcodes.length > 0 && !detected) {
            setDetected(true);
            setScanSuccess(true);
            const raw = barcodes[0].rawValue;
            if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
            setTimeout(() => {
              onClose();
              if (onScanResult) {
                onScanResult(raw);
              } else {
                router.push(`/trace/${encodeURIComponent(raw)}`);
              }
            }, 800);
            return;
          }
        } catch {
          // Ignore detection errors
        }
        scanRef.current = requestAnimationFrame(scan);
      };

      scanRef.current = requestAnimationFrame(scan);
    }

    startCamera();

    return () => {
      mounted = false;
      if (scanRef.current) cancelAnimationFrame(scanRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, [mode, detected, onClose, router]);

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = manualInput.trim();
    if (!trimmed) return;
    setIsLoading(true);
    onClose();
    router.push(`/trace/${encodeURIComponent(trimmed)}`);
  }

  function handleClose() {
    if (scanRef.current) cancelAnimationFrame(scanRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    onClose();
  }

  return (
    <GlassModal title="Scan QR Code" subtitle="Point camera at Route Trace sticker" onClose={handleClose}>
      {/* Mode toggle */}
      <div className="flex border-b border-[var(--admin-border)] mb-4 -mx-6 px-6">
        <button
          onClick={() => setMode("camera")}
          className={`flex-1 py-3 text-sm font-semibold transition-colors ${
            mode === "camera" ? "text-[var(--admin-text-primary)] border-b-2 border-[var(--admin-text-primary)]" : "text-[var(--admin-text-muted)]"
          }`}
        >
          <svg className="w-4 h-4 inline-block mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
            <circle cx="12" cy="13" r="3" />
          </svg>
          Camera
        </button>
        <button
          onClick={() => setMode("manual")}
          className={`flex-1 py-3 text-sm font-semibold transition-colors ${
            mode === "manual" ? "text-[var(--admin-text-primary)] border-b-2 border-[var(--admin-text-primary)]" : "text-[var(--admin-text-muted)]"
          }`}
        >
          <svg className="w-4 h-4 inline-block mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h8M6 16h12" />
          </svg>
          Manual
        </button>
      </div>

      {mode === "camera" ? (
        <div className="space-y-4">
          <div className="relative rounded-xl overflow-hidden bg-stone-900 aspect-square">
            {cameraStarting ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-sm text-center">
                <div className="w-10 h-10 border-2 border-white/30 border-t-white rounded-full animate-spin mb-3" />
                <p className="text-xs text-white/70">Starting camera...</p>
              </div>
            ) : cameraError ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-sm text-center px-6">
                <span className="mb-3 text-stone-400">{Icons.cameraOff("h-12 w-12")}</span>
                <p className="text-xs text-red-300 font-medium leading-relaxed">{cameraError}</p>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                />
                {/* Viewfinder overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  {scanSuccess ? (
                    <div className="w-44 h-44 rounded-2xl bg-green-500 flex items-center justify-center">
                      <span className="text-white">{Icons.check("h-12 w-12")}</span>
                    </div>
                  ) : (
                    <div className="w-44 h-44 border-2 border-white/70 rounded-2xl" />
                  )}
                </div>
                {!scanSuccess && (
                  <div className="absolute inset-x-0 bottom-4 text-center">
                    <span className="inline-block text-white text-xs bg-black/60 px-4 py-1.5 rounded-full font-medium">
                      Align QR within the frame
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
          {!cameraStarting && !cameraError && (
            <p className="text-center text-xs text-stone-500">
              Hold steady — QR will scan automatically
            </p>
          )}
        </div>
      ) : (
        <form onSubmit={handleManualSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1.5">Lot Number</label>
            <input
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value.toUpperCase())}
              placeholder="e.g. TC-20260520-001"
              autoFocus
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3.5 text-base font-mono text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-400"
            />
            <p className="text-[10px] text-stone-400 mt-1.5">Enter the lot number from any Route Trace sticker</p>
          </div>
          <button
            type="submit"
            disabled={!manualInput.trim() || isLoading}
            className="w-full rounded-xl bg-stone-800 py-3.5 text-base font-semibold text-white hover:bg-stone-700 disabled:opacity-50 transition-colors"
          >
            {isLoading ? "Loading..." : <><span className="inline-flex items-center gap-1.5">{Icons.search("h-4 w-4")} Trace Lot</span></>}
          </button>
        </form>
      )}
    </GlassModal>
  );
}