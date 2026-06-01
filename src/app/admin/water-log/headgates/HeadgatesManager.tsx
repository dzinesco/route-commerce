"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  getWaterHeadgatesAdmin,
  createWaterHeadgate,
  regenerateHeadgateToken,
  updateWaterHeadgate,
} from "@/actions/water-log/admin";

type Headgate = {
  id: string;
  name: string;
  active: boolean;
  unit: string;
  created_at: string;
  deleted_at?: string | null;
  headgate_token?: string | null;
  last_used_at?: string | null;
  high_threshold?: number | null;
  low_threshold?: number | null;
};

type Props = {
  initialHeadgates: Headgate[];
  brandId: string;
};

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function HeadgatesManager({ initialHeadgates, brandId }: Props) {
  const router = useRouter();
  const [headgates, setHeadgates] = useState<Headgate[]>(initialHeadgates);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUnit, setNewUnit] = useState("CFS");
  const [saving, setSaving] = useState(false);
  const [qrModal, setQrModal] = useState<Headgate | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [printLoading, setPrintLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  // Edit modal state
  const [editHg, setEditHg] = useState<Headgate | null>(null);
  const [editName, setEditName] = useState("");
  const [editUnit, setEditUnit] = useState("CFS");
  const [editActive, setEditActive] = useState(true);
  const [editHigh, setEditHigh] = useState("");
  const [editLow, setEditLow] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 2500);
  }

  function openEdit(hg: Headgate) {
    setEditHg(hg);
    setEditName(hg.name);
    setEditUnit(hg.unit);
    setEditActive(hg.active);
    setEditHigh(hg.high_threshold != null ? String(hg.high_threshold) : "");
    setEditLow(hg.low_threshold != null ? String(hg.low_threshold) : "");
  }

  async function handleEditSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editHg) return;
    setEditSaving(true);
    const res = await updateWaterHeadgate(
      editHg.id,
      editName,
      editActive,
      editUnit,
      editHigh ? parseFloat(editHigh) : null,
      editLow ? parseFloat(editLow) : null
    );
    if (res.success) {
      const refreshed = await getWaterHeadgatesAdmin(brandId);
      setHeadgates(refreshed);
      setEditHg(null);
      showToast("Headgate updated");
    } else {
      showToast(res.error ?? "Failed", false);
    }
    setEditSaving(false);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true);
    const res = await createWaterHeadgate(brandId, newName.trim(), newUnit);
    if (res.success) {
      const refreshed = await getWaterHeadgatesAdmin(brandId);
      setHeadgates(refreshed);
      setNewName("");
      setShowAdd(false);
      showToast("Headgate added");
    } else {
      showToast(res.error ?? "Failed", false);
    }
    setSaving(false);
  }

  async function handleRegenerate(hg: Headgate) {
    if (!confirm(`Regenerate token for "${hg.name}"? Existing QR codes will stop working.`)) return;
    const res = await regenerateHeadgateToken(hg.id);
    if (res.success) {
      setHeadgates((prev) =>
        prev.map((h) => (h.id === hg.id ? { ...h, headgate_token: res.token! } : h))
      );
      showToast("Token regenerated");
    } else {
      showToast(res.error ?? "Failed", false);
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === headgates.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(headgates.map((h) => h.id)));
    }
  }

  async function printSelected() {
    if (selected.size === 0) return;
    setPrintLoading(true);
    const hgs = headgates.filter((h) => selected.has(h.id));
    try {
      const res = await fetch("/api/water-qr-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ headgates: hgs, baseUrl: BASE_URL }),
      });
      const html = await res.text();
      openPrintWindow(html);
    } finally {
      setPrintLoading(false);
    }
  }

  async function openPrintWindow(html: string) {
    const w = window.open("", "_blank", "width=700,height=700");
    if (w) {
      w.document.write(html);
      w.document.close();
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <div className="bg-zinc-900 border-b border-zinc-800 px-6 py-4">
        <div className="mx-auto max-w-4xl flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <button onClick={() => router.back()} className="text-stone-400 hover:text-stone-600 text-sm">← Back</button>
              <h1 className="text-2xl font-bold text-zinc-100">Headgates & QR Codes</h1>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">Manage headgates and generate QR codes for field access</p>
          </div>
          <button onClick={() => setShowAdd(true)} className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-700">
            + Add Headgate
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-6 space-y-6">

        {/* Bulk actions bar */}
        {headgates.length > 0 && (
          <div className="flex items-center gap-3 rounded-xl bg-zinc-900 ring-1 ring-stone-200 px-4 py-3">
            <button onClick={toggleAll} className="text-sm text-stone-600 hover:text-zinc-100">
              {selected.size === headgates.length ? "Deselect all" : "Select all"}
            </button>
            <span className="text-xs text-stone-400">|</span>
            <span className="text-xs text-stone-500">{selected.size} selected</span>
            <div className="flex-1" />
            <button
              onClick={printSelected}
              disabled={selected.size === 0 || printLoading}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40 hover:bg-blue-700"
            >
              {printLoading ? "..." : `Print ${selected.size > 0 ? `(${selected.size})` : ""} QR Codes`}
            </button>
          </div>
        )}

        {/* Add form */}
        {showAdd && (
          <div className="rounded-xl bg-zinc-900 ring-1 ring-stone-200 p-5">
            <form onSubmit={handleAdd} className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-stone-600 mb-1">Headgate Name</label>
                <input
                  autoFocus
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. North Field Gate 1"
                  className="w-full rounded-xl border border-stone-300 px-4 py-3 text-sm outline-none focus:border-stone-900"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">Unit</label>
                <select
                  value={newUnit}
                  onChange={(e) => setNewUnit(e.target.value)}
                  className="rounded-xl border border-stone-300 px-3 py-3 text-sm outline-none focus:border-stone-900"
                >
                  {["CFS", "GPM", "Inches", "AF/Day"].map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
              <button type="submit" disabled={saving} className="rounded-xl bg-green-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">
                {saving ? "..." : "Create"}
              </button>
              <button type="button" onClick={() => setShowAdd(false)} className="rounded-xl border border-stone-300 px-4 py-3 text-sm text-stone-600">Cancel</button>
            </form>
          </div>
        )}

        {/* Table */}
        {headgates.length === 0 ? (
          <div className="rounded-xl bg-zinc-900 py-16 text-center text-stone-400 ring-1 ring-stone-200">
            No headgates yet. Create one to get started.
          </div>
        ) : (
          <div className="rounded-xl bg-zinc-900 shadow-black/20 ring-1 ring-stone-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-100 bg-zinc-950 text-left">
                  <th className="px-4 py-3 w-8">
                    <input type="checkbox" className="rounded" onChange={toggleAll} checked={selected.size === headgates.length} />
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-stone-500">Name</th>
                  <th className="px-4 py-3 text-xs font-semibold text-stone-500">Token</th>
                  <th className="px-4 py-3 text-xs font-semibold text-stone-500">Unit</th>
                  <th className="px-4 py-3 text-xs font-semibold text-stone-500">Last Used</th>
                  <th className="px-4 py-3 text-xs font-semibold text-stone-500">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold text-stone-500 text-right">QR Code</th>
                </tr>
              </thead>
              <tbody>
                {headgates.map((hg) => (
                  <tr key={hg.id} className={`border-b border-stone-50 last:border-0 hover:bg-zinc-950 ${selected.has(hg.id) ? "bg-blue-900/30" : ""}`}>
                    <td className="px-4 py-3">
                      <input type="checkbox" className="rounded" checked={selected.has(hg.id)} onChange={() => toggleSelect(hg.id)} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-zinc-100">{hg.name}</span>
                        {hg.high_threshold != null && (
                          <span className="inline-flex items-center rounded-full bg-red-900/30 border border-red-200 px-1.5 py-0.5 text-xs font-semibold text-red-400">
                            High: {hg.high_threshold}
                          </span>
                        )}
                        {hg.low_threshold != null && (
                          <span className="inline-flex items-center rounded-full bg-blue-900/30 border border-blue-200 px-1.5 py-0.5 text-xs font-semibold text-blue-700">
                            Low: {hg.low_threshold}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <code className="text-xs text-stone-500">{hg.headgate_token?.slice(0, 8)}…</code>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-stone-500">{hg.unit}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-stone-500">
                        {hg.last_used_at
                          ? new Date(hg.last_used_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                          : "Never"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${hg.active ? "bg-green-900/40 text-green-400" : "bg-stone-100 text-stone-500"}`}>
                        {hg.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(hg)} className="rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs font-medium text-stone-600 hover:bg-zinc-950">
                          Edit
                        </button>
                        {/* QR preview thumbnail */}
                        <button onClick={() => setQrModal(hg)} className="hover:opacity-80" title="View / Print QR">
                          <img
                            src={`/api/water-qr?token=${hg.headgate_token}&size=80`}
                            alt={`QR for ${hg.name}`}
                            className="w-10 h-10 rounded border border-zinc-800"
                          />
                        </button>
                        <button
                          onClick={() => setQrModal(hg)}
                          className="rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs font-medium text-stone-600 hover:bg-zinc-950"
                        >
                          Print
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 rounded-xl px-4 py-3 text-sm font-semibold shadow-lg ${toast.ok ? "bg-green-900/40 text-green-800 border border-green-200" : "bg-red-900/40 text-red-800 border border-red-200"}`}>
          {toast.msg}
        </div>
      )}

      {/* Edit Modal */}
      {editHg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setEditHg(null)}>
          <div className="bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
              <p className="font-bold text-zinc-100">Edit Headgate</p>
              <button onClick={() => setEditHg(null)} className="text-stone-400 hover:text-stone-600 text-xl leading-none">✕</button>
            </div>
            <form onSubmit={handleEditSave} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 px-4 py-3 text-sm outline-none focus:border-stone-900"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1">Unit</label>
                  <select
                    value={editUnit}
                    onChange={(e) => setEditUnit(e.target.value)}
                    className="w-full rounded-xl border border-stone-300 px-3 py-3 text-sm outline-none focus:border-stone-900"
                  >
                    {["CFS", "GPM", "Inches", "AF/Day"].map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center">
                  <label className="flex items-center gap-2 text-sm text-stone-700 cursor-pointer">
                    <input type="checkbox" checked={editActive} onChange={(e) => setEditActive(e.target.checked)} className="rounded" />
                    Active
                  </label>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1">High Alert Threshold</label>
                  <input
                    type="number"
                    step="any"
                    value={editHigh}
                    onChange={(e) => setEditHigh(e.target.value)}
                    placeholder="e.g. 15.0"
                    className="w-full rounded-xl border border-stone-300 px-4 py-3 text-sm outline-none focus:border-stone-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1">Low Alert Threshold</label>
                  <input
                    type="number"
                    step="any"
                    value={editLow}
                    onChange={(e) => setEditLow(e.target.value)}
                    placeholder="e.g. 5.0"
                    className="w-full rounded-xl border border-stone-300 px-4 py-3 text-sm outline-none focus:border-stone-900"
                  />
                </div>
              </div>
              <p className="text-xs text-stone-400">Leave thresholds blank to disable alerts for this headgate.</p>
              <div className="flex gap-2">
                <button type="submit" disabled={editSaving} className="flex-1 rounded-xl bg-green-600 py-3 text-sm font-bold text-white disabled:opacity-50">
                  {editSaving ? "..." : "Save Changes"}
                </button>
                <button type="button" onClick={() => setEditHg(null)} className="rounded-xl border border-stone-300 px-4 py-3 text-sm text-stone-600">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Modal */}
      {qrModal && (
        <QRModal hg={qrModal} onClose={() => setQrModal(null)} onRegenerate={handleRegenerate} />
      )}
    </div>
  );
}

function QRModal({ hg, onClose, onRegenerate }: { hg: Headgate; onClose: () => void; onRegenerate: (hg: Headgate) => void }) {
  const [tab, setTab] = useState<"preview" | "print" | "download">("preview");
  const [loading, setLoading] = useState(false);

  const code = hg.name.replace(/\s+/g, "-").toUpperCase().slice(0, 6) + "-1";
  const qrUrl = `/api/water-qr?token=${hg.headgate_token}&size=360`;
  const waterUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/water?h=${hg.headgate_token}`;

  async function handlePrintLabel() {
    setLoading(true);
    try {
      const res = await fetch("/api/water-qr-label", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: hg.headgate_token, name: hg.name }),
      });
      const html = await res.text();
      const w = window.open("", "_blank", "width=500,height=600");
      if (w) { w.document.write(html); w.document.close(); }
    } finally {
      setLoading(false);
    }
  }

  async function handleDownload() {
    setLoading(true);
    try {
      const res = await fetch(`/api/water-qr?token=${hg.headgate_token}&size=400`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${hg.name.replace(/\s+/g, "-").toLowerCase()}-qr.png`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <p className="font-bold text-zinc-100">{hg.name}</p>
            <p className="text-xs text-slate-400 mt-0.5">QR Label Preview</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-zinc-400 text-xl leading-none">✕</button>
        </div>

        {/* ── Simplified label preview ── */}
        <div className="flex justify-center bg-zinc-900 py-6 px-4">
          {/* Mini version of the new label design */}
          <div className="w-40 border-2 border-black rounded-lg p-3 text-center bg-zinc-900 shadow-black/20">
            <div className="text-xl font-black text-black leading-tight tracking-tight">{hg.name}</div>
            <div className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-0.5 mb-3">{code}</div>
            <div className="flex justify-center mb-2">
              <img
                src={`/api/water-qr?token=${hg.headgate_token}&size=160`}
                alt="QR"
                className="w-28 h-28 rounded"
              />
            </div>
            <div className="text-[5.5px] text-gray-300 leading-tight break-all">{waterUrl}</div>
          </div>
        </div>

        {/* Tab toggle */}
        <div className="flex border-b border-slate-100">
          {(["preview", "print", "download"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 text-sm font-semibold transition-colors ${tab === t ? "text-zinc-100 border-b-2 border-slate-900" : "text-slate-400"}`}
            >
              {t === "preview" ? "Preview" : t === "print" ? "🖨️ Print" : "💾 Download"}
            </button>
          ))}
        </div>

        <div className="p-5 space-y-3">
          {tab === "preview" ? (
            <div className="space-y-2 text-sm text-zinc-400">
              <p>This label is optimized for physical signs and thermal printing:</p>
              <ul className="list-disc list-inside space-y-1 text-xs text-zinc-500">
                <li><strong>Large name</strong> (24pt bold) — scannable from distance</li>
                <li><strong>Short code</strong> (e.g. <code className="font-mono bg-zinc-950 px-1 rounded">{code}</code>) — field reference</li>
                <li><strong>High-contrast QR</strong> — error correction H for outdoor use</li>
                <li><strong>Tiny URL</strong> at bottom — reference only</li>
              </ul>
              <button onClick={() => setTab("print")} className="w-full rounded-xl bg-slate-900 py-3 text-base font-bold text-white hover:bg-slate-800 transition-colors mt-2">
                🖨️ Print This Label
              </button>
            </div>
          ) : tab === "print" ? (
            <button onClick={handlePrintLabel} disabled={loading} className="w-full rounded-xl bg-slate-900 py-3 text-base font-bold text-white disabled:opacity-50">
              {loading ? "..." : "🖨️ Print Label"}
            </button>
          ) : (
            <button onClick={handleDownload} disabled={loading} className="w-full rounded-xl bg-blue-600 py-3 text-base font-bold text-white disabled:opacity-50">
              {loading ? "..." : "💾 Download PNG"}
            </button>
          )}

          <button
            onClick={() => { onRegenerate(hg); onClose(); }}
            className="w-full rounded-xl border border-zinc-800 py-2.5 text-sm font-medium text-zinc-400 hover:bg-zinc-800"
          >
            🔄 Regenerate Token
          </button>

          <div className="rounded-lg bg-zinc-900 p-3">
            <p className="text-xs text-zinc-500 mb-1">Token</p>
            <code className="text-xs text-zinc-300 font-mono break-all">{hg.headgate_token}</code>
          </div>
        </div>
      </div>
    </div>
  );
}