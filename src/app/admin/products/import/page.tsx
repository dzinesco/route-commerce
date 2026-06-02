"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { parseProductCSV } from "@/lib/csv-parsers";
import { importProductsBatch } from "@/actions/import-products";

type PreviewRow = {
  name: string;
  description: string;
  price: number;
  type: string;
  active: boolean;
  image_url?: string;
  _rowIndex: number;
  _warnings: string[];
};

export default function ProductImportPage() {
  const [csvText, setCsvText] = useState("");
  const [preview, setPreview] = useState<PreviewRow[] | null>(null);
  const [parseErrors, setParseErrors] = useState<{ row: number; error: string }[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ created: number; updated: number; errors: { product: string; error: string }[] } | null>(null);
  const [brandId, setBrandId] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const SAMPLE_CSV = `name,description,price,type,active,image_url
Dozen Sweet Corn,Fresh picked sweet corn,12.99,Pickup,TRUE,
Corn & Butter Bundle,Dozen corn with herb butter,18.99,Pickup & Shipping,TRUE,
Citrus Gift Box,Seasonal citrus assortment,34.99,Shipping,TRUE,
`;

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setCsvText(text);
      handlePreview(text);
    };
    reader.readAsText(file);
  }

  async function handlePreview(text?: string) {
    const toParse = text ?? csvText;
    if (!toParse.trim()) return;

    const parseResult = await parseProductCSV(toParse);
    if (!parseResult.success) {
      setPreview(null);
      setParseErrors([{ row: 0, error: parseResult.error }]);
      return;
    }

    setPreview(parseResult.rows);
    setParseErrors(parseResult.errors);
  }

  async function handleImport() {
    if (!preview || !brandId) return;
    setImporting(true);
    const importResult = await importProductsBatch(
      brandId,
      preview.map((r) => ({
        name: r.name,
        description: r.description,
        price: r.price,
        type: r.type,
        active: r.active,
        image_url: r.image_url,
      }))
    );
    setImporting(false);
    if (importResult.success) {
      setResult({ created: importResult.created, updated: importResult.updated, errors: importResult.errors });
    } else {
      setResult({ created: 0, updated: 0, errors: [{ product: "", error: importResult.error }] });
    }
  }

  return (
    <main className="min-h-screen px-6 py-10" style={{ backgroundColor: "var(--admin-bg)" }}>
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Link href="/admin/products" className="text-sm text-stone-500 hover:text-stone-700">
              ← Back to Products
            </Link>
            <h1 className="mt-2 text-3xl font-bold text-stone-950">Import Products</h1>
            <p className="mt-1 text-stone-500">
              Upload a CSV file to bulk-create or update products. Matching by product name within brand.
            </p>
          </div>
          <button
            onClick={() => {
              setCsvText(SAMPLE_CSV);
              handlePreview(SAMPLE_CSV);
            }}
            className="rounded-xl border border-stone-300 px-4 py-2 text-sm text-stone-600 hover:bg-stone-200"
          >
            Load Sample CSV
          </button>
        </div>

        {/* Brand ID */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-stone-700">Brand ID</label>
          <input
            type="text"
            value={brandId}
            onChange={(e) => setBrandId(e.target.value)}
            placeholder="64294306-5f42-463d-a5e8-2ad6c81a96de (Tuxedo)"
            className="mt-1 w-full rounded-xl border border-stone-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
          />
        </div>

        {/* File upload */}
        <div className="mb-4 rounded-2xl bg-white p-6 shadow-xl shadow-stone-200/50">
          <label className="mb-2 block text-sm font-medium text-stone-700">Upload CSV</label>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            onChange={handleFile}
            className="w-full text-sm text-stone-500"
          />
          <p className="mt-2 text-xs text-stone-500">
            Or paste CSV content below:
          </p>
          <textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            rows={6}
            className="mt-2 w-full rounded-xl border border-stone-300 px-4 py-3 text-sm font-mono outline-none focus:border-blue-500"
            placeholder="name,description,price,type,active,image_url"
          />
          <button
            onClick={() => handlePreview()}
            className="mt-3 rounded-xl border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100"
          >
            Preview
          </button>
        </div>

        {/* Parse errors */}
        {parseErrors.length > 0 && (
          <div className="mb-4 rounded-xl bg-red-50 p-4">
            <p className="text-sm font-semibold text-red-600">Parse Errors</p>
            <ul className="mt-1 space-y-1">
              {parseErrors.map((e) => (
                <li key={e.row} className="text-sm text-red-600">
                  Row {e.row}: {e.error}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Preview */}
        {preview !== null && (
          <div className="mb-4 rounded-2xl bg-white p-6 shadow-xl shadow-stone-200/50">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-stone-950">
                Preview ({preview.length} rows)
              </h2>
              <button
                onClick={handleImport}
                disabled={!brandId || importing}
                className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white disabled:opacity-50 hover:bg-blue-500"
              >
                {importing ? "Importing..." : `Import ${preview.length} Products`}
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-200">
                    <th className="py-2 px-3 text-left font-medium text-stone-600">Name</th>
                    <th className="py-2 px-3 text-left font-medium text-stone-600">Price</th>
                    <th className="py-2 px-3 text-left font-medium text-stone-600">Type</th>
                    <th className="py-2 px-3 text-left font-medium text-stone-600">Active</th>
                    <th className="py-2 px-3 text-left font-medium text-stone-600">Image</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row) => (
                    <tr key={row._rowIndex} className="border-b border-stone-200">
                      <td className="py-2 px-3 font-medium text-stone-950">{row.name}</td>
                      <td className="py-2 px-3 text-stone-600">${row.price.toFixed(2)}</td>
                      <td className="py-2 px-3 text-stone-600">{row.type}</td>
                      <td className="py-2 px-3 text-stone-600">{row.active ? "Yes" : "No"}</td>
                      <td className="max-w-[120px] truncate py-2 px-3 text-stone-500">
                        {row.image_url ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Result */}
        {result !== null && (
          <div className="rounded-2xl bg-white p-6 shadow-xl shadow-stone-200/50">
            <h2 className="text-lg font-semibold text-stone-950">Import Result</h2>
            <div className="mt-3 flex gap-6">
              <div>
                <p className="text-3xl font-bold text-emerald-600">{result.created}</p>
                <p className="text-sm text-stone-500">Created</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-blue-600">{result.updated}</p>
                <p className="text-sm text-stone-500">Updated</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-red-600">{result.errors.length}</p>
                <p className="text-sm text-stone-500">Errors</p>
              </div>
            </div>
            {result.errors.length > 0 && (
              <ul className="mt-3 space-y-1">
                {result.errors.map((e, i) => (
                  <li key={i} className="text-sm text-red-600">
                    {e.product && `${e.product}: `}{e.error}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </main>
  );
}