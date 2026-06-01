"use client";

import { useState, useRef, useCallback } from "react";
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="relative w-full max-w-2xl rounded-2xl bg-zinc-900 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between rounded-t-2xl border-b border-zinc-800 px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-zinc-100">Import Schedule</h2>
            <p className="mt-0.5 text-sm text-zinc-500">
              Upload a CSV to bulk-create stops as drafts.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-slate-400 hover:bg-zinc-950 hover:text-zinc-400"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {step === "idle" && (
            <div className="space-y-4">
              {error && (
                <div className="rounded-xl bg-red-900/30 border border-red-200 px-4 py-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              {/* AI toggle */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setUseAI((v) => !v)}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    useAI
                      ? "border-purple-300 bg-purple-50 text-purple-700"
                      : "border-zinc-800 text-zinc-400 hover:bg-zinc-800"
                  }`}
                >
                  <span className="text-base">{useAI ? "◉" : "○"}</span>
                  Use AI for text/PDF parsing
                </button>
                <span className="text-xs text-slate-400">
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
                className={`cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
                  dragOver
                    ? "border-slate-900 bg-zinc-900"
                    : "border-zinc-600 hover:border-slate-400 hover:bg-zinc-800"
                }`}
              >
                <p className="text-2xl text-slate-400">📄</p>
                <p className="mt-2 font-medium text-zinc-300">
                  Drop your schedule file here
                </p>
                <p className="mt-1 text-sm text-zinc-500">
                  or click to browse — CSV, TXT, JSON
                </p>
                <p className="mt-3 text-xs text-slate-400">
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
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-slate-900" />
              <p className="text-zinc-400">Parsing file…</p>
            </div>
          )}

          {step === "review" && (
            <div className="space-y-4">
              {error && (
                <div className="rounded-xl bg-red-900/30 border border-red-200 px-4 py-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              {hasWarnings && (
                <div className="rounded-xl bg-amber-900/30 border border-yellow-200 px-4 py-3 text-sm text-yellow-700">
                  <p className="font-medium">Parsing warnings:</p>
                  <ul className="mt-1 list-disc list-inside space-y-0.5">
                    {warnings.slice(0, 5).map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                    {warnings.length > 5 && <li>…and {warnings.length - 5} more</li>}
                  </ul>
                </div>
              )}

              <p className="text-sm text-zinc-400">
                {parsedStops.length} stop{parsedStops.length !== 1 ? "s" : ""} found — review and edit below before importing.
              </p>

              {/* Review table */}
              <div className="max-h-80 overflow-y-auto rounded-xl border border-zinc-800">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-zinc-900 text-zinc-400">
                    <tr>
                      <th className="px-2 py-2 text-left font-semibold">City</th>
                      <th className="px-2 py-2 text-left font-semibold">State</th>
                      <th className="px-2 py-2 text-left font-semibold">Location</th>
                      <th className="px-2 py-2 text-left font-semibold">Date</th>
                      <th className="px-2 py-2 text-left font-semibold">Time</th>
                      <th className="px-2 py-2 text-left font-semibold">Address</th>
                      <th className="w-8 px-2 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedStops.map((stop, idx) => (
                      <tr key={idx} className="hover:bg-zinc-800">
                        <td className="px-1 py-1">
                          <input
                            value={stop.city}
                            onChange={(e) => updateStop(idx, "city", e.target.value)}
                            className="w-full rounded border border-transparent bg-transparent px-2 py-1 text-xs outline-none focus:border-slate-400"
                          />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            value={stop.state}
                            onChange={(e) => updateStop(idx, "state", e.target.value)}
                            className="w-12 rounded border border-transparent bg-transparent px-2 py-1 text-xs outline-none focus:border-slate-400"
                          />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            value={stop.location}
                            onChange={(e) => updateStop(idx, "location", e.target.value)}
                            className="w-full rounded border border-transparent bg-transparent px-2 py-1 text-xs outline-none focus:border-slate-400"
                          />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            value={stop.date}
                            onChange={(e) => updateStop(idx, "date", e.target.value)}
                            className="w-24 rounded border border-transparent bg-transparent px-2 py-1 text-xs outline-none focus:border-slate-400"
                          />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            value={stop.time}
                            onChange={(e) => updateStop(idx, "time", e.target.value)}
                            className="w-20 rounded border border-transparent bg-transparent px-2 py-1 text-xs outline-none focus:border-slate-400"
                          />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            value={stop.address ?? ""}
                            onChange={(e) => updateStop(idx, "address", e.target.value)}
                            placeholder="—"
                            className="w-full rounded border border-transparent bg-transparent px-2 py-1 text-xs outline-none focus:border-slate-400"
                          />
                        </td>
                        <td className="px-1 py-1">
                          <button
                            onClick={() => removeStop(idx)}
                            className="rounded px-1 py-0.5 text-red-400 hover:bg-red-900/30 hover:text-red-400"
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-sm text-zinc-500">
                  {parsedStops.length} draft stop{parsedStops.length !== 1 ? "s" : ""} will be created
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => { setStep("idle"); setParsedStops([]); setWarnings([]); }}
                    className="rounded-xl border border-zinc-600 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={parsedStops.length === 0}
                    className="rounded-xl bg-slate-900 px-5 py-2 text-sm font-medium text-white disabled:opacity-50 hover:bg-slate-800"
                  >
                    Create {parsedStops.length} Draft Stop{parsedStops.length !== 1 ? "s" : ""}
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === "importing" && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-slate-900" />
              <p className="text-zinc-400">Creating draft stops…</p>
            </div>
          )}

          {step === "done" && (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <p className="text-4xl">✅</p>
              <p className="text-lg font-bold text-zinc-100">
                {created} draft stop{created !== 1 ? "s" : ""} created
              </p>
              <p className="text-zinc-400">
                Review them in the stops list and publish when ready.
              </p>
              <button
                onClick={onClose}
                className="rounded-xl bg-slate-900 px-6 py-3 font-medium text-white hover:bg-slate-800"
              >
                Back to Stops
              </button>
            </div>
          )}

          {step === "error" && (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <p className="text-4xl">❌</p>
              <p className="text-red-400">{error}</p>
              <button
                onClick={() => setStep("idle")}
                className="rounded-xl border border-zinc-600 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
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
