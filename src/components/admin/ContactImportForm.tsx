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
  const fileRef = useRef<HTMLInputElement>(null);

  // ── CSV parsing + preview ──────────────────────────────────────────────────

  const handleFile = useCallback(
    async (f: File) => {
      setFile(f);
      setResult(null);
      setGlobalError("");
      setOverridingMappings({});

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
    []
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
          <table className="w-full text-xs border border-zinc-800 rounded-lg">
            <thead className="bg-zinc-900">
              <tr>
                <th className="px-3 py-2 text-left text-zinc-400 font-medium">
                  CSV Column
                </th>
                <th className="px-3 py-2 text-left text-zinc-400 font-medium">
                  Maps To
                </th>
                <th className="px-3 py-2 text-left text-zinc-400 font-medium">
                  Sample Values
                </th>
              </tr>
            </thead>
            <tbody>
              {preview.mappings.map((m) => (
                <tr key={m.csvColumn} className="border-t border-slate-100">
                  <td className="px-3 py-2 text-slate-800 font-mono text-xs">
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
                      className="text-xs border border-zinc-600 rounded px-2 py-1"
                    >
                      <option value="ignore">— ignore —</option>
                      {Object.entries(FIELD_LABELS).map(([k, label]) => (
                        <option key={k} value={k}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2 text-zinc-500 text-xs">
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
          <p className="text-xs text-zinc-500">
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
        <table className="w-full text-xs border border-zinc-800 rounded-lg">
          <thead className="bg-zinc-900">
            <tr>
              <th className="px-2 py-1 text-left text-zinc-400">#</th>
              <th className="px-2 py-1 text-left text-zinc-400">email</th>
              <th className="px-2 py-1 text-left text-zinc-400">phone</th>
              <th className="px-2 py-1 text-left text-zinc-400">first_name</th>
              <th className="px-2 py-1 text-left text-zinc-400">last_name</th>
              <th className="px-2 py-1 text-left text-zinc-400">full_name</th>
              <th className="px-2 py-1 text-left text-zinc-400">email_opt_in</th>
              <th className="px-2 py-1 text-left text-zinc-400">sms_opt_in</th>
              <th className="px-2 py-1 text-left text-zinc-400">tags</th>
            </tr>
          </thead>
          <tbody>
            {preview.sampleRows.map((row, i) => (
              <tr key={i} className="border-t border-slate-100">
                <td className="px-2 py-1 text-slate-400">{i + 1}</td>
                <td className="px-2 py-1">{row.email ?? ""}</td>
                <td className="px-2 py-1">{row.phone ?? ""}</td>
                <td className="px-2 py-1">{row.first_name ?? ""}</td>
                <td className="px-2 py-1">{row.last_name ?? ""}</td>
                <td className="px-2 py-1">{row.full_name ?? ""}</td>
                <td className="px-2 py-1">
                  {row.email_opt_in === undefined
                    ? ""
                    : row.email_opt_in
                      ? "true"
                      : "false"}
                </td>
                <td className="px-2 py-1">
                  {row.sms_opt_in === undefined
                    ? ""
                    : row.sms_opt_in
                      ? "true"
                      : "false"}
                </td>
                <td className="px-2 py-1">{row.tags?.join("; ") ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800">Import Contacts</h3>
        {step !== "idle" && (
          <button
            onClick={handleReset}
            className="text-xs text-zinc-500 hover:text-zinc-300"
          >
            ← Start over
          </button>
        )}
      </div>

      {globalError && (
        <div className="rounded-lg bg-red-900/30 border border-red-200 px-4 py-3 text-sm text-red-400">
          {globalError}
        </div>
      )}

      {/* ── STEP: idle ─────────────────────────────────────────── */}
      {step === "idle" && (
        <>
          <div
            className="border-2 border-dashed border-zinc-600 rounded-xl p-8 text-center"
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
              <div className="text-zinc-400 text-sm">
                <span className="font-medium text-blue-400 hover:text-blue-700">
                  Click to upload
                </span>
                {" "}or drag and drop a CSV file
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Works with Mailchimp, Square, Shopify, WooCommerce, QuickBooks, and
                generic spreadsheets
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
              className="rounded-lg bg-amber-900/30 border border-amber-200 px-4 py-3 text-sm text-amber-700"
            >
              {w}
            </div>
          ))}

          <div className="rounded-lg bg-blue-900/30 border border-blue-200 px-4 py-3 text-sm text-blue-700">
            <p className="font-medium mb-1">{file?.name}</p>
            <p>
              Column mappings detected — review below, adjust if needed, then
              confirm import.
            </p>
          </div>

          <div className="space-y-3">
            {renderMappings()}
          </div>

          <div>
            <p className="text-xs text-zinc-500 mb-2 font-medium">
              Import Summary
            </p>
            {renderStats()}
          </div>

          <div>
            <p className="text-xs text-zinc-500 mb-2 font-medium">
              Sample rows (first {preview.sampleRows.length})
            </p>
            {renderSampleRows()}
          </div>

          {preview.skippedReasons.length > 0 && (
            <div>
              <p className="text-xs text-zinc-500 mb-1 font-medium">
                Skipped rows ({preview.skippedReasons.length})
              </p>
              <div className="max-h-32 overflow-y-auto text-xs text-zinc-500 space-y-1">
                {preview.skippedReasons.slice(0, 10).map((s) => (
                  <p key={s.rowIndex}>
                    Row {s.rowIndex + 1}: {s.reason}
                  </p>
                ))}
                {preview.skippedReasons.length > 10 && (
                  <p className="text-slate-400">
                    ...and{" "}
                    {preview.skippedReasons.length - 10} more
                  </p>
                )}
              </div>
            </div>
          )}

          {preview.totalRows > LARGE_FILE_ROWS && (
            <div className="rounded-lg bg-amber-900/30 border border-amber-200 px-4 py-3 text-sm text-amber-700">
              Large file ({preview.totalRows.toLocaleString()} rows) — confirm to
              proceed.
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => handleReset()}
              className="rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-900"
            >
              Cancel
            </button>
            <button
              onClick={() => handleConfirm()}
              disabled={preview.validRows === 0}
              className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Import {preview.validRows} contacts
            </button>
          </div>
        </>
      )}

      {/* ── STEP: importing ────────────────────────────────────── */}
      {step === "importing" && (
        <div className="rounded-lg bg-blue-900/30 border border-blue-200 px-4 py-6 text-center text-sm text-blue-700">
          Importing {importRows.length} contacts...
        </div>
      )}

      {/* ── STEP: result ────────────────────────────────────────── */}
      {step === "result" && result && (
        <div className="space-y-3">
          <div className="rounded-lg bg-green-900/30 border border-green-200 px-4 py-3 text-sm space-y-1">
            <p className="font-semibold text-green-400">Import complete</p>
            <p className="text-green-600">Created: {result.created}</p>
            <p className="text-green-600">Updated: {result.updated}</p>
            <p className="text-green-600">Skipped: {result.skipped}</p>
          </div>

          {result.errors.length > 0 && (
            <div className="rounded-lg bg-red-900/30 border border-red-200 px-4 py-3 text-sm">
              <p className="font-medium text-red-400 mb-2">
                Errors ({result.errors.length})
              </p>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {result.errors.slice(0, 10).map((e, i) => (
                  <p key={i} className="text-red-400 text-xs">
                    {e.error}: {JSON.stringify(e.row).slice(0, 80)}
                  </p>
                ))}
                {result.errors.length > 10 && (
                  <p className="text-red-400 text-xs">
                    ...and {result.errors.length - 10} more
                  </p>
                )}
              </div>
            </div>
          )}

          <button
            onClick={handleReset}
            className="rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-900"
          >
            Import more
          </button>
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
  return (
    <div
      className={`rounded-lg border px-4 py-3 text-center ${
        highlight
          ? "bg-blue-900/30 border-blue-200"
          : warn
            ? "bg-amber-900/30 border-amber-200"
            : "bg-zinc-900 border-zinc-800"
      }`}
    >
      <p
        className={`text-xl font-semibold ${
          highlight
            ? "text-blue-700"
            : warn
              ? "text-amber-700"
              : "text-zinc-300"
        }`}
      >
        {value.toLocaleString()}
      </p>
      <p className="text-xs text-zinc-500 mt-0.5">{label}</p>
    </div>
  );
}
