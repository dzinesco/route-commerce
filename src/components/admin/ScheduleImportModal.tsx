"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { createStopsBatch } from "@/actions/stops";
import type { ParsedStopRow } from "@/lib/csv-parsers";

type ParsedStop = Omit<ParsedStopRow, "_rowIndex" | "_warnings">;

type Step = "idle" | "parsing" | "review" | "importing" | "done" | "error";

type Props = {
  brandId: string;
  onClose: () => void;
  onComplete: (count: number) => void;
};

export default function ScheduleImportModal({ brandId, onClose, onComplete }: Props) {
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState<string | null>(null);
  const [parsedStops, setParsedStops] = useState<ParsedStop[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [useAI, setUseAI] = useState(false);
  const [created, setCreated] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Animate in
  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
  }, []);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // Escape key handler
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const processFile = useCallback(async (file: File) => {
    setError(null);
    setStep("parsing");

    let text: string;
    try {
      text = await file.text();
    } catch {
      setError("Could not read file. Try a different format.");
      setStep("idle");
      return;
    }

    try {
      const res = await fetch("/api/stops/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, brandId, useAI }),
      });

      const data = await res.json();

      if (!res.ok || (data.error && data.stops?.length === 0)) {
        setError(data.error ?? "Parsing failed. Try a CSV file.");
        setStep("idle");
        return;
      }

      if (!data.stops || data.stops.length === 0) {
        setError("No stops found in file. Check that columns include: city, state, location, date, time.");
        setStep("idle");
        return;
      }

      setParsedStops(data.stops);
      setWarnings(data.warnings ?? []);
      setStep("review");
    } catch {
      setError("Network error while parsing file.");
      setStep("idle");
    }
  }, [brandId, useAI]);

  function handleFile(file: File) {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!["csv", "txt", "json"].includes(ext)) {
      setError("Unsupported file type. Please upload a CSV, TXT, or JSON file.");
      return;
    }
    processFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function updateStop(idx: number, field: keyof ParsedStop, value: string) {
    setParsedStops((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  }

  function removeStop(idx: number) {
    setParsedStops((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleImport() {
    if (parsedStops.length === 0) return;
    setStep("importing");
    setError(null);

    const result = await createStopsBatch(
      brandId,
      parsedStops.map(({ city, state, location, date, time, address, zip, notes }) => ({
        city, state, location, date, time, address, zip, notes,
      }))
    );

    if (!result.success) {
      setError(result.error ?? "Import failed");
      setStep("review");
      return;
    }

    setCreated(result.created);
    setStep("done");
    onComplete(result.created);
  }

  const hasWarnings = warnings.length > 0;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${isVisible ? "opacity-100" : "opacity-0"}`}
      onClick={handleBackdropClick}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-md" />

      <div
        className={`relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-2xl border border-stone-200 transition-all duration-300 ${isVisible ? "scale-100 opacity-100" : "scale-95 opacity-0"}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 py-5">
          <div>
            <h2 className="text-xl font-semibold text-white">Import Schedule</h2>
            <p className="mt-0.5 text-sm text-white/80">
              Upload a CSV to bulk-create stops as drafts.
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {step === "idle" && (
            <div className="space-y-5">
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* AI toggle */}
              <div className="flex items-center gap-3 p-4 rounded-xl border border-stone-200 bg-stone-50">
                <button
                  onClick={() => setUseAI((v) => !v)}
                  className={`flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                    useAI
                      ? "bg-violet-100 border border-violet-300 text-violet-700"
                      : "bg-white border border-stone-200 text-stone-600 hover:border-stone-300"
                  }`}
                >
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${useAI ? "bg-violet-500 text-white" : "bg-stone-200 text-stone-500"}`}>
                    {useAI ? "✓" : "○"}
                  </span>
                  Use AI for text/PDF parsing
                </button>
                <span className="text-xs text-stone-500">
                  {useAI
                    ? "AI will parse unstructured text. Requires OPENAI_API_KEY."
                    : "Best results with CSV. Text/PDF uses AI if enabled."}
                </span>
              </div>

              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`cursor-pointer rounded-2xl border-2 border-dashed p-12 text-center transition-all ${
                  dragOver
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-stone-300 hover:border-emerald-400 hover:bg-stone-50"
                }`}
              >
                <div className="flex justify-center mb-4">
                  <div className={`flex h-16 w-16 items-center justify-center rounded-2xl ${dragOver ? "bg-emerald-100" : "bg-stone-100"}`}>
                    <svg className={`h-8 w-8 ${dragOver ? "text-emerald-600" : "text-stone-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.801 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                    </svg>
                  </div>
                </div>
                <p className="text-lg font-semibold text-stone-700">
                  Drop your schedule file here
                </p>
                <p className="mt-2 text-sm text-stone-500">
                  or click to browse — CSV, TXT, JSON
                </p>
                <p className="mt-4 text-xs text-stone-400 font-mono bg-stone-100 rounded-lg px-3 py-2 inline-block">
                  CSV columns: city, state, location, date, time, address, zip, notes
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt,.json"
                className="hidden"
                onChange={handleChange}
              />
            </div>
          )}

          {step === "parsing" && (
            <div className="flex flex-col items-center gap-4 py-12">
              <div className="h-10 w-10 animate-spin rounded-full border-3 border-emerald-200 border-t-emerald-600" />
              <p className="text-stone-600 font-medium">Parsing file…</p>
            </div>
          )}

          {step === "review" && (
            <div className="space-y-5">
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {hasWarnings && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
                  <p className="font-semibold text-amber-800">Parsing warnings:</p>
                  <ul className="mt-1 list-disc list-inside space-y-0.5 text-amber-700">
                    {warnings.slice(0, 5).map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                    {warnings.length > 5 && <li>…and {warnings.length - 5} more</li>}
                  </ul>
                </div>
              )}

              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-stone-700">
                  {parsedStops.length} stop{parsedStops.length !== 1 ? "s" : ""} found — review and edit below
                </p>
                <span className="text-xs text-stone-500">All will be created as drafts</span>
              </div>

              {/* Review table */}
              <div className="max-h-72 overflow-y-auto rounded-xl border border-stone-200 bg-white">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-stone-50 border-b border-stone-200">
                    <tr>
                      <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">City</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">State</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Location</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Date</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Time</th>
                      <th className="w-10 px-3 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {parsedStops.map((stop, idx) => (
                      <tr key={idx} className="hover:bg-stone-50 transition-colors">
                        <td className="px-2 py-2">
                          <input
                            value={stop.city}
                            onChange={(e) => updateStop(idx, "city", e.target.value)}
                            className="w-full rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-sm text-stone-900 outline-none focus:border-emerald-400 focus:bg-white"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            value={stop.state}
                            onChange={(e) => updateStop(idx, "state", e.target.value)}
                            className="w-14 rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-sm text-stone-900 outline-none focus:border-emerald-400 focus:bg-white"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            value={stop.location}
                            onChange={(e) => updateStop(idx, "location", e.target.value)}
                            className="w-full rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-sm text-stone-900 outline-none focus:border-emerald-400 focus:bg-white"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            value={stop.date}
                            onChange={(e) => updateStop(idx, "date", e.target.value)}
                            className="w-28 rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-sm text-stone-900 outline-none focus:border-emerald-400 focus:bg-white"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            value={stop.time}
                            onChange={(e) => updateStop(idx, "time", e.target.value)}
                            className="w-20 rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-sm text-stone-900 outline-none focus:border-emerald-400 focus:bg-white"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <button
                            onClick={() => removeStop(idx)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-stone-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between pt-2">
                <p className="text-sm text-stone-500">
                  {parsedStops.length} draft stop{parsedStops.length !== 1 ? "s" : ""} will be created
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => { setStep("idle"); setParsedStops([]); setWarnings([]); }}
                    className="rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={parsedStops.length === 0}
                    className="rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50 transition-colors shadow-sm shadow-emerald-200"
                  >
                    Create {parsedStops.length} Draft Stop{parsedStops.length !== 1 ? "s" : ""}
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === "importing" && (
            <div className="flex flex-col items-center gap-4 py-12">
              <div className="h-10 w-10 animate-spin rounded-full border-3 border-emerald-200 border-t-emerald-600" />
              <p className="text-stone-600 font-medium">Creating draft stops…</p>
            </div>
          )}

          {step === "done" && (
            <div className="flex flex-col items-center gap-5 py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                <svg className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-semibold text-stone-950">
                  {created} draft stop{created !== 1 ? "s" : ""} created
                </p>
                <p className="mt-2 text-sm text-stone-500">
                  Review them in the stops list and publish when ready.
                </p>
              </div>
              <button
                onClick={onClose}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-6 py-3 text-sm font-semibold text-white transition-colors shadow-sm shadow-emerald-200"
              >
                Back to Stops
              </button>
            </div>
          )}

          {step === "error" && (
            <div className="flex flex-col items-center gap-4 py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <p className="text-red-700 font-medium">{error}</p>
              <button
                onClick={() => setStep("idle")}
                className="rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}