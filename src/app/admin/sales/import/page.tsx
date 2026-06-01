"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { parseOrderCSV } from "@/lib/csv-parsers";
import { importOrdersBatch } from "@/actions/import-orders";

type PreviewRow = {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  stop_id: string;
  items: Array<{ product_id: string; quantity: number; fulfillment: string }>;
  _rowIndex: number;
};

export default function SalesImportPage() {
  const [csvText, setCsvText] = useState("");
  const [preview, setPreview] = useState<PreviewRow[] | null>(null);
  const [parseErrors, setParseErrors] = useState<{ row: number; error: string }[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; errors: { row: number; error: string }[] } | null>(null);
  const [brandId, setBrandId] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const SAMPLE_CSV = `customer_name,customer_email,customer_phone,stop_id,product_id,quantity,fulfillment
Jane Smith,jane@example.com,555-1234,{STOP_ID},{PRODUCT_ID},2,pickup
John Doe,john@example.com,555-5678,{STOP_ID},{PRODUCT_ID},1,shipping
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

    const parseResult = await parseOrderCSV(toParse);
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
    const importResult = await importOrdersBatch(
      brandId,
      preview.map((r) => ({
        customer_name: r.customer_name,
        customer_email: r.customer_email,
        customer_phone: r.customer_phone,
        stop_id: r.stop_id,
        items: r.items,
      }))
    );
    setImporting(false);
    if (importResult.success) {
      setResult({ imported: importResult.imported, errors: importResult.errors });
    } else {
      setResult({ imported: 0, errors: [{ row: 0, error: importResult.error }] });
    }
  }

  return (
    <main className="min-h-screen bg-stone-100 px-6 py-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <Link href="/admin/orders" className="text-sm text-stone-500 hover:text-stone-800">
            ← Back to Orders
          </Link>
          <h1 className="mt-2 text-3xl font-bold text-stone-950">Import Orders</h1>
          <p className="mt-1 text-stone-600">
            Upload a CSV to import orders from another platform. Uses existing stop and product IDs.
          </p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-stone-600">Brand ID</label>
          <input
            type="text"
            value={brandId}
            onChange={(e) => setBrandId(e.target.value)}
            placeholder="64294306-5f42-463d-a5e8-2ad6c81a96de"
            className="mt-1 w-full rounded-xl border border-stone-300 px-4 py-3 text-sm outline-none focus:border-blue-500 bg-white"
          />
        </div>

        <div className="mb-4 card p-6">
          <label className="block text-sm font-medium text-stone-600 mb-2">Upload CSV</label>
          <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} className="w-full text-sm text-stone-500" />
          <p className="mt-2 text-xs text-stone-500">Paste CSV content below:</p>
          <textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            rows={6}
            className="mt-2 w-full rounded-xl border border-stone-300 px-4 py-3 text-sm font-mono outline-none focus:border-blue-500 bg-white"
          />
          <button
            onClick={() => handlePreview()}
            className="mt-3 rounded-xl border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100"
          >
            Preview
          </button>
        </div>

        {parseErrors.length > 0 && (
          <div className="mb-4 rounded-xl bg-red-50 p-4 border border-red-200">
            <p className="text-sm font-semibold text-red-600">Parse Errors</p>
            <ul className="mt-1 space-y-1">
              {parseErrors.map((e) => (
                <li key={e.row} className="text-sm text-red-600">Row {e.row}: {e.error}</li>
              ))}
            </ul>
          </div>
        )}

        {preview !== null && (
          <div className="mb-4 card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-stone-950">Preview ({preview.length} rows)</h2>
              <button
                onClick={handleImport}
                disabled={!brandId || importing}
                className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white disabled:opacity-50 hover:bg-blue-700"
              >
                {importing ? "Importing..." : `Import ${preview.length} Orders`}
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-200">
                    <th className="text-left py-2 px-3 text-stone-500 font-medium">Customer</th>
                    <th className="text-left py-2 px-3 text-stone-500 font-medium">Email</th>
                    <th className="text-left py-2 px-3 text-stone-500 font-medium">Stop ID</th>
                    <th className="text-left py-2 px-3 text-stone-500 font-medium">Items</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row) => (
                    <tr key={row._rowIndex} className="border-b border-stone-200">
                      <td className="py-2 px-3 font-medium text-stone-950">{row.customer_name}</td>
                      <td className="py-2 px-3 text-stone-600">{row.customer_email}</td>
                      <td className="py-2 px-3 font-mono text-xs text-stone-500">{row.stop_id}</td>
                      <td className="py-2 px-3 text-stone-600">
                        {row.items.map((it) => `${it.quantity}× ${it.product_id.slice(0, 8)}`).join(", ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {result !== null && (
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-stone-950">Import Result</h2>
            <div className="mt-3">
              <p className="text-3xl font-bold text-emerald-600">{result.imported}</p>
              <p className="text-sm text-stone-500">Orders imported</p>
            </div>
            {result.errors.length > 0 && (
              <ul className="mt-3 space-y-1">
                {result.errors.map((e, i) => (
                  <li key={i} className="text-sm text-red-600">Row {e.row}: {e.error}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
