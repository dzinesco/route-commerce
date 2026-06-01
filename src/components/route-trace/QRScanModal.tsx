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

type ScanMode = "camera" | "manual";

export default function QRScanModal({ onClose }: { onClose: () => void }) {
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
              router.push(`/trace/${encodeURIComponent(raw)}`);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={handleClose}>
      <div className="w-full max-w-sm mx-4 rounded-2xl bg-white shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
          <div>
            <h3 className="text-base font-bold text-stone-900">Scan QR Code</h3>
            <p className="text-xs text-stone-400 mt-0.5">Lot sticker → trace page</p>
          </div>
          <button onClick={handleClose} className="text-stone-400 hover:text-stone-600 text-xl leading-none">✕</button>
        </div>

        {/* Mode toggle */}
        <div className="flex border-b border-stone-100">
          <button
            onClick={() => setMode("camera")}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              mode === "camera" ? "text-emerald-700 border-b-2 border-emerald-600" : "text-stone-400"
            }`}
          >
            📷 Camera
          </button>
          <button
            onClick={() => setMode("manual")}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              mode === "manual" ? "text-emerald-700 border-b-2 border-emerald-600" : "text-stone-400"
            }`}
          >
            ⌨️ Manual
          </button>
        </div>

        <div className="p-5">
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
                    <span className="text-3xl mb-3">📷</span>
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
                          <span className="text-5xl">✓</span>
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
                <p className="text-center text-xs text-stone-400">
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
                  className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3.5 text-base font-mono text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-emerald-600"
                />
                <p className="text-[10px] text-stone-400 mt-1.5">Enter the lot number from any Route Trace sticker</p>
              </div>
              <button
                type="submit"
                disabled={!manualInput.trim() || isLoading}
                className="w-full rounded-xl bg-emerald-600 py-3.5 text-base font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                {isLoading ? "Loading..." : "🔍 Trace Lot"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}