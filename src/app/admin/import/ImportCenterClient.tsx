"use client";

import { useState, useRef } from "react";
import { analyzeImport, executeImport, type ImportAnalysis, type ImportEntityType } from "@/actions/ai-import";

type Step = "upload" | "analysis" | "preview" | "import";

const ENTITY_LABELS: Record<string, string> = {
  products: "Products",
  orders: "Orders",
  contacts: "Contacts",
  stops: "Stops",
  unknown: "Unknown",
};

const ALL_FIELDS = ["ignore", "product_name", "price", "description", "product_type", "active", "image_url",
  "customer_name", "customer_email", "customer_phone", "stop_id", "quantity", "fulfillment", "product_id",
  "first_name", "last_name", "full_name", "tags", "email_opt_in", "sms_opt_in", "external_id",
  "city", "state", "location", "date", "time", "address", "zip", "notes"];

type Brand = { id: string; name: string };

type Props = {
  brandId: string;
  brandName: string;
  brands?: Brand[];
  isPlatformAdmin?: boolean;
};

export default function ImportCenterClient({ brandId: initialBrandId, brandName: initialBrandName, brands = [], isPlatformAdmin = false }: Props) {
  const [activeBrandId, setActiveBrandId] = useState(initialBrandId);
  const [activeBrandName, setActiveBrandName] = useState(initialBrandName);
  const [fileName, setFileName] = useState("");
  const [base64Data, setBase64Data] = useState("");
  const [analysis, setAnalysis] = useState<ImportAnalysis | null>(null);
  const [editedMappings, setEditedMappings] = useState<Record<string, string>>({});
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("upload");
  const [analysisStep, setAnalysisStep] = useState(0);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: boolean; created?: number; updated?: number; errors: { row: number; message: string }[] } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const analysisTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleBrandChange(newBrandId: string) {
    setActiveBrandId(newBrandId);
    const found = brands.find((b) => b.id === newBrandId);
    if (found) setActiveBrandName(found.name);
  }

  function handleFile(file: File) {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setBase64Data(result.replace(/^data:[^;]+;base64,/, ""));
    };
    reader.readAsDataURL(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  async function handleAnalyze() {
    if (!base64Data || !fileName) return;
    setAnalysisError(null);
    setStep("analysis");
    setAnalysisStep(0);

    const messages = [
      "Reading your file...",
      "AI is mapping columns...",
      "Cleaning and normalizing data...",
      "Finalizing preview...",
    ];
    let idx = 0;
    analysisTimerRef.current = setInterval(() => {
      idx = (idx + 1) % messages.length;
      setAnalysisStep(idx);
    }, 1500);

    const result = await analyzeImport(base64Data, fileName, activeBrandId);
    if (analysisTimerRef.current) clearInterval(analysisTimerRef.current);

    if (result.success) {
      setAnalysis(result.analysis);
      setEditedMappings(result.analysis.columnMappings);
      setStep("preview");
    } else {
      setAnalysisError(result.error ?? "Analysis failed");
      setStep("upload");
    }
  }

  function updateMapping(header: string, field: string) {
    setEditedMappings((prev) => ({ ...prev, [header]: field }));
  }

  function overrideType(type: ImportEntityType) {
    if (!analysis) return;
    setAnalysis({ ...analysis, detectedType: type, confidence: 1.0 });
  }

  async function handleImport() {
    if (!analysis) return;
    setImporting(true);
    setImportError(null);

    const mappedRows = analysis.rawRows.map((row) => {
      const obj: Record<string, unknown> = {};
      analysis.headers.forEach((header, i) => {
        const field = editedMappings[header];
        if (field && field !== "ignore") {
          obj[field] = row[i]?.trim() ?? "";
        }
      });
      return obj;
    });

    const result = await executeImport(activeBrandId, analysis.detectedType, mappedRows);
    setImporting(false);

    if (result.success) {
      setImportResult(result);
      setStep("import");
    } else {
      setImportError(result.error ?? "Import failed");
    }
  }

  const stepIndex = ["upload", "analysis", "preview", "import"].indexOf(step);
  const analysisLabels = ["Reading your file...", "AI is mapping columns...", "Cleaning and normalizing data...", "Finalizing preview..."];

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="mx-auto max-w-4xl px-6 py-10">

        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-200 border border-stone-300">
            <svg className="h-5 w-5 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-stone-950">Import Center</h1>
            <p className="mt-1 text-stone-500 text-sm">AI-powered data import for products, orders, contacts, and stops.</p>
          </div>
        </div>

        {/* Step indicator */}
        <div className="mb-8 flex items-center gap-2">
          {(["upload", "analysis", "preview", "import"] as Step[]).map((s, i) => {
            const labels = ["Upload", "AI Analysis", "Preview & Edit", "Import"];
            const isActive = s === step;
            const isPast = stepIndex > i;
            return (
              <div key={s} className="flex items-center gap-2">
                <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                  isActive ? "bg-violet-600 text-white" : isPast ? "bg-green-600 text-white" : "bg-stone-200 text-stone-500"
                }`}>
                  {isPast ? "✓" : i + 1}
                </div>
                <span className={`text-sm font-medium ${isActive ? "text-stone-950" : "text-stone-500"}`}>{labels[i]}</span>
                {i < 3 && <div className="h-px w-8 bg-stone-200" />}
              </div>
            );
          })}
        </div>

        {/* Brand selector */}
        {isPlatformAdmin && (
          <div className="mb-6 rounded-xl bg-white border border-stone-200 p-4">
            <label className="block text-sm font-medium text-stone-500 mb-1">Importing to brand</label>
            <select
              value={activeBrandId}
              onChange={(e) => handleBrandChange(e.target.value)}
              className="w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-950 outline-none focus:border-violet-500"
            >
              {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        )}

        {/* ── Upload ── */}
        {step === "upload" && (
          <div className="space-y-4">
            <div
              onDragOver={(e) => { e.preventDefault(); }}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-stone-300 bg-white p-12 cursor-pointer hover:border-violet-500 hover:bg-stone-50 transition-colors"
            >
              <svg className="h-10 w-10 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <div className="text-center">
                <p className="text-base font-medium text-stone-700">Drag & drop your file here</p>
                <p className="mt-1 text-sm text-stone-500">or click to browse</p>
              </div>
              <p className="text-xs text-stone-400">CSV, XLSX, XLS, TXT · max 5,000 rows · 10MB</p>
              <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls,.txt" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            </div>

            {fileName && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 flex items-center gap-3">
                <svg className="h-5 w-5 text-emerald-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-emerald-700 truncate">{fileName}</p>
                  <p className="text-xs text-emerald-600">Ready to analyze</p>
                </div>
                <button onClick={() => { setFileName(""); setBase64Data(""); }} className="text-sm text-emerald-600 font-medium hover:text-emerald-700">Change</button>
              </div>
            )}

            {analysisError && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">{analysisError}</div>
            )}

            <button
              onClick={handleAnalyze}
              disabled={!base64Data}
              className="w-full rounded-xl bg-violet-600 px-6 py-3.5 text-base font-bold text-white hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Analyze with AI
            </button>

            <div className="rounded-xl bg-violet-50 border border-violet-200 p-4">
              <p className="text-sm font-medium text-violet-700 mb-1">AI-assisted import</p>
              <p className="text-xs text-violet-600">The Import Center auto-detects your data type, maps columns intelligently, and normalizes messy data (phone numbers, dates, prices). Supports products, orders, contacts, and stops.</p>
            </div>
          </div>
        )}

        {/* ── Analysis Loading ── */}
        {step === "analysis" && (
          <div className="rounded-2xl bg-white border border-stone-200 p-16 text-center">
            <div className="mx-auto mb-6 h-12 w-12 rounded-full border-4 border-violet-600 border-t-transparent animate-spin" />
            <p className="text-xl font-semibold text-stone-700 mb-2">{analysisLabels[analysisStep]}</p>
            <p className="text-sm text-stone-500">This usually takes 5–10 seconds</p>
          </div>
        )}

        {/* ── Preview & Edit ── */}
        {step === "preview" && analysis && (
          <div className="space-y-6">
            {/* Detected type banner */}
            <div className="rounded-2xl bg-white border border-stone-200 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-full ${
                      analysis.confidence > 0.8 ? "bg-emerald-100 text-emerald-700 border border-emerald-200" : analysis.confidence > 0.5 ? "bg-amber-100 text-amber-700 border border-amber-200" : "bg-red-100 text-red-700 border border-red-200"
                    }`}>
                      {ENTITY_LABELS[analysis.detectedType] ?? "Unknown"}
                    </span>
                    <span className="text-xs text-stone-500">
                      {Math.round(analysis.confidence * 100)}% confidence
                    </span>
                  </div>
                  <p className="text-sm text-stone-600">
                    {analysis.rowCount.toLocaleString()} rows detected
                    {analysis.autoFixApplied.length > 0 && (
                      <span className="ml-2 text-emerald-600">· {analysis.autoFixApplied.join(", ")}</span>
                    )}
                  </p>
                </div>
                {analysis.confidence < 0.8 && (
                  <div className="text-right">
                    <p className="text-xs text-stone-500 mb-1">Is this wrong?</p>
                    <div className="flex gap-1">
                      {(["products", "orders", "stops", "contacts"] as ImportEntityType[]).map((t) => (
                        <button key={t} onClick={() => overrideType(t)} className={`text-xs px-2 py-1 rounded-lg border transition-colors ${
                          t === analysis.detectedType ? "bg-violet-600 text-white border-violet-600" : "border-stone-300 text-stone-600 hover:bg-stone-100"
                        }`}>{ENTITY_LABELS[t]}</button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Warnings */}
            {analysis.warnings.length > 0 && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
                <p className="text-sm font-medium text-amber-700 mb-2">Issues detected</p>
                <ul className="text-xs text-amber-600 space-y-1">
                  {analysis.warnings.slice(0, 5).map((w, i) => <li key={i}>• {w}</li>)}
                  {analysis.warnings.length > 5 && <li>...and {analysis.warnings.length - 5} more</li>}
                </ul>
              </div>
            )}

            {/* Column mapping table */}
            <div className="rounded-2xl bg-white border border-stone-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-stone-200 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-stone-700">Column Mappings</h3>
                <span className="text-xs text-stone-400">AI auto-detected — click to change</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-stone-50">
                      <th className="px-5 py-2.5 text-left font-medium text-stone-500">Your Column</th>
                      <th className="px-5 py-2.5 text-left font-medium text-stone-500">Maps To</th>
                      <th className="px-5 py-2.5 text-left font-medium text-stone-500">Sample Values</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysis.headers.map((header) => {
                      const mappedField = editedMappings[header];
                      const sampleIdx = analysis.headers.indexOf(header);
                      const samples = analysis.rawRows.slice(0, 3).map((r) => r[sampleIdx] ?? "").filter(Boolean);
                      return (
                        <tr key={header} className="border-t border-stone-200 hover:bg-stone-50">
                          <td className="px-5 py-2.5 font-medium text-stone-800 whitespace-nowrap">{header}</td>
                          <td className="px-5 py-2.5">
                            <select
                              value={mappedField ?? ""}
                              onChange={(e) => updateMapping(header, e.target.value)}
                              className="rounded-lg border border-stone-300 bg-white px-2 py-1 text-xs text-stone-800 outline-none focus:border-violet-500"
                            >
                              <option value="">— ignore —</option>
                              {ALL_FIELDS.map((f) => <option key={f} value={f}>{f || "(same)"}</option>)}
                            </select>
                          </td>
                          <td className="px-5 py-2.5 text-stone-500 text-xs max-w-xs truncate">{samples.join(", ") || "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Data preview */}
            <div className="rounded-2xl bg-white border border-stone-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-stone-200">
                <h3 className="text-sm font-semibold text-stone-700">Data Preview <span className="text-stone-400 font-normal">(first 5 rows)</span></h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-stone-50">
                      {analysis.headers.map((h) => (
                        <th key={h} className="px-4 py-2 text-left font-medium text-stone-500 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {analysis.rawRows.slice(0, 5).map((row, ri) => (
                      <tr key={ri} className="border-t border-stone-200">
                        {analysis.headers.map((h, ci) => {
                          const field = editedMappings[h];
                          const val = row[ci] ?? "";
                          const isMapped = field && field !== "ignore";
                          return (
                            <td key={ci} className={`px-4 py-2 whitespace-nowrap ${isMapped ? "text-stone-700" : "text-stone-400 italic"}`}>
                              {String(val).slice(0, 60)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button onClick={() => { setStep("upload"); setAnalysis(null); }} className="rounded-xl border border-stone-300 px-6 py-3 text-sm font-medium text-stone-700 hover:bg-stone-100">
                ← Upload Different File
              </button>
              <button
                onClick={handleImport}
                disabled={!analysis.detectedType || analysis.detectedType === "unknown" || importing}
                className="flex-1 rounded-xl bg-violet-600 px-6 py-3 text-base font-bold text-white hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {importing ? "Importing..." : `Import ${analysis.rowCount.toLocaleString()} ${analysis.detectedType !== "unknown" ? ENTITY_LABELS[analysis.detectedType] : "rows"}`}
              </button>
            </div>
          </div>
        )}

        {/* ── Import Result ── */}
        {step === "import" && (
          <div className="space-y-4">
            {importResult?.success ? (
              <div className="rounded-2xl bg-white border border-emerald-200 p-8 text-center">
                <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center">
                  <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-stone-950 mb-2">Import Complete</h2>
                {importResult.created !== undefined && <p className="text-stone-600">{importResult.created} created{importResult.updated ? `, ${importResult.updated} updated` : ""}</p>}
                {importResult.errors.length > 0 && (
                  <p className="mt-2 text-sm text-amber-600">{importResult.errors.length} rows had errors</p>
                )}
                <div className="mt-6 flex gap-3 justify-center">
                  <button onClick={() => { setStep("upload"); setAnalysis(null); setFileName(""); setBase64Data(""); setImportResult(null); }} className="rounded-xl border border-stone-300 px-6 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-100">
                    Import Another
                  </button>
                  <a href={analysis?.detectedType === "products" ? "/admin/products" : analysis?.detectedType === "orders" ? "/admin/orders" : "/admin"} className="rounded-xl bg-violet-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-violet-700">
                    View {analysis ? ENTITY_LABELS[analysis.detectedType] : ""}
                  </a>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl bg-white border border-red-200 p-8 text-center">
                <h2 className="text-xl font-bold text-stone-950 mb-2">Import Failed</h2>
                <p className="text-stone-600">{importError ?? "An error occurred during import."}</p>
                <button onClick={() => setStep("preview")} className="mt-4 rounded-xl border border-stone-300 px-6 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-100">
                  ← Back to Preview
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}