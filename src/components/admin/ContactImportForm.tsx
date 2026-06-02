"use client";

import { useState, useRef, useCallback } from "react";
import {
  importContactsBatch,
  previewContactImport,
  type ContactImportEntry,
  type ImportPreviewResult,
  type ColumnMapping,
  type ImportField,
} from "@/actions/communications/contacts";
import { uploadContactsToBucket, processBucketImport, listImportHistory } from "@/actions/communications/import-contacts";

type Step = "idle" | "preview" | "confirming" | "importing" | "result";

type ImportResult = {
  created: number;
  updated: number;
  skipped: number;
  errors: { row: ContactImportEntry; error: string }[];
};

const LARGE_FILE_ROWS = 10_000;

const FIELD_LABELS: Record<string, string> = {
  email: "Email",
  phone: "Phone",
  first_name: "First Name",
  last_name: "Last Name",
  full_name: "Full Name",
  tags: "Tags",
  email_opt_in: "Email Opt-In",
  sms_opt_in: "SMS Opt-In",
  external_id: "External ID",
};

// Icon components
const Icons = {
  upload: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="17 8 12 3 7 8"/>
      <line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
  ),
  uploadCloud: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 16 12 12 8 16"/>
      <line x1="12" y1="12" x2="12" y2="21"/>
      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
      <polyline points="16 16 12 12 8 16"/>
    </svg>
  ),
  file: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
    </svg>
  ),
  check: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  spinner: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/>
      <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round">
        <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/>
      </path>
    </svg>
  ),
};

// Helper for stat colors
function getStatColor(highlight: boolean, warn: boolean) {
  if (highlight) return "bg-emerald-50 border-emerald-200 text-emerald-700";
  if (warn) return "bg-amber-50 border-amber-200 text-amber-700";
  return "bg-[var(--admin-card)] border-[var(--admin-border)] text-[var(--admin-text-primary)]";
}

function getStatValueColor(highlight: boolean, warn: boolean) {
  if (highlight) return "text-emerald-600";
  if (warn) return "text-amber-600";
  return "text-[var(--admin-text-muted)]";
}

export default function ContactImportForm({ brandId }: { brandId: string }) {
  const [step, setStep] = useState<Step>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null);
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [importRows, setImportRows] = useState<ContactImportEntry[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [globalError, setGlobalError] = useState("");
  const [overridingMappings, setOverridingMappings] = useState<
    Record<string, ImportField>
  >({});
  const [useBucket, setUseBucket] = useState(false); // Toggle for bucket upload
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const [importHistory, setImportHistory] = useState<{ filename: string; size: number; createdAt: string }[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  // For large file detection (farmers with lots of data)
  const LARGE_FILE_THRESHOLD = 5 * 1024 * 1024; // 5MB

  // ── CSV parsing + preview ──────────────────────────────────────────────────

  const handleFile = useCallback(
    async (f: File) => {
      setFile(f);
      setResult(null);
      setGlobalError("");
      setOverridingMappings({});

      // Check if file is large enough to warrant bucket upload
      const isLargeFile = f.size > LARGE_FILE_THRESHOLD;

      if (isLargeFile) {
        // Use bucket upload for large files
        setUploadProgress("Uploading file to storage...");
        setUseBucket(true);

        const uploadResult = await uploadContactsToBucket(brandId, f);

        if (!uploadResult.success) {
          setGlobalError(uploadResult.error);
          setStep("idle");
          return;
        }

        setUploadProgress(`Processing ${uploadResult.recordCount.toLocaleString()} records...`);

        // Process from bucket
        const processResult = await processBucketImport(brandId, uploadResult.fileUrl);

        setImporting(false);
        setUploadProgress("");

        if (!processResult.success) {
          setGlobalError(processResult.error);
          setStep("idle");
          return;
        }

        setResult({
          created: processResult.created,
          updated: processResult.updated,
          skipped: processResult.skipped,
          errors: [],
        });
        setStep("result");

        // Load import history
        const historyResult = await listImportHistory(brandId);
        if (historyResult.success) {
          setImportHistory(historyResult.imports);
        }

        return;
      }

      // Browser-based processing for smaller files
      setUseBucket(false);
      const text = await f.text();
      const previewResult = await previewContactImport(text);

      if (!previewResult.success) {
        setGlobalError(previewResult.error);
        setStep("idle");
        return;
      }

      const { csv, totalRows } = await import("@/lib/csv-parser").then(
        (m) => m.parseCSVWithLimits(text)
      );

      setRawHeaders(csv.headers);
      setRawRows(csv.rows);
      setPreview(previewResult.preview);
      setStep("preview");
    },
    [brandId, LARGE_FILE_THRESHOLD]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const f = e.dataTransfer.files[0];
      if (f && f.name.endsWith(".csv")) handleFile(f);
      else setGlobalError("Please upload a .csv file");
    },
    [handleFile]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f) handleFile(f);
    },
    [handleFile]
  );

  // ── Mapping override ───────────────────────────────────────────────────────

  function applyMappings(
    mappings: ColumnMapping[],
    overrides: Record<string, ImportField>,
    headers: string[],
    rows: string[][]
  ): ContactImportEntry[] {
    const effective = mappings.map((m) => ({
      ...m,
      field: overrides[m.csvColumn] ?? m.field,
    }));

    const emailColIdx = effective.findIndex((m) => m.field === "email");
    const phoneColIdx = effective.findIndex((m) => m.field === "phone");

    const seenEmails = new Set<string>();
    const seenPhones = new Set<string>();
    const entries: ContactImportEntry[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const entry: ContactImportEntry = {};
      const ignored: Record<string, string> = {};

      for (const mapping of effective) {
        const colIdx = headers.indexOf(mapping.csvColumn);
        if (colIdx === -1) continue;
        const raw = row[colIdx] ?? "";

        if (mapping.field === null) {
          if (raw) ignored[mapping.csvColumn] = raw;
          continue;
        }

        switch (mapping.field) {
          case "email": {
            const cleaned = raw.trim().toLowerCase();
            entry.email = cleaned || undefined;
            break;
          }
          case "phone": {
            const stripped = raw.replace(/[\s\-().[\]]/g, "");
            entry.phone = raw.trim() || undefined;
            break;
          }
          case "first_name":
            entry.first_name = raw || undefined;
            break;
          case "last_name":
            entry.last_name = raw || undefined;
            break;
          case "full_name":
            entry.full_name = raw || undefined;
            break;
          case "tags":
            entry.tags = raw
              ? raw.split(/[;:,]/).map((t) => t.trim()).filter(Boolean)
              : undefined;
            break;
          case "email_opt_in":
            entry.email_opt_in =
              raw === "true" ||
              raw === "1" ||
              raw === "yes" ||
              raw === "y" ||
              raw === "on";
            break;
          case "sms_opt_in":
            entry.sms_opt_in =
              raw === "true" ||
              raw === "1" ||
              raw === "yes" ||
              raw === "y" ||
              raw === "on";
            break;
          case "external_id":
            entry.external_id = raw || undefined;
            break;
        }
      }

      const hasEmail = !!entry.email;
      const hasPhone = !!entry.phone;
      if (!hasEmail && !hasPhone) continue;

      // Dedupe within file
      let isDup = false;
      if (entry.email) {
        if (seenEmails.has(entry.email!)) isDup = true;
        seenEmails.add(entry.email!);
      }
      if (entry.phone && !isDup) {
        if (seenPhones.has(entry.phone)) isDup = true;
        seenPhones.add(entry.phone);
      }
      if (isDup) continue;

      if (Object.keys(ignored).length > 0) {
        entry._metadata = ignored;
      }
      entries.push(entry);
    }

    return entries;
  }

  // ── Confirm and import ─────────────────────────────────────────────────────

  const handleConfirm = useCallback(
    async () => {
      if (!preview || rawRows.length === 0) return;
      setStep("importing");

      const rowsToImport = applyMappings(
        preview.mappings,
        overridingMappings,
        rawHeaders,
        rawRows
      );

      setImportRows(rowsToImport);

      setImporting(true);
      const importResult = await importContactsBatch({
        brandId,
        contacts: rowsToImport,
      });
      setImporting(false);

      if (importResult.success) {
        setResult(importResult.result);
        setStep("result");
      } else {
        setGlobalError(importResult.error ?? "Import failed");
        setStep("result");
      }
    },
    [brandId, preview, overridingMappings, rawHeaders, rawRows]
  );

  const handleReset = () => {
    setStep("idle");
    setFile(null);
    setPreview(null);
    setImportRows([]);
    setResult(null);
    setGlobalError("");
    setOverridingMappings({});
    if (fileRef.current) fileRef.current.value = "";
  };

  // ── Render helpers ────────────────────────────────────────────────────────

  function renderMappings() {
    if (!preview) return null;
    return (
      <div className="space-y-3">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border border-[var(--admin-border)] rounded-lg">
            <thead className="bg-[var(--admin-card)]">
              <tr>
                <th className="px-3 py-2 text-left text-[var(--admin-text-muted)] font-semibold">
                  CSV Column
                </th>
                <th className="px-3 py-2 text-left text-[var(--admin-text-muted)] font-semibold">
                  Maps To
                </th>
                <th className="px-3 py-2 text-left text-[var(--admin-text-muted)] font-semibold">
                  Sample Values
                </th>
              </tr>
            </thead>
            <tbody>
              {preview.mappings.map((m) => (
                <tr key={m.csvColumn} className="border-t border-[var(--admin-border)]">
                  <td className="px-3 py-2 text-[var(--admin-text-primary)] font-mono text-xs">
                    {m.csvColumn}
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={
                        overridingMappings[m.csvColumn] ?? m.field ?? "ignore"
                      }
                      onChange={(e) => {
                        const val = e.target.value;
                        setOverridingMappings((prev) => ({
                          ...prev,
                          [m.csvColumn]:
                            val === "ignore"
                              ? null
                              : (val as ImportField),
                        }));
                      }}
                      className="text-xs border border-[var(--admin-border)] rounded px-2 py-1 bg-white text-[var(--admin-text-primary)]"
                    >
                      <option value="ignore">— ignore —</option>
                      {Object.entries(FIELD_LABELS).map(([k, label]) => (
                        <option key={k} value={k}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2 text-[var(--admin-text-muted)] text-xs">
                    {m.sampleValues.length > 0
                      ? m.sampleValues.join(", ")
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {preview.ignoredColumns.length > 0 && (
          <p className="text-xs text-[var(--admin-text-muted)]">
            Extra columns (stored in metadata):
            <span className="font-mono">
              {" "}
              {preview.ignoredColumns.join(", ")}
            </span>
          </p>
        )}
      </div>
    );
  }

  function renderStats() {
    if (!preview) return null;
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Total rows" value={preview.totalRows} />
        <Stat
          label="Importable"
          value={preview.validRows}
          highlight
        />
        <Stat label="Skipped" value={preview.skippedRows} warn={preview.skippedRows > 0} />
        <Stat
          label="Duplicates"
          value={preview.duplicateRows}
          warn={preview.duplicateRows > 0}
        />
      </div>
    );
  }

  function renderSampleRows() {
    if (!preview) return null;
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-xs border border-[var(--admin-border)] rounded-lg">
          <thead className="bg-[var(--admin-card)]">
            <tr>
              <th className="px-2 py-1 text-left text-[var(--admin-text-muted)]">#</th>
              <th className="px-2 py-1 text-left text-[var(--admin-text-muted)]">email</th>
              <th className="px-2 py-1 text-left text-[var(--admin-text-muted)]">phone</th>
              <th className="px-2 py-1 text-left text-[var(--admin-text-muted)]">first_name</th>
              <th className="px-2 py-1 text-left text-[var(--admin-text-muted)]">last_name</th>
              <th className="px-2 py-1 text-left text-[var(--admin-text-muted)]">full_name</th>
              <th className="px-2 py-1 text-left text-[var(--admin-text-muted)]">email_opt_in</th>
              <th className="px-2 py-1 text-left text-[var(--admin-text-muted)]">sms_opt_in</th>
              <th className="px-2 py-1 text-left text-[var(--admin-text-muted)]">tags</th>
            </tr>
          </thead>
          <tbody>
            {preview.sampleRows.map((row, i) => (
              <tr key={i} className="border-t border-[var(--admin-border)] hover:bg-[var(--admin-card-hover)]">
                <td className="px-2 py-1 text-[var(--admin-text-muted)]">{i + 1}</td>
                <td className="px-2 py-1 text-[var(--admin-text-primary)]">{row.email ?? ""}</td>
                <td className="px-2 py-1 text-[var(--admin-text-primary)]">{row.phone ?? ""}</td>
                <td className="px-2 py-1 text-[var(--admin-text-primary)]">{row.first_name ?? ""}</td>
                <td className="px-2 py-1 text-[var(--admin-text-primary)]">{row.last_name ?? ""}</td>
                <td className="px-2 py-1 text-[var(--admin-text-primary)]">{row.full_name ?? ""}</td>
                <td className="px-2 py-1 text-[var(--admin-text-muted)]">
                  {row.email_opt_in === undefined
                    ? ""
                    : row.email_opt_in
                      ? "true"
                      : "false"}
                </td>
                <td className="px-2 py-1 text-[var(--admin-text-muted)]">
                  {row.sms_opt_in === undefined
                    ? ""
                    : row.sms_opt_in
                      ? "true"
                      : "false"}
                </td>
                <td className="px-2 py-1 text-[var(--admin-text-muted)]">{row.tags?.join("; ") ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────

  return (
    <div className="p-4 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-[var(--admin-text-primary)]">
            {Icons.uploadCloud("w-3 h-3 text-[var(--admin-bg)]")}
          </div>
          <h3 className="text-sm font-semibold text-[var(--admin-text-primary)]">Import Contacts</h3>
        </div>
        {step !== "idle" && (
          <button
            onClick={handleReset}
            className="text-xs text-[var(--admin-text-muted)] hover:text-[var(--admin-text-primary)] transition-colors"
          >
            ← Start over
          </button>
        )}
      </div>

      {/* Large file banner */}
      {file && file.size > LARGE_FILE_THRESHOLD && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100">
            {Icons.check("h-4 w-4 text-emerald-600")}
          </div>
          <div>
            <p className="font-semibold text-emerald-700">Large file detected</p>
            <p className="text-xs text-emerald-600">File will be uploaded to cloud storage for processing</p>
          </div>
        </div>
      )}

      {/* Upload progress */}
      {uploadProgress && (
        <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-4 text-sm">
          <div className="flex items-center gap-3">
            {Icons.spinner("h-5 w-5 text-blue-600 animate-spin")}
            <span className="text-blue-700 font-medium">{uploadProgress}</span>
          </div>
        </div>
      )}

      {globalError && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
          {globalError}
        </div>
      )}

      {/* ── STEP: idle ─────────────────────────────────────────── */}
      {step === "idle" && (
        <>
          <div
            className="border-2 border-dashed border-[var(--admin-border)] rounded-xl p-8 text-center hover:border-emerald-400 transition-colors"
            onDragOver={(e) => {
              e.preventDefault();
            }}
            onDrop={handleDrop}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              id="csv-upload"
            />
            <label htmlFor="csv-upload" className="cursor-pointer">
              <div className="text-[var(--admin-text-muted)] text-sm">
                <span className="font-semibold text-emerald-600 hover:text-emerald-700">
                  Click to upload
                </span>
                {" "}or drag and drop a CSV file
              </div>
              <p className="text-xs text-[var(--admin-text-muted)] mt-1">
                Works with Mailchimp, Square, Shopify, WooCommerce, QuickBooks, and
                generic spreadsheets
              </p>
              <p className="text-[10px] text-[var(--admin-text-muted)] mt-2 text-emerald-600">
                Large files (5MB+) automatically uploaded to cloud storage
              </p>
            </label>
          </div>
        </>
      )}

      {/* ── STEP: preview ──────────────────────────────────────── */}
      {step === "preview" && preview && (
        <>
          {preview.warnings.map((w, i) => (
            <div
              key={i}
              className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700"
            >
              {w}
            </div>
          ))}

          <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">
            <p className="font-semibold mb-1">{file?.name}</p>
            <p>
              Column mappings detected — review below, adjust if needed, then
              confirm import.
            </p>
          </div>

          <div className="space-y-3">
            {renderMappings()}
          </div>

          <div>
            <p className="text-xs text-[var(--admin-text-muted)] mb-2 font-semibold uppercase tracking-wide">
              Import Summary
            </p>
            {renderStats()}
          </div>

          <div>
            <p className="text-xs text-[var(--admin-text-muted)] mb-2 font-semibold uppercase tracking-wide">
              Sample rows (first {preview.sampleRows.length})
            </p>
            {renderSampleRows()}
          </div>

          {preview.skippedReasons.length > 0 && (
            <div>
              <p className="text-xs text-[var(--admin-text-muted)] mb-1 font-semibold">
                Skipped rows ({preview.skippedReasons.length})
              </p>
              <div className="max-h-32 overflow-y-auto text-xs text-[var(--admin-text-muted)] space-y-1">
                {preview.skippedReasons.slice(0, 10).map((s) => (
                  <p key={s.rowIndex}>
                    Row {s.rowIndex + 1}: {s.reason}
                  </p>
                ))}
                {preview.skippedReasons.length > 10 && (
                  <p className="text-[var(--admin-text-muted)]">
                    ...and{" "}
                    {preview.skippedReasons.length - 10} more
                  </p>
                )}
              </div>
            </div>
          )}

          {preview.totalRows > LARGE_FILE_ROWS && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
              Large file ({preview.totalRows.toLocaleString()} rows) — confirm to
              proceed.
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => handleReset()}
              className="rounded-lg border border-[var(--admin-border)] px-4 py-2 text-sm text-[var(--admin-text-muted)] hover:bg-[var(--admin-card-hover)] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => handleConfirm()}
              disabled={preview.validRows === 0}
              className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              Import {preview.validRows} contacts
            </button>
          </div>
        </>
      )}

      {/* ── STEP: importing ────────────────────────────────────── */}
      {step === "importing" && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-6 text-center text-sm text-emerald-700 font-semibold">
          Importing {importRows.length} contacts...
        </div>
      )}

      {/* ── STEP: result ────────────────────────────────────────── */}
      {step === "result" && result && (
        <div className="space-y-3">
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm space-y-1">
            <p className="font-semibold text-emerald-700 flex items-center gap-2">
              {Icons.check("h-4 w-4")}
              Import complete
            </p>
            <p className="text-emerald-600">Created: {result.created.toLocaleString()}</p>
            <p className="text-emerald-600">Updated: {result.updated.toLocaleString()}</p>
            <p className="text-emerald-600">Skipped: {result.skipped.toLocaleString()}</p>
          </div>

          {result.errors.length > 0 && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm">
              <p className="font-semibold text-red-600 mb-2">
                Errors ({result.errors.length})
              </p>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {result.errors.slice(0, 10).map((e, i) => (
                  <p key={i} className="text-red-600 text-xs">
                    {e.error}: {JSON.stringify(e.row).slice(0, 80)}
                  </p>
                ))}
                {result.errors.length > 10 && (
                  <p className="text-red-600 text-xs">
                    ...and {result.errors.length - 10} more
                  </p>
                )}
              </div>
            </div>
          )}

          <button
            onClick={handleReset}
            className="rounded-lg border border-[var(--admin-border)] px-4 py-2 text-sm text-[var(--admin-text-muted)] hover:bg-[var(--admin-card-hover)] transition-colors"
          >
            Import more
          </button>
        </div>
      )}

      {/* Import history for bucket imports */}
      {importHistory.length > 0 && (
        <div className="border-t border-[var(--admin-border)] pt-4 mt-4">
          <p className="text-xs font-semibold text-[var(--admin-text-muted)] uppercase tracking-wide mb-3">
            Previous Imports
          </p>
          <div className="space-y-2">
            {importHistory.slice(0, 5).map((imp, i) => (
              <div key={i} className="flex items-center justify-between text-xs p-2 rounded-lg bg-[var(--admin-card)]">
                <div className="flex items-center gap-2">
                  {Icons.file("h-4 w-4 text-[var(--admin-text-muted)]")}
                  <span className="text-[var(--admin-text-primary)]">{imp.filename}</span>
                </div>
                <span className="text-[var(--admin-text-muted)]">
                  {(imp.size / 1024).toFixed(1)} KB
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
  warn,
}: {
  label: string;
  value: number;
  highlight?: boolean;
  warn?: boolean;
}) {
  const bgColor = highlight ? "bg-emerald-50 border-emerald-200" : warn ? "bg-amber-50 border-amber-200" : "bg-[var(--admin-card)] border-[var(--admin-border)]";
  const valueColor = highlight ? "text-emerald-700" : warn ? "text-amber-700" : "text-[var(--admin-text-primary)]";
  const labelColor = highlight ? "text-emerald-600" : warn ? "text-amber-600" : "text-[var(--admin-text-muted)]";

  return (
    <div className={`rounded-lg border px-4 py-3 text-center ${bgColor}`}>
      <p className={`text-xl font-bold ${valueColor}`}>
        {value.toLocaleString()}
      </p>
      <p className={`text-xs mt-0.5 ${labelColor}`}>{label}</p>
    </div>
  );
}